/**
 * @fileoverview Custom React hook for monitoring WebSocket connection status in real-time.
 * Provides connection state management and automatic error handling for socket events.
 *
 * @module Hooks.SocketCheck
 */

import { useEffect, useState } from 'react';
import { llmService, socketService } from '@/services';
import { EVENTS } from '@root/server/src/socket/apiObjects';
import { showNotification } from '@/utils';

/**
 * Custom hook for monitoring WebSocket connection status with automatic event handling.
 * Sets up listeners for connection events and manages state for real-time status updates.
 *
 * @returns Object containing current connection status and error information
 * @returns returns.isConnected - Boolean indicating if the socket is currently connected
 * @returns returns.error - Error message string when connection issues occur, null when connected
 *
 * @example
 * ```tsx
 * const { isConnected, error } = useSocketCheck();
 *
 * if (!isConnected) {
 *   return <div>Connecting to server...</div>;
 * }
 * ```
 */
export function useSocketCheck() {
    /** Connection status - true when WebSocket is connected */
    // Initialize with actual socket connection state to prevent race conditions
    const [isConnected, setIsConnected] = useState<boolean>(socketService.isConnected());

    /** Current error message, null when connection is healthy */
    const [error, setError] = useState<string | null>(null);

    /**
     * Sets up WebSocket event listeners for connection monitoring.
     * Handles connect, disconnect, and error events with appropriate state updates.
     */
    useEffect(() => {
        /**
         * Handles successful WebSocket connection.
         * Clears errors, aborts pending requests, and shows success notification.
         */
        const handleConnect = () => {
            setIsConnected(true);
            setError(null);
            llmService.abortAllRequests();
            showNotification({
                title: 'Connected to server',
                message: 'Successfully connected to the socket.',
                type: 'success',
                autoClose: 5000,
            });
        };

        /**
         * Handles WebSocket disconnection events.
         * Updates state and logs disconnection for debugging.
         */
        const handleDisconnect = () => {
            setIsConnected(false);
            setError(String(new Error('Disconnected from socket')));
            console.error('Disconnected from socket');
        };

        /**
         * Handles WebSocket connection errors.
         * Aborts pending requests and stores error details for display.
         *
         * @param error - Error message from the socket service
         */
        const handleError = (error: string | null) => {
            setIsConnected(false);
            setError(error);
            llmService.abortAllRequests();
            console.error(error);
        };

        // Register event listeners
        socketService.on(EVENTS.CONNECT, handleConnect);
        socketService.on(EVENTS.DISCONNECT, handleDisconnect);
        socketService.on(EVENTS.CONNECT_ERROR, handleError);

        // Cleanup listeners on unmount
        return () => {
            socketService.off(EVENTS.CONNECT);
            socketService.off(EVENTS.DISCONNECT);
            socketService.off(EVENTS.CONNECT_ERROR);
        };
    }, []);

    return { isConnected, error };
}
