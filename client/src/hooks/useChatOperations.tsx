/**
 * @fileoverview Chat operations hook that provides message management and chat import/export functionality.
 * Integrates with llmService to handle chat history manipulation, message deletion, resending, and data persistence.
 *
 * @module Hooks.ChatOperations
 */

import { IChatHistoryState, IChatRoleMessage, IModelInfo } from '@root/server/src/interfaces';
import { llmService, ragService } from '@/services';
import { usePromptSubmit } from './usePromptSubmit';
import { downloadFile, showNotification } from '@/utils';
import { simpleDateFormat } from '@root/server/src/utils/strings';
import { BATCH_SUFFIX_PATTERN } from '@/stores/modelSelectionStore';
import { useAppSettingsStore } from '@/stores/appSettingsStore';

/**
 * Hook that provides chat message management and import/export operations.
 *
 * Handles message history manipulation, deletion, resending, and chat persistence
 * through JSON export/import functionality. Integrates with llmService sessions
 * and usePromptSubmit for message operations.
 *
 * @param modelID - The ID of the current model session to operate on
 * @returns Object containing chat operation methods
 *
 * @example
 * ```tsx
 * const { deleteChatMessage, exportChat, importChat } = useChatOperations(modelId);
 *
 * // Delete a message at specific index
 * deleteChatMessage(2);
 *
 * // Export current chat history
 * exportChat(messages, systemPrompt, modelInfo);
 * ```
 */
export const useChatOperations = (modelID: string | null) => {
    const { handleSend } = usePromptSubmit();
    const { isRAGEnabled } = useAppSettingsStore();

    /**
     * Retrieves the current message history for the active model session.
     *
     * @returns Array of chat messages or empty array if no session exists
     */
    const getCurrentMessageHistory = (): IChatRoleMessage[] => {
        if (!modelID || !llmService.hasSession(modelID)) {
            return [];
        }
        // Extract original model ID for batch models (e.g., "model__batch_1" -> "model")
        const originalModelId = modelID.replace(BATCH_SUFFIX_PATTERN, '');
        return llmService.getSession(modelID, originalModelId).getMessageHistory();
    };

    /**
     * Deletes a chat message and all messages after it from the current session.
     *
     * @param index - Index of the message to delete (inclusive cutoff point)
     */
    const deleteChatMessage = (index: number) => {
        if (!getCurrentMessageHistory() || !modelID) return;
        // Extract original model ID for batch models (e.g., "model__batch_1" -> "model")
        const originalModelId = modelID.replace(BATCH_SUFFIX_PATTERN, '');
        const messageHistory = llmService.getSession(modelID, originalModelId).getMessageHistory();
        llmService.getSession(modelID, originalModelId).setMessageHistory(messageHistory.slice(0, index));
    };

    /**
     * Resends a message by deleting everything after it and resubmitting the prompt.
     * Re-queries RAG if enabled and sends only to the current model.
     *
     * @param index - Index of the message to resend
     */
    const resendChatMessage = async (index: number) => {
        if (!getCurrentMessageHistory() || !modelID) return;
        deleteChatMessage(index + 1);
        const prompt = getCurrentMessageHistory().pop()?.content || '';

        // Check if RAG is enabled and retrieve context
        let promptForLLM: string | undefined = undefined;
        let ragMetadata: string | undefined = undefined;
        const ragConfig = ragService.getConfig();

        if (isRAGEnabled) {
            try {
                const results = await ragService.query(prompt, ragConfig.topK);

                if (results.length > 0) {
                    // Render prompt using the configured template
                    const rendered = ragService.renderPrompt(prompt, results);
                    promptForLLM = rendered.promptForLLM;
                    ragMetadata = rendered.ragMetadata;
                }
            } catch (error) {
                console.error('RAG retrieval error:', error);
                // Continue with original prompt if RAG fails
            }
        }

        // Send only to the current model, not all selected models
        await handleSend(modelID, prompt, promptForLLM, ragMetadata);
    };

    /**
     * Resends a message with edited content by replacing it and resubmitting.
     * Re-queries RAG if enabled and sends only to the current model.
     *
     * @param index - Index of the message to edit and resend
     * @param value - New content for the message
     */
    const resendEditedMessage = async (index: number, value: string) => {
        if (!getCurrentMessageHistory() || !modelID) return;
        deleteChatMessage(index);

        // Check if RAG is enabled and retrieve context
        let promptForLLM: string | undefined = undefined;
        let ragMetadata: string | undefined = undefined;
        const ragConfig = ragService.getConfig();

        if (isRAGEnabled) {
            try {
                const results = await ragService.query(value, ragConfig.topK);

                if (results.length > 0) {
                    // Render prompt using the configured template
                    const rendered = ragService.renderPrompt(value, results);
                    promptForLLM = rendered.promptForLLM;
                    ragMetadata = rendered.ragMetadata;
                }
            } catch (error) {
                console.error('RAG retrieval error:', error);
                // Continue with original prompt if RAG fails
            }
        }

        // Send only to the current model, not all selected models
        await handleSend(modelID, value, promptForLLM, ragMetadata);
    };

    /**
     * Exports the current chat session as a JSON file download.
     *
     * @param activeChat - Current chat message history
     * @param systemPrompt - System prompt used in the session
     * @param modelInfo - Information about the model used
     */
    const exportChat = (activeChat: IChatRoleMessage[], systemPrompt: string, modelInfo: IModelInfo) => {
        const chatHistoryState = {
            messages: activeChat,
            systemPrompt,
            modelInfo,
        };
        downloadFile(JSON.stringify(chatHistoryState, null, 2), `chat-ai-${simpleDateFormat()}.json`, 'application/json');
    };

    /**
     * Imports a chat history from a JSON file into the specified model session.
     * Creates a new session if one doesn't exist and preserves the initial system message.
     *
     * @param modelId - Target model ID to import the chat into
     * @param chatHistoryState - Chat history data containing messages and metadata
     * @param systemPrompt - System prompt to use for the session
     */
    const importChat = (modelId: string, chatHistoryState: IChatHistoryState, systemPrompt: string) => {
        // Validate that the chat history contains messages
        if (!chatHistoryState.messages) {
            showNotification({
                title: 'Import failed',
                message: 'Messages not found.',
                type: 'error',
                autoClose: 4000,
            });
            return;
        }

        try {
            // Extract original model ID for batch models (e.g., "model__batch_1" -> "model")
            const originalModelId = modelId.replace(BATCH_SUFFIX_PATTERN, '');

            // Create a new session if one doesn't exist for this model
            if (!llmService.hasSession(modelId)) {
                llmService.createSession(modelId, originalModelId, systemPrompt);
            }

            // Get the session and update its message history
            const session = llmService.getSession(modelId, originalModelId);
            session.setMessageHistory([session.getMessageHistory()[0], ...chatHistoryState.messages]);

            // Show success notification
            showNotification({
                title: 'Import success',
                message: 'Chat history imported.',
                type: 'success',
                autoClose: 4000,
            });
        } catch (error) {
            console.error('Error importing chat:', error);
            showNotification({
                title: 'Import failed',
                message: 'An unexpected error occurred.',
                type: 'error',
                autoClose: 4000,
            });
        }
    };

    return {
        /** Delete a message and all subsequent messages */
        deleteChatMessage,
        /** Resend an existing message */
        resendChatMessage,
        /** Edit and resend a message with new content */
        resendEditedMessage,
        /** Export chat history as JSON file */
        exportChat,
        /** Import chat history from JSON data */
        importChat,
    };
};
