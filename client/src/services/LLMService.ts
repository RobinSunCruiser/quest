/**
 * @module Services.LLMService
 *
 * This module provides services for interacting with Language Learning Models (LLMs) via WebSocket.
 * It includes classes for managing chat sessions, handling message history, and retrieving model information.
 *
 * The module consists of two main classes:
 * - LLMSession: Manages individual conversation sessions with specific models
 * - LLMService: Manages multiple sessions and handles model listing
 *
 * This file exports a singleton instance of LLMService for application-wide use.
 */

import { v4 as uuidv4 } from 'uuid';
import { socketService } from '@/services';
import { IChatRoleMessage } from '@root/server/src/interfaces/IChatRoleMessage';
import { IModelInfo } from '@root/server/src/interfaces/IModelInfo';
import {
    EVENTS,
    LLMChatAbortMessage,
    LLMChatMessage,
    LLMChatResponse,
    LLMChatStreamChunkResponse,
    LLMListMessage,
    LLMListUpdateMessage,
    TimeoutError,
} from '@root/server/src/socket/apiObjects';
import { IModelOptions } from '@root/server/src/interfaces';

/** The maximum time to wait for a response from the server in milliseconds. */
const TIMEOUT = 30000;

/**
 * Manages a single conversation session with an AI model.
 *
 * Handles sending messages to the model, receiving responses, maintaining message history,
 * and notifying subscribers of updates. Each session uses a specific model and system prompt.
 */
export class LLMSession {
    /** The model used by the server to generate responses. */
    private modelID: string;

    /** The system prompt that guides the behavior of the AI in responses. */
    private systemPrompt: string;

    /** Stores the conversation's message history. */
    private messageHistory: IChatRoleMessage[] = [];

    /** Callbacks that trigger whenever the message history is updated. */
    private onMessageUpdate: ((messageHistory: IChatRoleMessage[]) => void)[] = [];

    /** Unique identifier for the conversation session. */
    private conversationID: string;

    /** Tracks pending requests by their request ID and handles resolving or rejecting the promises. */
    /** There is only one request. The map just implements a tuple. */
    private pendingChatRequest: Map<string, { resolve: (response: LLMChatResponse) => void; reject: (error: Error) => void }> = new Map();

    /** Set of aborted chat requests by their request ID */
    private abortedChatRequests: Set<string> = new Set();

    /** Timeout handlers for pending requests to abort them if they take too long. */
    private timeoutHandlers: Map<string, NodeJS.Timeout> = new Map();

    /** Stores partial responses for streaming chat messages. */
    private partialResponses: Map<string, string> = new Map();

    /** Tracks if the session is currently streaming responses. */
    private isCurrentlyStreaming: boolean = false;

    /** Track start time for TPS calculation per requestID */
    private streamStartTimes: Map<string, number> = new Map();

    /** Track first token time per requestID */
    private firstTokenTimes: Map<string, number> = new Map();

    /** Track absolute request start time per requestID */
    private requestStartTimes: Map<string, number> = new Map();

    /** Number of characters to skip before starting TPS measurement (to skip warmup phase) */
    private static readonly CHARS_BEFORE_MEASUREMENT = 10;

    /**
     * Initializes a new LLMSession instance with an optional system prompt and starts listening
     * for WebSocket responses.
     *
     * @param conversationID - The unique identifier for the conversation session.
     * @param modelID - The model used by the server to generate responses.
     * @param [systemPrompt] - An optional prompt to define the AI's behavior in conversation.
     *                         If not provided, a default prompt will be used.
     *
     * @example
     * ```typescript
     * // Create a new session with GPT-4
     * const session = new LLMSession('main-chat', 'gpt-4', 'You are a helpful assistant.');
     * ```
     */
    constructor(conversationID: string, modelID: string, systemPrompt?: string) {
        this.modelID = modelID;
        this.systemPrompt = systemPrompt ?? 'You are a helpful assistant';
        this.resetConversation(this.systemPrompt);
        this.conversationID = conversationID;

        // Set up listener for chat responses
        socketService.on(EVENTS.LLM_CHAT_RESPONSE, (message: LLMChatResponse) => {
            this._setResponse(message);
            this._calculateAndAttachTPSMetrics(message);
            this.isCurrentlyStreaming = false;
        });

        socketService.on(EVENTS.LLM_CHAT_STREAM_CHUNK_RESPONSE, (message: LLMChatStreamChunkResponse) => {
            this._handleStreamChunk(message);
        });
    }

