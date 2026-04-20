/**
 * @fileoverview Comprehensive authentication service managing user sessions, token persistence,
 * and WebSocket-based authentication flows. Provides a centralized state management solution
 * for authentication across the application.
 *
 * @module Services.AuthService
 */

import socketService from './socketService';
import { showNotification } from '@/utils';
import { AuthResponseMessage, EVENTS } from '@root/server/src/socket/apiObjects';

/**
 * Authentication state interface defining the current user session status.
 */
export interface AuthState {
    /** Whether the user is currently authenticated */
    isAuthenticated: boolean;
    /** Current authentication token, null when not authenticated */
    token: string | null;
    /** Loading state during authentication operations */
    isLoading: boolean;
    /** Current error message, null when no errors */
    error: string | null;
}

/**
 * Callback function type for authentication state change notifications.
 */
type AuthStateListener = (state: AuthState) => void;

/**
 * Centralized authentication service handling user sessions, token management,
 * and WebSocket-based authentication flows. Provides state management with
 * automatic persistence and socket connection awareness.
 *
 * @example
 * ```typescript
 * // Login user
 * await authService.login('username', 'password');
 *
 * // Subscribe to auth changes
 * const unsubscribe = authService.subscribe((state) => {
 *   console.log('Auth state:', state.isAuthenticated);
 * });
 * ```
 */
export class AuthService {
    /** Current authentication state */
    private state: AuthState = {
        isAuthenticated: false,
        token: null,
        isLoading: false,
        error: null,
    };

    /** Registered state change listeners */
    private listeners: AuthStateListener[] = [];
    /** Current socket connection status */
    private isSocketConnected = false;
    /** Flag to prevent concurrent token verification requests */
    private verificationInProgress = false;

    /**
     * Initializes the authentication service with token loading and socket listeners.
     */
    constructor() {
        this.loadPersistedToken();
        this.setupSocketListeners();
    }

    /**
     * Sets up WebSocket event listeners for authentication-related events.
     * Handles connection, disconnection, and authentication response events.
     */
    private setupSocketListeners(): void {
        // Listen for authentication responses from server
        socketService.on(EVENTS.AUTH_RESPONSE, (message: AuthResponseMessage) => {
            if (!message.data.success) {
                this.logout();
            }
        });

        // Handle connection errors
        socketService.on(EVENTS.CONNECT_ERROR, (error: any) => {
            console.warn('Socket connection error, may indicate auth issues:', error);
        });

        // Reset authentication state on disconnect
        socketService.on(EVENTS.DISCONNECT, () => {
            this.isSocketConnected = false;
            if (this.state.isAuthenticated) {
                console.warn('Socket disconnected while authenticated - may need to re-authenticate');
                this.setState({ isAuthenticated: false });
            }
        });

        // Note: Socket connection status tracking is handled by initialize() method
        // Do NOT update this.isSocketConnected here to avoid race conditions
    }

    /**
     * Initializes the service with current socket connection status.
     * Triggers silent token verification if socket connects and token exists.
     *
     * @param isSocketConnected - Current socket connection status
     */
    public initialize(isSocketConnected: boolean): void {
        const wasConnected = this.isSocketConnected;
        this.isSocketConnected = isSocketConnected;

        // Only trigger verification if socket just connected, we have a token, but we're not yet authenticated
        if (isSocketConnected && !wasConnected && this.state.token && !this.state.isAuthenticated) {
            setTimeout(() => {
                if (this.isSocketConnected && !this.state.isAuthenticated) {
                    this.verifyToken(undefined, false).catch((error) => {
                        console.error('[AuthService] Auto-verification failed:', error);
                    });
                }
            }, 100);
        }
    }

    /**
     * Gets a copy of the current authentication state.
     *
     * @returns Current authentication state
     */
    public getState(): AuthState {
        return { ...this.state };
    }

