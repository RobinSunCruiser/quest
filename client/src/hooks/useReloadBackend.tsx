/**
 * @fileoverview Custom React hook for managing backend adapter reload operations via WebSocket communication.
 * Provides loading state management, timeout handling, and user notifications for adapter reload requests.
 *
 * @module Hooks.ReloadBackend
 */

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { socketService } from '@/services';
import { showNotification } from '@/utils';
import { EVENTS, AdapterReloadMessage, AdapterReloadResponseMessage } from '@root/server/src/socket/apiObjects';

/**
 * Custom hook for managing backend adapter reloading operations with timeout handling.
 * Prevents concurrent requests and provides user feedback through notifications.
 *
 * @param timeoutDuration - Timeout duration in milliseconds for the reload request
 * @returns Hook interface with loading state and reload function
 *
 * @example
 * ```tsx
 * const { loading, reloadAdapters } = useReloadBackend(5000);
 *
 * const handleReload = async () => {
 *   try {
 *     await reloadAdapters();
 *   } catch (error) {
 *     console.error('Reload failed:', error);
 *   }
 * };
 * ```
 */
export const useReloadBackend = (timeoutDuration: number) => {
    /** Loading state to prevent concurrent reload requests and update UI indicators */
    const [loading, setLoading] = useState(false);

    /**
     * Initiates an adapter reload request to the backend via WebSocket.
     * Handles request/response matching, timeout management, and user notifications.
     *
     * @returns Promise that resolves on successful reload or rejects with error details
     * @throws {Error} When request times out or server returns an error response
     */
    const reloadAdapters = async (): Promise<void> => {
        // Prevent multiple simultaneous reload requests
        if (loading) {
            return;
        }

        setLoading(true);
        const requestID = uuidv4();
        let timeout: NodeJS.Timeout;

        return new Promise<void>((resolve, reject) => {
            /**
             * Handles the WebSocket response for the reload request.
             * Matches responses by request ID and manages cleanup operations.
             */
            const handleResponse = (response: AdapterReloadResponseMessage) => {
                // Ignore responses that don't match our request ID
                if (!response.payload || response.payload.requestID !== requestID) {
                    return;
                }

                // Clean up timeout and event listener
                clearTimeout(timeout);
                socketService.off(EVENTS.RELOAD_ADAPTERS_RESPONSE, handleResponse);

                // Handle error response
                if (response.error) {
                    const error = response.error as Error;
                    showNotification({
                        title: error.name || 'Error',
                        message: error.message || 'An unknown error occurred',
                        type: 'warning',
                    });
                    setLoading(false);
                    reject(response.error);
                    return;
                }

                // Handle successful response
                setLoading(false);
                showNotification({
                    title: 'Reload',
                    message: 'Adapters have been reloaded.',
                    type: 'success',
                    autoClose: 2000,
                });
                resolve();
            };

            // Set timeout for unresponsive server scenarios
            timeout = setTimeout(() => {
                setLoading(false);
                showNotification({
                    title: 'Reload',
                    message: `Request timed out after ${timeoutDuration} ms.`,
                    type: 'error',
                    autoClose: 2000,
                });
                socketService.off(EVENTS.RELOAD_ADAPTERS_RESPONSE, handleResponse);
                reject(new Error('Request timed out'));
            }, timeoutDuration);

            // Send reload request via WebSocket
            const socketMessage: AdapterReloadMessage = {
                event: EVENTS.RELOAD_ADAPTERS_REQUEST,
                version: '0.1.0',
                payload: { requestID },
            };
            socketService.send(socketMessage);

            // Listen for response
            socketService.on(EVENTS.RELOAD_ADAPTERS_RESPONSE, handleResponse);
        });
    };

    return {
        /** Indicates whether a reload operation is currently in progress */
        loading,
        /** Triggers the backend adapter reload operation */
        reloadAdapters,
    };
};