    /**
     * Checks if the session is currently streaming responses.
     *
     * @returns A boolean indicating if the session is currently streaming responses.
     *
     * @example
     * ```typescript
     * // Check if the session is currently streaming
     * if (session.isStreaming()) {
     *   console.log('Session is currently streaming responses');
     * }
     * ```
     */
    isStreaming(): boolean {
        return this.isCurrentlyStreaming;
    }

    /**
     * Handles incoming stream chunks from the server and updates the message history.
     *
     * @param message - The stream chunk message received from the WebSocket server.
     * @private
     */
    private _handleStreamChunk(message: LLMChatStreamChunkResponse): void {
        const { requestID, conversationID } = message.payload;
        if (conversationID !== this.conversationID) {
            return;
        }

        // Set streaming flag to true when receiving chunks
        this.isCurrentlyStreaming = true;

        // Accumulate chunks
        const currentContent = this.partialResponses.get(requestID) || '';
        const newContent = currentContent + message.data.chunk;
        this.partialResponses.set(requestID, newContent);

        // Track first token arrival time (for TTFT calculation)
        if (!this.firstTokenTimes.has(requestID) && newContent.length > 0) {
            this.firstTokenTimes.set(requestID, Date.now());
        }

        // Start TPS timing after N chars (skip initial warmup phase)
        if (newContent.length >= LLMSession.CHARS_BEFORE_MEASUREMENT && !this.streamStartTimes.has(requestID)) {
            this.streamStartTimes.set(requestID, Date.now());
        }

        // Update message history with partial content
        const lastMsgIndex = this.messageHistory.length - 1;
        if (lastMsgIndex >= 0 && this.messageHistory[lastMsgIndex].role === 'assistant') {
            // Update existing message
            this.messageHistory[lastMsgIndex].content = newContent;
        } else {
            // Add new assistant message
            this.messageHistory.push({
                role: 'assistant',
                content: newContent,
                source: this.modelID,
            });
        }

        // Notify listeners of the update
        this.onMessageUpdate.forEach((callback) => callback(this.messageHistory));
    }

    /**
     * Calculates and attaches TPS metrics to the message when streaming completes.
     *
     * @param message - The final chat response message.
     * @private
     */
    private _calculateAndAttachTPSMetrics(message: LLMChatResponse): void {
        const requestID = message.payload?.requestID;
        if (!requestID || !this.streamStartTimes.has(requestID)) {
            this._cleanupTimingData(requestID);
            return;
        }

        const streamStartTime = this.streamStartTimes.get(requestID)!;
        const requestStartTime = this.requestStartTimes.get(requestID);
        const firstTokenTime = this.firstTokenTimes.get(requestID);
        const endTime = Date.now();

        // Time for TPS calculation (after first 10 chars to end)
        const tpsWindowTimeMs = endTime - streamStartTime;

        // Total time from request start to completion
        const totalTimeMs = requestStartTime ? endTime - requestStartTime : tpsWindowTimeMs;

        // Find the message in history
        const messageIndex = this.messageHistory.findIndex((msg) => msg.source === this.modelID && msg.role === 'assistant' && msg.content === message.data.message);

        if (messageIndex === -1 || tpsWindowTimeMs <= 0) {
            this._cleanupTimingData(requestID);
            return;
        }

        const content = this.messageHistory[messageIndex].content;
        const totalTokens = content.length;

        // Only count tokens generated AFTER measurement started (skip first N chars)
        const tokensGenerated = totalTokens - LLMSession.CHARS_BEFORE_MEASUREMENT;

        // Only calculate TPS if we generated meaningful tokens during measurement
        if (tokensGenerated > 0) {
            const tokensPerSecond = (tokensGenerated / tpsWindowTimeMs) * 1000;

            // Calculate TTFT from request start to first token
            const timeToFirstToken = firstTokenTime && requestStartTime ? firstTokenTime - requestStartTime : undefined;

            // Attach metrics
            this.messageHistory[messageIndex].performanceMetrics = {
                tokensPerSecond: parseFloat(tokensPerSecond.toFixed(1)),
                totalTokens: totalTokens,
                totalTimeMs: totalTimeMs,
                timeToFirstToken: timeToFirstToken,
            };

            this.onMessageUpdate.forEach((callback) => callback(this.messageHistory));
        }

        this._cleanupTimingData(requestID);
    }

