/**
 * @module Services.SocketService
 *
 * This module provides WebSocket communication functionality for the application using Socket.IO.
 * It handles connection management, authentication, event listening, and message sending
 * between the client and server.
 *
 * The module exports:
 * - SocketService class: Manages WebSocket connections and communication
 * - EventEmitter class: Provides a simple event system for internal event handling
 * - A singleton instance of SocketService for application-wide use
 */

import { io, Socket } from 'socket.io-client';
import { AuthMessage, EVENTS, SocketMessage } from '@root/server/src/socket/apiObjects';

/**
 * Service class for managing WebSocket connections and communication with the server.
 * Handles connection setup, authentication, event handling, and message sending.
 */
export class SocketService {
    /** The socket.io Socket instance used for the WebSocket connection */
    private socket: Socket | null = null;

    /** EventEmitter instance to manage custom event listeners */
    private eventEmitter = new EventEmitter();

    /**
     * Initializes the SocketService, establishing a connection to the server.
     * Automatically attempts to authenticate using any token stored in localStorage.
     */
    constructor() {
        this.connect();
    }

    /**
     * Establishes a WebSocket connection to the server and sets up event handlers.
     * Uses any existing authentication token from localStorage.
     *
     * In development mode, connects to the default host.
     * In production, connects to the current host.
     *
     * @returns {void}
     *
     * @example
     * ```typescript
     * // Create a new connection
     * socketService.connect();
     * ```
     */
    public connect() {
        try {
            // Retrieve any stored authentication token
            const token = localStorage.getItem('token') || '""';

            // Determine connection URL based on environment mode
            const mode = import.meta.env.MODE;
            const url = mode === 'development' ? '' : document.location.protocol + '//' + document.location.host;

            // Create the socket connection with options
            this.socket = io(url, {
                auth: { token },
                reconnection: true,
                reconnectionDelay: 2000,
                path: document.location.pathname + 'socket.io/',
            });

            // Set up event handlers for the socket
            this.setupEventHandlers();
        } catch (error) {
            console.log('Error connecting to socket:', error);
        }
    }

