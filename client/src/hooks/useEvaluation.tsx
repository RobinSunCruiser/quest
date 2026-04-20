/**
 * @fileoverview Evaluation hook that provides model response comparison functionality.
 * Handles socket-based communication with the server to evaluate and compare multiple model responses.
 *
 * @module Hooks.Evaluation
 */

import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { socketService } from '@/services';
import { IMessageEvaluation, IModelMessage } from '@root/server/src/interfaces/IMessageEvaluation';
import { EVENTS, LLMEvalMessage } from '@root/server/src/socket/apiObjects';

/**
 * Hook for handling model evaluation functionality.
 *
 * Sends evaluation requests to the server via socket and handles responses,
 * including loading states, errors, and timeout handling. Automatically
 * re-evaluates when model data changes.
 *
 * @param models - Array of model messages to be evaluated and compared
 * @param timeout - Request timeout in milliseconds (default: 5000ms)
 * @returns Object containing evaluation data, loading state, and error state
 *
 * @example
 * ```tsx
 * const { data, loading, error } = useEvaluation(modelResponses, 10000);
 *
 * if (loading) return <Spinner />;
 * if (error) return <ErrorMessage error={error} />;
 * if (data) return <EvaluationResults evaluation={data} />;
 * ```
 */
export const useEvaluation = (models: IModelMessage[], timeout = 20000) => {
    /** Evaluation data received from the server */
    const [data, setData] = useState<IMessageEvaluation | undefined>();

    /** Loading state of the evaluation request */
    const [loading, setLoading] = useState(false);

    /** Error state for failed requests */
    const [error, setError] = useState<null | Error>(null);

    /** Current request ID for matching responses */
    const requestIDRef = useRef<string | null>(null);

    /** Reference to current models for change detection */
    const modelsRef = useRef<IModelMessage[]>(models);

    /** Timeout reference for cleanup */
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Re-trigger evaluation when models change
    useEffect(() => {
        if (modelsRef.current !== models) {
            modelsRef.current = models;
            requestEvaluation();
        }
    }, [models]);

    // Cleanup event listeners and timeouts on unmount
    useEffect(() => {
        return () => {
            socketService.off(EVENTS.LLM_EVAL_RESPONSE);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    /**
     * Sends an evaluation request to the server via socket connection.
     * Sets up response listener and timeout handling for the request.
     */
    const requestEvaluation = async () => {
        const requestID = uuidv4();
        requestIDRef.current = requestID;

        setLoading(true);
        setError(null);

        // Set up response handler
        socketService.off(EVENTS.LLM_EVAL_RESPONSE);
        socketService.on(EVENTS.LLM_EVAL_RESPONSE, handleSocketResponse);

        // Send evaluation request
        const socketMessage: LLMEvalMessage = {
            event: EVENTS.LLM_EVAL_REQUEST,
            version: '0.1.0',
            data: {
                chatModels: modelsRef.current,
                options: { removeThinkingBlock: true },
            },
            payload: { requestID },
        };

        socketService.send(socketMessage);

        // Set timeout for request
        timeoutRef.current = setTimeout(() => {
            if (requestIDRef.current === requestID) {
                setLoading(false);
                setError(new Error('Request timed out. Please try again later.'));
            }
        }, timeout);
    };

    /**
     * Handles socket response from the server.
     * Updates evaluation data and loading state, ignores outdated responses.
     *
     * @param response - Socket response containing evaluation results or error
     */
    const handleSocketResponse = (response: any) => {
        // Ignore outdated responses
        if (response.payload.requestID !== requestIDRef.current) {
            return;
        }

        setLoading(false);

        // Clear timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Handle errors - do NOT set data on error responses
        if (response.error) {
            setError(response.error);
            return;
        }

        // Update evaluation data only on successful responses
        setData(response.data.evaluation as IMessageEvaluation);
    };

    return { data, loading, error };
};