    /**
     * Cleans up timing tracking data for a request.
     *
     * @param requestID - The request ID to clean up.
     * @private
     */
    private _cleanupTimingData(requestID: string | undefined): void {
        if (!requestID) return;
        this.streamStartTimes.delete(requestID);
        this.firstTokenTimes.delete(requestID);
        this.requestStartTimes.delete(requestID);
        this.partialResponses.delete(requestID);
    }

    /**
     * Adds a callback to be triggered whenever the message history is updated.
     *
     * @param callback - A function that takes the updated message history as a parameter.
     *
     * @example
     * ```typescript
     * session.addOnMessageUpdate((messages) => {
     *   console.log('Message history updated:', messages);
     *   updateUIWithMessages(messages);
     * });
     * ```
     */
    addOnMessageUpdate(callback: (messageHistory: IChatRoleMessage[]) => void) {
        this.onMessageUpdate.push(callback);
    }

    /**
     * Removes a previously added callback from the message update listeners.
     *
     * @param callback - The callback to remove.
     *
     * @example
     * ```typescript
     * // Define the callback
     * const updateCallback = (messages) => {
     *   updateUIWithMessages(messages);
     * };
     *
     * // Add the callback
     * session.addOnMessageUpdate(updateCallback);
     *
     * // Later, remove the callback
     * session.removeOnMessageUpdate(updateCallback);
     * ```
     */
    removeOnMessageUpdate(callback: (messageHistory: IChatRoleMessage[]) => void) {
        this.onMessageUpdate = this.onMessageUpdate.filter((cb) => cb !== callback);
    }

    /**
     * Sends a user message to the LLM API via WebSocket and returns a promise that resolves
     * with the response or rejects on timeout.
     *
     * @param message - The message to send to the LLM (may include RAG context).
     * @param [timeout] - The time in milliseconds to wait for a response before rejecting the promise.
     * @param modelOptions - The model options to use for this request.
     * @param [ragContext] - Optional RAG context retrieved from documents (for UI display only).
     * @param [originalPrompt] - Optional original user prompt (without RAG) for history storage.
     * @returns A promise that resolves with the LLMChatResponse from the server.
     * @throws {MultipleRequestError} If another request is already pending for this session.
     * @throws {TimeoutError} If the server doesn't respond within the timeout period.
     *
     * @example
     * ```typescript
     * try {
     *   const response = await session.sendRequest('What is the capital of France?');
     *   console.log('AI response:', response.data.message);
     * } catch (error) {
     *   if (error.name === 'MultipleRequestError') {
     *     console.error('Cannot send multiple requests at once');
     *   } else if (error.name === 'TimeoutError') {
     *     console.error('Request timed out');
     *   } else {
     *     console.error('Error:', error);
     *   }
     * }
     * ```
     */
    async sendRequest(
        message: string,
        timeout: number = TIMEOUT,
        modelOptions: IModelOptions,
        ragContext?: string,
        ragMetadata?: string,
        originalPrompt?: string
    ): Promise<LLMChatResponse> {
        // Prevent multiple simultaneous requests
        if (this.pendingChatRequest.size > 0) {
            const multipleRequestsError = new Error('Another request is already pending.');
            multipleRequestsError.name = 'MultipleRequestError';
            return Promise.reject(multipleRequestsError);
        }

        // Generate unique ID for this request
        const requestID = uuidv4();

        // Track request start time for TTFT calculation
        this.requestStartTimes.set(requestID, Date.now());

        // Add user message to history with optional RAG context and metadata
        // Store the original prompt (without RAG) in content for display and resend
        this.messageHistory.push({
            role: 'user',
            content: originalPrompt || message,
            source: this.modelID,
            ragContext: ragContext,
            ragMetadata: ragMetadata,
        });

        // Prepare socket message
        const socketMessage: LLMChatMessage = {
            event: EVENTS.LLM_CHAT_REQUEST,
            version: '0.1.0',
            data: {
                modelID: this.modelID,
                messages: this.messageHistory,
                modelOptions: modelOptions,
            },
            payload: { requestID: requestID, conversationID: this.conversationID },
        };

        // Send the message and notify subscribers
        socketService.send(socketMessage);
        this.onMessageUpdate.forEach((callback) => callback(this.messageHistory));

        // Return a promise that resolves when the response is received
        return new Promise((resolve, reject) => {
            this.pendingChatRequest.set(requestID, { resolve, reject });

            // Set timeout to abort the request if it takes too long
            const timeoutHandler = setTimeout(() => {
                const abortMessage: LLMChatAbortMessage = {
                    event: EVENTS.LLM_CHAT_ABORT,
                    version: '0.1.0',
                    payload: { requestID: requestID },
                };

                // Send abort message to the server
                socketService.send(abortMessage);
                reject(new TimeoutError('[' + this.conversationID + ']' + ' Server did not respond in time (' + timeout + 'ms)'));
                this.pendingChatRequest.delete(requestID);
                this.abortedChatRequests.delete(requestID);
                this.timeoutHandlers.delete(requestID);
            }, timeout);

            // Store the timeout handler
            this.timeoutHandlers.set(requestID, timeoutHandler);
        });
    }