    /**
     * Sets up internal event handlers for the socket connection.
     * Maps socket.io events to the internal EventEmitter system.
     *
     * Handles basic connection events:
     * - connect: Emitted when connection is established
     * - connect_error: Emitted when connection fails
     * - disconnect: Emitted when connection is closed
     *
     * Also sets up a catch-all handler for other socket events.
     *
     * @private
     */
    private setupEventHandlers() {
        if (!this.socket) return;

        // Handle successful connection
        this.socket.on('connect', () => {
            this.eventEmitter.emit(EVENTS.CONNECT);
        });

        // Handle connection errors
        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            this.eventEmitter.emit(EVENTS.CONNECT_ERROR, error);
        });

        // Handle disconnection
        this.socket.on('disconnect', () => {
            this.eventEmitter.emit(EVENTS.DISCONNECT);
        });

        // Catch all other events and forward them to the event emitter
        this.socket.onAny((event, ...args) => {
            this.eventEmitter.emit(event, ...args);
        });
    }

    /**
     * Sends an authentication message to the server with the provided token.
     * This method should be called after login or token refresh.
     *
     * @param token - The authentication token to send to the server
     *
     * @example
     * ```typescript
     * // After successful login, authenticate the socket connection
     * function handleLogin(loginResponse) {
     *   const { token } = loginResponse;
     *   socketService.auth(token);
     * }
     * ```
     */
    public auth(token: string) {
        const authMessage: AuthMessage = {
            event: EVENTS.AUTH,
            version: '0.1.0',
            data: {
                token: token,
            },
        };

        if (this.socket) {
            this.socket.emit(authMessage.event, authMessage);
        }
    }

    /**
     * Sends an authentication message to the server with username and password.
     * This method handles credential-based authentication and returns a Promise
     * that resolves when the authentication response is received.
     *
     * @param username - The username for authentication
     * @param password - The password for authentication
     * @returns Promise that resolves with the authentication response
     *
     * @example
     * ```typescript
     * // Login with username and password
     * try {
     *   const response = await socketService.login('username', 'password');
     *   if (response.success) {
     *     console.log('Login successful, token:', response.token);
     *   } else {
     *     console.log('Login failed');
     *   }
     * } catch (error) {
     *   console.error('Login error:', error);
     * }
     * ```
     */
    public login(username: string, password: string): Promise<{ success: boolean; token?: string; error?: any }> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not connected'));
                return;
            }

            const authMessage: AuthMessage = {
                event: EVENTS.AUTH,
                version: '0.1.0',
                data: {
                    username: username,
                    password: password,
                },
            };

            // Set up one-time listener for the authentication response
            const handleAuthResponse = (response: any) => {
                if (response.event === EVENTS.AUTH_RESPONSE) {
                    if (response.data.success) {
                        resolve({
                            success: true,
                            token: response.data.token,
                        });
                    } else {
                        resolve({
                            success: false,
                            error: response.error || { message: 'Authentication failed' },
                        });
                    }
                }
            };

            // Listen for the authentication response
            this.socket.once(EVENTS.AUTH_RESPONSE, handleAuthResponse);

            // Send the authentication message
            this.socket.emit(authMessage.event, authMessage);

            // Set a timeout to reject the promise if no response is received
            setTimeout(() => {
                this.socket?.off(EVENTS.AUTH_RESPONSE, handleAuthResponse);
                reject(new Error('Authentication timeout'));
            }, 10000); // 10 second timeout
        });
    }

    /**
     * Verifies a JWT token with the server via Socket.IO.
     * This method handles token verification and returns a Promise
     * that resolves when the authentication response is received.
     *
     * @param token - The JWT token to verify
     * @returns Promise that resolves with the verification response
     *
     * @example
     * ```typescript
     * // Verify a token
     * try {
     *   const response = await socketService.verifyToken('jwt_token_here');
     *   if (response.success) {
     *     console.log('Token is valid');
     *   } else {
     *     console.log('Token is invalid');
     *   }
     * } catch (error) {
     *   console.error('Verification error:', error);
     * }
     * ```
     */
    public verifyToken(token: string): Promise<{ success: boolean; error?: any }> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not connected'));
                return;
            }

            const authMessage: AuthMessage = {
                event: EVENTS.AUTH,
                version: '0.1.0',
                data: {
                    token: token,
                },
            };

            // Set up one-time listener for the authentication response
            const handleAuthResponse = (response: any) => {
                if (response.event === EVENTS.AUTH_RESPONSE) {
                    if (response.data.success) {
                        resolve({
                            success: true,
                        });
                    } else {
                        resolve({
                            success: false,
                            error: response.error || { message: 'Token verification failed' },
                        });
                    }
                }
            };

            // Listen for the authentication response
            this.socket.once(EVENTS.AUTH_RESPONSE, handleAuthResponse);

            // Send the authentication message
            this.socket.emit(authMessage.event, authMessage);

            // Set a timeout to reject the promise if no response is received
            setTimeout(() => {
                this.socket?.off(EVENTS.AUTH_RESPONSE, handleAuthResponse);
                reject(new Error('Token verification timeout'));
            }, 10000); // 10 second timeout
        });
    }

    /**
     * Disconnects the WebSocket connection and clears the socket instance.
     * This should be called when the user logs out or the application is shutting down.
     *
     * @example
     * ```typescript
     * // When user logs out
     * function handleLogout() {
     *   socketService.disconnect();
     *   // Clear user data, redirect to login, etc.
     * }
     * ```
     */
    public disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    /**
     * Returns the current connection state of the socket.
     * This method checks if the socket exists and is currently connected.
     *
     * @returns boolean - true if socket is connected, false otherwise
     *
     * @example
     * ```typescript
     * // Check connection before sending a message
     * if (socketService.isConnected()) {
     *   socketService.send(message);
     * } else {
     *   console.warn('Socket not connected, attempting to reconnect...');
     * }
     * ```
     */
    public isConnected(): boolean {
        return this.socket?.connected || false;
    }

    /**
     * Registers an event listener for a specific socket event.
     * The callback will be executed whenever the specified event is received.
     *
     * @param event - The event name to listen for from the EVENTS enum
     * @param callback - The function to be executed when the event is emitted
     * @returns Unsubscribe function - call this to remove the event listener
     *
     * @example
     * ```typescript
     * // In a React component with useEffect
     * useEffect(() => {
     *   const unsubscribe = socketService.on(EVENTS.LLM_LIST_UPDATE, (modelData) => {
     *     updateModelsList(modelData.data.models);
     *   });
     *
     *   // Cleanup function - React will call this when component unmounts
     *   return unsubscribe;
     * }, []);
     * ```
     */
    public on(event: EVENTS, callback: (...args: any[]) => void): () => void {
        this.eventEmitter.on(event, callback);

        return () => {
            this.off(event, callback);
        };
    }

    /**
     * Removes an event listener for a specific socket event.
     * If no callback is provided, removes all listeners for the event.
     *
     * @param event - The event name to stop listening for
     * @param callback - The specific function to remove, or undefined to remove all listeners
     *
     * @example
     * ```typescript
     * // Define a handler
     * const handleModelUpdate = (modelData) => {
     *   updateModelsList(modelData.data.models);
     * };
     *
     * // Add the handler
     * socketService.on(EVENTS.LLM_LIST_UPDATE, handleModelUpdate);
     *
     * // Later, remove the specific handler
     * socketService.off(EVENTS.LLM_LIST_UPDATE, handleModelUpdate);
     *
     * // Or remove all handlers for the event
     * socketService.off(EVENTS.LLM_LIST_UPDATE);
     * ```
     */
    public off(event: EVENTS, callback?: (...args: any[]) => void) {
        if (!callback) {
            this.eventEmitter.off(event);
            return;
        }
        this.eventEmitter.off(event, callback);
    }

    /**
     * Sends a message over the WebSocket connection.
     * Messages must follow the `SocketMessage` interface structure.
     *
     * @param message - The message to send, which must follow the `SocketMessage` structure
     *
     * @example
     * ```typescript
     * // Send a request to list available models
     * socketService.send({
     *   event: EVENTS.LLM_LIST_REQUEST,
     *   version: "0.1.0",
     *   payload: { requestID: uuidv4() }
     * });
     *
     * // Send a chat message
     * socketService.send({
     *   event: EVENTS.LLM_CHAT_REQUEST,
     *   version: "0.1.0",
     *   data: {
     *     modelID: "gpt-4",
     *     messages: messageHistory
     *   },
     *   payload: { requestID: uuidv4(), conversationID: "main-chat" }
     * });
     * ```
     */
    public send(message: SocketMessage) {
        if (this.socket) {
            this.socket.emit(message.event, message);
        } else {
            console.error('ERROR: Can not send message. Socket is null');
        }
    }

    /**
     * Sends a message and waits for a response with a timeout.
     *
     * @param event - The event to emit
     * @param message - The message to send
     * @param timeout - Timeout in milliseconds (default: 5000ms)
     * @returns Promise that resolves with the response or rejects on timeout
     *
     * @example
     * ```typescript
     * try {
     *   const response = await socketService.sendRequest(
     *     EVENTS.REPO_UPLOAD,
     *     message,
     *     10000
     *   );
     *   console.log('Response received:', response);
     * } catch (error) {
     *   if (error.isTimeout) {
     *     console.error('Request timed out');
     *   } else {
     *     console.error('Other error:', error);
     *   }
     * }
     * ```
     */
    public async sendRequest<T = any>(message: SocketMessage, timeout: number = 5000): Promise<T> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket is not connected'));
                return;
            }

            // Create a timeout error
            const timeoutError = new Error('Request timed out');
            (timeoutError as any).isTimeout = true;

            // Set up the timeout
            const timer = setTimeout(() => {
                this.off(message.event, responseHandler);
                reject(timeoutError);
            }, timeout);

            // Handler for the response
            const responseHandler = (response: T) => {
                clearTimeout(timer);
                this.off(message.event, responseHandler);
                resolve(response);
            };

            // Listen for the response
            this.on(message.event, responseHandler);

            // Send the message
            this.socket.emit(message.event, message);
        });
    }
}

