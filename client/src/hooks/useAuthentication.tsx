/**
 * @fileoverview Authentication hook that provides authentication state and methods to React components.
 * Integrates with AuthService to manage user authentication across the application.
 *
 * @module Hooks.Authentication
 */

import { useEffect, useState } from 'react';
import { authService, type AuthState } from '@/services';

/**
 * Props for the useAuthentication hook
 */
interface UseAuthProps {
    /** Whether the socket connection is active - triggers auth service initialization */
    isSocketConnected: boolean;
}

/**
 * Hook that provides authentication state and methods for React components.
 *
 * Automatically subscribes to authentication state changes and initializes the auth service
 * when socket connection status changes. Provides both individual auth properties and methods
 * for convenient component integration.
 *
 * @param props - Configuration object
 * @param props.isSocketConnected - Socket connection status that triggers auth initialization
 * @returns Authentication state and methods
 *
 * @example
 * ```tsx
 * const { isAuthenticated, login, logout, isLoading } = useAuthentication({
 *   isSocketConnected: true
 * });
 *
 * if (isLoading) return <Spinner />;
 * if (!isAuthenticated) return <LoginForm onLogin={login} />;
 * ```
 */
export const useAuthentication = ({ isSocketConnected }: UseAuthProps) => {
    const [authState, setAuthState] = useState<AuthState>(authService.getState());

    // Subscribe to auth service state changes
    useEffect(() => {
        const unsubscribe = authService.subscribe(setAuthState);
        return unsubscribe;
    }, []);

    // Initialize auth service when socket connection changes
    useEffect(() => {
        authService.initialize(isSocketConnected);
    }, [isSocketConnected]);

    return {
        // State
        /** Whether the user is currently authenticated */
        isAuthenticated: authState.isAuthenticated,
        /** Current authentication token */
        token: authState.token,
        /** Whether an authentication operation is in progress */
        isLoading: authState.isLoading,
        /** Current authentication error, if any */
        error: authState.error,

        // Methods
        /** Authenticate user with credentials */
        login: authService.login.bind(authService),
        /** Sign out current user */
        logout: authService.logout.bind(authService),
        /** Verify current token validity */
        verifyToken: authService.verifyToken.bind(authService),

        /** Complete auth state object for advanced usage */
        authState,
    };
};