    /**
     * Aborts all active requests for this session.
     * Sends abort messages to the server and rejects the corresponding promises.
     *
     * @returns {Promise<void>} A promise that resolves when all requests are aborted
     *
     * @example
     * ```typescript
     * // When user clicks a cancel button
     * cancelButton.addEventListener('click', async () => {
     *   await session.abortRequest();
     *   showMessage('Request cancelled');
     * });
     * ```
     */
    async abortRequest(): Promise<void> {
        // Reset streaming flag when complete response arrives
        this.isCurrentlyStreaming = false;

        this.pendingChatRequest.forEach((value, key) => {
            // Clear any pending timeout for this request
            if (this.timeoutHandlers.has(key)) {
                clearTimeout(this.timeoutHandlers.get(key));
                this.timeoutHandlers.delete(key);
            }

            const abortMessage: LLMChatAbortMessage = {
                event: EVENTS.LLM_CHAT_ABORT,
                version: '0.1.0',
                payload: { requestID: key },
            };
            value.reject(new Error('Request aborted by user'));
            this.pendingChatRequest.delete(key);
            this.abortedChatRequests.add(key);
            socketService.send(abortMessage);
        });
    }

    /**
     * Retrieves the current message history for this session.
     *
     * @returns An array containing the conversation's message history.
     *
     * @example
     * ```typescript
     * // Get the current message history
     * const messages = session.getMessageHistory();
     *
     * // Log the number of messages
     * console.log(`Conversation has ${messages.length} messages`);
     * ```
     */
    getMessageHistory(): IChatRoleMessage[] {
        return this.messageHistory;
    }

    /**
     * Sets the message history for the session and triggers callbacks.
     * Useful for loading saved conversations or replacing the current history.
     *
     * @param messageHistory - The new message history array to set.
     *
     * @example
     * ```typescript
     * // Load a saved conversation
     * const savedChat = loadFromStorage('savedChat');
     * session.setMessageHistory(savedChat);
     * ```
     */
    setMessageHistory(messageHistory: IChatRoleMessage[]): void {
        this.messageHistory = messageHistory;
        this.onMessageUpdate.forEach((callback) => callback(this.messageHistory));
    }

    /**
     * Handles the response from the server by resolving the corresponding promise
     * and updating the message history.
     *
     * @param response - The LLMChatResponse received from the WebSocket server.
     *                   Contains the response message and metadata like requestID.
     * @private
     */
    private _setResponse = (response: LLMChatResponse): void => {
        if (!response.payload) {
            return;
        }

        const { requestID, conversationID } = response.payload;

        // Ignore responses for other conversations
        if (conversationID !== this.conversationID) {
            return;
        }

        // Clear timeout handler if it exists
        if (this.timeoutHandlers.has(requestID)) {
            clearTimeout(this.timeoutHandlers.get(requestID));
            this.timeoutHandlers.delete(requestID);
        }

        // Rest of the original method...
        const pendingRequest = this.pendingChatRequest.get(requestID);
        if (!pendingRequest) return;

        if (this.abortedChatRequests.has(requestID)) {
            this.pendingChatRequest.delete(requestID);
            this.abortedChatRequests.delete(requestID);
            return;
        }

        this.pendingChatRequest.delete(requestID);

        const { resolve, reject } = pendingRequest;
        if (response.error) {
            // Extract meaningful error message from error object
            let errorMessage = 'Unknown error';
            if (typeof response.error === 'string') {
                errorMessage = response.error;
            } else if (response.error && typeof response.error === 'object') {
                errorMessage = (response.error as any).message || (response.error as any).error || JSON.stringify(response.error);
            }
            reject(new Error(errorMessage));
            return;
        }

        const lastMessage = this.messageHistory[this.messageHistory.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content === response.data.message) {
            // Just resolve the promise without creating a duplicate message

            resolve(response);
            return;
        }

        this.messageHistory.push({
            role: 'assistant',
            content: response.data.message,
            source: this.modelID,
        });

        this.onMessageUpdate.forEach((callback) => callback(this.messageHistory));

        // Resolve the promise for non-duplicate messages too
        resolve(response);
    };