/**
 * A simple event emitter implementation for internal event handling.
 * Provides methods to register event listeners, remove them, and emit events.
 */
export class EventEmitter {
    /** Records storing event listeners organized by event name */
    private events: Record<string, Function[]>;

    /**
     * Creates a new EventEmitter instance with an empty events object.
     */
    constructor() {
        this.events = {};
    }

    /**
     * Registers a listener function for a specified event.
     * Multiple listeners can be registered for the same event.
     *
     * @param event - The event name to listen for
     * @param listener - The function to execute when the event is emitted
     *
     * @example
     * ```typescript
     * const emitter = new EventEmitter();
     *
     * // Register a listener for 'message' events
     * emitter.on('message', (data) => {
     *   console.log('Message received:', data);
     * });
     * ```
     */
    on(event: string | number, listener: Function) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    /**
     * Triggers all listener functions registered for the specified event.
     * Passes all provided arguments to each listener.
     *
     * @param event - The event name to emit
     * @param args - Arguments to pass to each listener function
     *
     * @example
     * ```typescript
     * const emitter = new EventEmitter();
     *
     * // Register a listener
     * emitter.on('userUpdate', (userId, data) => {
     *   updateUserProfile(userId, data);
     * });
     *
     * // Emit the event with arguments
     * emitter.emit('userUpdate', 123, { name: 'New Name' });
     * ```
     */
    emit(event: string | number, ...args: any[]) {
        if (this.events[event]) {
            this.events[event].forEach((listener) => listener(...args));
        }
    }

    /**
     * Removes a listener function from an event, or all listeners if no specific function is provided.
     *
     * @param event - The event name to remove listeners from
     * @param listener - The specific listener function to remove, or undefined to remove all listeners
     *
     * @example
     * ```typescript
     * const emitter = new EventEmitter();
     *
     * // Define a handler function
     * const handleMessage = (msg) => console.log(msg);
     *
     * // Register the handler
     * emitter.on('message', handleMessage);
     *
     * // Remove the specific handler
     * emitter.off('message', handleMessage);
     *
     * // Or remove all handlers for the event
     * emitter.off('message');
     * ```
     */
    off(event: string | number, listener?: Function) {
        if (!this.events[event]) return;

        if (!listener) {
            delete this.events[event];
            return;
        }

        this.events[event] = this.events[event].filter((l) => l !== listener);
    }
}

/**
 * Singleton instance of the SocketService class for use throughout the application.
 * Use this instance to connect to the server, listen for events, and send messages.
 *
 * @example
 * ```typescript
 * import { socketService } from '@/services';
 *
 * // Listen for connection events
 * socketService.on(EVENTS.CONNECT, () => {
 *   console.log('Connected to server!');
 * });
 *
 * // Send a message
 * socketService.send({
 *   event: EVENTS.CUSTOM_EVENT,
 *   version: '0.1.0',
 *   data: { message: 'Hello server!' }
 * });
 * ```
 */
const socketService = new SocketService();
export default socketService;