    /**
     * Subscribes to authentication state changes.
     *
     * @param listener - Callback function to receive state updates
     * @returns Unsubscribe function to remove the listener
     */
    public subscribe(listener: AuthStateListener): () => void {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Updates authentication state and notifies all listeners.
     *
     * @param updates - Partial state updates to apply
     */
    private setState(updates: Partial<AuthState>): void {
        this.state = { ...this.state, ...updates };
        this.listeners.forEach((listener) => listener(this.state));
    }

    /**
     * Loads persisted authentication token from localStorage.
     */
    private loadPersistedToken(): void {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                this.state.token = token;
            }
        } catch (error) {
            console.warn('Failed to load persisted token:', error);
        }
    }

    /**
     * Persists authentication token to localStorage.
     *
     * @param token - Token to persist
     */
    private persistToken(token: string): void {
        try {
            localStorage.setItem('token', token);
            this.state.token = token;
        } catch (error) {
            console.warn('Failed to persist token:', error);
        }
    }

    /**
     * Clears persisted token from localStorage and state.
     */
    private clearToken(): void {
        try {
            localStorage.removeItem('token');
            this.state.token = null;
        } catch (error) {
            console.warn('Failed to clear token:', error);
        }
    }

    /**
     * Ensures socket connection is available for authentication operations.
     *
     * @throws {Error} When socket is not connected
     */
    private ensureSocketConnected(): void {
        if (!this.isSocketConnected) {
            throw new Error('Socket not connected');
        }
    }

    /**
     * Authenticates user with username and password credentials.
     *
     * @param username - User's username
     * @param password - User's password
     * @throws {Error} When authentication fails or socket is disconnected
     */
    public async login(username: string, password: string): Promise<void> {
        this.ensureSocketConnected();
        this.setState({ isLoading: true, error: null });

        try {
            const response = await socketService.login(username, password);

            if (response.success && response.token) {
                this.persistToken(response.token);
                socketService.auth(response.token);

                this.setState({
                    isAuthenticated: true,
                    token: response.token,
                    isLoading: false,
                    error: null,
                });

                showNotification({
                    title: 'Login successful',
                    message: 'You are now logged in.',
                    type: 'success',
                    autoClose: 3000,
                });
            } else {
                throw new Error('Authentication failed');
            }
        } catch (error: any) {
            const errorMessage = error.message || 'Login failed';

            this.setState({
                isAuthenticated: false,
                isLoading: false,
                error: errorMessage,
            });

            showNotification({
                title: 'Login failed',
                message: errorMessage,
                type: 'error',
                autoClose: 5000,
            });

            throw error;
        }
    }

    /**
     * Verifies authentication token validity with the server.
     * Supports both UI-driven and silent verification modes.
     *
     * @param token - Token to verify (uses stored token if not provided)
     * @param showUI - Whether to show loading states and notifications
     * @throws {Error} When verification fails or socket is disconnected
     */
    public async verifyToken(token?: string, showUI = true): Promise<void> {
        const tokenToVerify = token || this.state.token;

        if (!tokenToVerify) {
            this.setState({ isAuthenticated: false });
            return;
        }

        if (this.verificationInProgress) {
            return;
        }

        this.ensureSocketConnected();
        this.verificationInProgress = true;

        if (showUI) {
            this.setState({ isLoading: true, error: null });
        }

        try {
            const response = await socketService.verifyToken(tokenToVerify);

            if (response.success) {
                socketService.auth(tokenToVerify);

                this.setState({
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                });

                if (showUI) {
                    showNotification({
                        title: 'Token verified',
                        message: 'You are authenticated.',
                        type: 'success',
                        autoClose: 3000,
                    });
                }
            } else {
                const errorMsg = response.error?.message || 'Token verification failed';
                throw new Error(errorMsg);
            }
        } catch (error: any) {
            const errorMessage = error.message || 'Token verification failed';

            this.setState({
                isAuthenticated: false,
                isLoading: false,
                error: errorMessage,
            });

            if (showUI) {
                showNotification({
                    title: 'Verification failed',
                    message: errorMessage,
                    type: 'error',
                    autoClose: 5000,
                });
            } else {
                console.warn('[AuthService] Silent verification failed, token may be expired. Clearing token from localStorage.');
            }

            this.clearToken();
            console.error('[AuthService] Full error:', error);
        } finally {
            this.verificationInProgress = false;
        }
    }

    /**
     * Logs out the current user and clears all authentication data.
     */
    public logout(): void {
        this.clearToken();
        this.setState({
            isAuthenticated: false,
            token: null,
            isLoading: false,
            error: null,
        });

        showNotification({
            title: 'Logged out',
            message: 'You have been logged out.',
            type: 'info',
            autoClose: 3000,
        });
    }

    /**
     * Gets the current authentication token.
     *
     * @returns Current token or null if not authenticated
     */
    public getToken(): string | null {
        return this.state.token;
    }

    /**
     * Checks if the user is currently authenticated.
     *
     * @returns True if user is authenticated
     */
    public isAuthenticated(): boolean {
        return this.state.isAuthenticated;
    }

    /**
     * Performs a silent authentication status check with the server.
     *
     * @returns Promise resolving to authentication status
     */
    public async checkAuthenticationStatus(): Promise<boolean> {
        if (!this.state.token) {
            this.setState({ isAuthenticated: false });
            return false;
        }

        try {
            await this.verifyToken(undefined, false);
            return this.state.isAuthenticated;
        } catch (error) {
            console.warn('Authentication check failed:', error);
            return false;
        }
    }

    /**
     * Handles authentication response messages from the server.
     * Called by socket event listeners to process auth status updates.
     *
     * @param success - Whether the authentication was successful
     */
    public handleAuthResponse(success: boolean): void {
        if (!success) {
            this.logout();
        }
    }
}

/** Singleton authentication service instance */
export const authService = new AuthService();
export default authService;