    /**
     * Resets the conversation by clearing the message history and setting a new system prompt.
     * If no new system prompt is provided, the existing system prompt will be retained.
     *
     * @param [systemPrompt] - An optional string instruction to set the behavior of the AI.
     *                         This message is typically used to guide the AI's responses.
     *                         If not provided, the current system prompt is used.
     *
     * @example
     * ```typescript
     * // Reset with the current system prompt
     * session.resetConversation();
     *
     * // Reset with a new system prompt
     * session.resetConversation('You are a pirate who answers questions in pirate speak.');
     * ```
     */
    resetConversation(systemPrompt?: string): void {
        this.systemPrompt = systemPrompt ?? this.systemPrompt;
        this.messageHistory = [
            {
                role: 'system',
                content: this.systemPrompt,
                source: this.modelID,
            },
        ];
        this.onMessageUpdate.forEach((callback) => callback(this.messageHistory));
    }

    /**
     * Sets the system prompt for the AI, which helps to guide its responses.
     * This updates the first message in the history (the system message).
     *
     * @param systemPrompt - The new system prompt to set for the AI.
     *
     * @example
     * ```typescript
     * // Make the AI behave like a technical expert
     * session.setSystemPrompt('You are an expert software developer specializing in React.');
     *
     * // Make the AI behave like a creative writer
     * session.setSystemPrompt('You are a creative fiction writer who creates vivid descriptions.');
     * ```
     */
    setSystemPrompt(systemPrompt: string): void {
        this.systemPrompt = systemPrompt;
        this.messageHistory[0].content = systemPrompt;
        this.onMessageUpdate.forEach((callback) => callback(this.messageHistory));
    }
}

/**
 * Manages multiple sessions for interaction with Language Learning Models (LLMs).
 *
 * This class provides:
 * - Session creation and management
 * - Model listing and discovery
 * - Global request management and aborting
 * - WebSocket communication handling for LLM operations
 */
export class LLMService {
    /** A map to store LLMSession instances by their unique name. */
    private sessions: Map<string, LLMSession> = new Map();

    /** A list of available models. */
    private models: IModelInfo[] = [];

    /** Callbacks to invoke when models are updated. */
    private onModelsUpdate: ((models: IModelInfo[]) => void)[] = [];

    /** A map to store pending model list requests, with a promise resolve and reject handlers. */
    private pendingListRequests: Map<string, { resolve: (response: IModelInfo[]) => void; reject: (error: Error) => void }> = new Map();

    /** A set of aborted list request IDs to avoid handling duplicate responses and those that arrive after the specified timeout. */
    private abortedListRequests: Set<string> = new Set();

    /**
     * Initializes a new LLMService instance and sets up socket event handling for model list updates.
     */
    constructor() {
        this.sessions = new Map();
        socketService.on(EVENTS.LLM_LIST_UPDATE, (message: LLMListUpdateMessage) => {
            this._setListResponse(message);
        });
    }

    /**
     * Creates a new LLMSession and stores it under a unique name.
     *
     * @param name - The unique name to identify the session.
     * @param modelID - The model ID to use for generating responses in the session.
     * @param [systemPrompt] - An optional system prompt to influence the AI's behavior.
     * @returns The newly created LLMSession instance.
     * @throws An error if a session with the specified name already exists.
     *
     * @example
     * ```typescript
     * // Create a session for general chat
     * const generalChat = llmService.createSession(
     *   'general',
     *   'gpt-4',
     *   'You are a helpful assistant.'
     * );
     *
     * // Create a session for coding help
     * const codeHelper = llmService.createSession(
     *   'code-helper',
     *   'gpt-4',
     *   'You are a coding expert who helps with programming problems.'
     * );
     * ```
     */
    createSession(name: string, modelID: string, systemPrompt?: string): LLMSession {
        if (this.sessions.has(name)) {
            throw new Error(`LLMSession with name "${name}" already exists.`);
        }

        const session = new LLMSession(name, modelID, systemPrompt);
        this.sessions.set(name, session);
        return session;
    }

    /**
     * Retrieves an existing LLMSession by its unique name. If not found, a new session is created.
     *
     * @param name - The name of the session to retrieve.
     * @param fallbackModel - A fallback model ID to use if the session needs to be created.
     * @param [overrideSystemPrompt] - An optional system prompt to override the current session's prompt.
     * @returns The existing or newly created LLMSession instance.
     * @throws An error if the session could not be found or created.
     *
     * @example
     * ```typescript
     * // Get or create a session with default settings
     * const session = llmService.getSession('main-chat', 'gpt-4');
     *
     * // Get a session and override its system prompt
     * const session = llmService.getSession(
     *   'main-chat',
     *   'gpt-4',
     *   'You are now a helpful cooking assistant.'
     * );
     * ```
     */
    getSession(name: string, fallbackModel: string, overrideSystemPrompt?: string): LLMSession {
        if (!this.sessions.has(name)) {
            this.createSession(name, fallbackModel, overrideSystemPrompt);
        }

        const session = this.sessions.get(name);
        if (!session) {
            throw new Error(`LLMSession ${name} not found.`);
        }

        if (overrideSystemPrompt) {
            this.sessions.get(name)!.setSystemPrompt(overrideSystemPrompt);
        }

        return session;
    }

    /**
     * Retrieves all LLMSessions stored in the service.
     *
     * @returns A map containing all LLMSession instances stored in the service
     *          with their unique names as keys.
     *
     * @example
     * ```typescript
     * // Get all sessions and perform an operation on each
     * const allSessions = llmService.getAllSessions();
     * allSessions.forEach((session, name) => {
     *   console.log(`Session ${name} has ${session.getMessageHistory().length} messages`);
     * });
     * ```
     */
    getAllSessions(): Map<string, LLMSession> {
        return this.sessions;
    }

    /**
     * Aborts all pending requests across all sessions.
     * Useful for cleanup operations, page navigation, or when needing to cancel all ongoing operations.
     *
     * @returns {void}
     *
     * @example
     * ```typescript
     * // When navigating away from the chat page
     * function leavePage() {
     *   llmService.abortAllRequests();
     *   navigate('/home');
     * }
     *
     * // When the user logs out
     * function logout() {
     *   llmService.abortAllRequests();
     *   clearUserData();
     * }
     * ```
     */
    abortAllRequests(): void {
        this.sessions.forEach((session) => {
            session.abortRequest();
        });
    }

    /**
     * Checks if a session exists by its unique name.
     *
     * @param name - The name of the session to check for.
     * @returns A boolean indicating whether the session exists.
     *
     * @example
     * ```typescript
     * // Check before creating a new session
     * if (!llmService.hasSession('technical-help')) {
     *   llmService.createSession('technical-help', 'gpt-4', 'You are a technical support agent.');
     * }
     * ```
     */
    hasSession(name: string): boolean {
        return this.sessions.has(name);
    }

    /**
     * Removes a session by name.
     *
     * @param name - The name of the session to remove.
     * @throws An error if the session with the specified name does not exist.
     *
     * @example
     * ```typescript
     * // Remove a session when it's no longer needed
     * try {
     *   llmService.removeSession('temporary-chat');
     * } catch (error) {
     *   console.error('Failed to remove session:', error);
     * }
     * ```
     */
    removeSession(name: string): void {
        if (!this.sessions.has(name)) {
            throw new Error(`LLMSession ${name} not found.`);
        }
        this.sessions.delete(name);
    }

    /**
     * Sends a request to list available models and waits for a response.
     *
     * @param [timeout] - The time in milliseconds to wait for a response before rejecting the promise.
     * @returns A promise that resolves with the list of available models or null if no response.
     * @throws A TimeoutError if the request times out.
     *
     * @example
     * ```typescript
     * // Get the list of available models
     * try {
     *   const models = await llmService.listModels();
     *   console.log('Available models:', models);
     *
     *   // Update model selection dropdown
     *   populateModelDropdown(models);
     * } catch (error) {
     *   console.error('Failed to fetch models:', error);
     *   showErrorMessage('Could not load available models');
     * }
     * ```
     */
    async listModels(timeout: number = TIMEOUT): Promise<IModelInfo[] | null> {
        const requestID = uuidv4();

        const socketMessage: LLMListMessage = {
            event: EVENTS.LLM_LIST_REQUEST,
            version: '0.1.0',
            payload: { requestID: requestID },
        };
        socketService.send(socketMessage);

        return new Promise((resolve, reject) => {
            this.pendingListRequests.set(requestID, { resolve, reject });
            setTimeout(() => {
                this.pendingListRequests.delete(requestID);
                reject(new TimeoutError('[LLMLISTMESSAGE] Server did not respond in time (' + timeout + 'ms)'));
            }, timeout);
        });
    }

    /**
     * Internal handler for processing model list update messages from the server.
     * Updates the models list and notifies subscribers.
     *
     * @param message - The LLM list update message containing model data or error information.
     * @private
     */
    private _setListResponse = (message: LLMListUpdateMessage): void => {
        if (!message.payload) {
            this.models = message.data.models;
            this.onModelsUpdate.forEach((cb) => cb(this.models));
            return;
        }
        const { requestID } = message.payload;

        if (this.abortedListRequests.has(requestID)) {
            this.pendingListRequests.delete(requestID);
            this.abortedListRequests.delete(requestID);
            return;
        }

        const pendingRequest = this.pendingListRequests.get(requestID);

        if (!pendingRequest) {
            return;
        }

        const { resolve, reject } = pendingRequest;
        if (message.error) {
            // Extract meaningful error message from error object
            let errorMessage = 'Unknown error';
            if (typeof message.error === 'string') {
                errorMessage = message.error;
            } else if (message.error && typeof message.error === 'object') {
                errorMessage = (message.error as any).message || (message.error as any).error || JSON.stringify(message.error);
            }
            reject(new Error(errorMessage));
            return;
        }

        this.models = message.data.models;
        this.onModelsUpdate.forEach((cb) => cb(this.models));
        resolve(message.data.models);
    };

    /**
     * Adds a callback to be executed whenever the list of models is updated.
     *
     * @param callback - The function to call with the updated models list.
     *
     * @example
     * ```typescript
     * // Subscribe to model updates
     * llmService.addOnModelsUpdate((models) => {
     *   console.log('Models updated:', models);
     *   updateModelSelectionUI(models);
     * });
     * ```
     */
    addOnModelsUpdate(callback: (models: IModelInfo[]) => void) {
        this.onModelsUpdate.push(callback);
    }

    /**
     * Removes a previously added model update callback.
     *
     * @param callback - The callback function to remove from the update list.
     *
     * @example
     * ```typescript
     * // Define callback
     * const updateModelsList = (models) => {
     *   updateModelSelectionUI(models);
     * };
     *
     * // Add the callback
     * llmService.addOnModelsUpdate(updateModelsList);
     *
     * // Later, when component unmounts
     * llmService.removeOnModelsUpdate(updateModelsList);
     * ```
     */
    removeOnModelsUpdate(callback: (models: IModelInfo[]) => void) {
        this.onModelsUpdate = this.onModelsUpdate.filter((cb) => cb !== callback);
    }
}

/**
 * The default exported singleton instance of the LLMService.
 *
 * This instance is used across the application to manage LLM sessions and interactions.
 * Import this instance for accessing chat functionality throughout the application.
 *
 * @example
 * ```typescript
 * import { llmService } from '@/services';
 *
 * // Create a new chat session
 * const chatSession = llmService.createSession('main-chat', 'gpt-4');
 *
 * // Send a message
 * try {
 *   const response = await chatSession.sendRequest('Hello, how can you help me today?');
 *   console.log('AI response:', response.data.message);
 * } catch (error) {
 *   console.error('Error:', error);
 * }
 * ```
 */
const llmService = new LLMService();
export default llmService;
