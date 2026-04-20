/**
 * @fileoverview Prompt submission hook that handles message sending to multiple language models.
 * Manages concurrent requests, loading states, error handling, and chat synchronization across selected models.
 *
 * @module Hooks.PromptSubmit
 */

import { LoadingState } from '@/stores/chatUIStore';
import { useChatUIStore } from '@/stores/chatUIStore';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import { showNotification } from '@/utils';
import { llmService, ragService } from '@/services';
import { useModelSelectionStore, BATCH_SUFFIX_PATTERN } from '@/stores/modelSelectionStore';

/**
 * Hook that provides prompt submission functionality for multiple language models.
 *
 * Handles concurrent message sending to all selected models, manages loading states,
 * provides error handling with notifications, and maintains chat synchronization.
 * Integrates with llmService sessions and multiple UI stores.
 *
 * @returns Object containing prompt submission methods
 *
 * @example
 * ```tsx
 * const { handlePromptSubmit, handleAbort, handleSend } = usePromptSubmit();
 *
 * // Send prompt to all selected models
 * await handlePromptSubmit("Explain quantum computing");
 *
 * // Send to specific model
 * await handleSend("gpt-4", "Hello world");
 *
 * // Abort request
 * await handleAbort("gpt-4");
 * ```
 */
export const usePromptSubmit = () => {
    const { setLoadingState: setModelLoading, setLoadingStateForAll: setAllModelsLoading, findSyncedIndex, setSyncedChatIndex } = useChatUIStore();
    const { systemPrompt, timeout, modelOptions, isRAGEnabled } = useAppSettingsStore();
    const { selectedModelIDs } = useModelSelectionStore();

    /**
     * Submits a prompt to all selected models concurrently.
     * Sets loading state for all models and synchronizes chat index after completion.
     * If RAG is enabled, retrieves relevant context from documents and prepends it to the prompt.
     *
     * @param prompt - The message to send to all selected models
     */
    const handlePromptSubmit = async (prompt: string) => {
        setAllModelsLoading(selectedModelIDs, LoadingState.LOADING);

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

        const promises = selectedModelIDs.map(async (modelId) => {
            await handleSend(modelId, prompt, promptForLLM, ragMetadata);
        });

        await Promise.all(promises);

        const newSyncIndex = findSyncedIndex(selectedModelIDs);
        setSyncedChatIndex(newSyncIndex);
    };

    /**
     * Sends a prompt to a specific model with error handling and state management.
     * Handles MultipleRequestError separately from general errors with appropriate notifications.
     *
     * @param modelId - ID of the target model (could be batch ID like "model-1")
     * @param prompt - The original user message (stored in history)
     * @param promptForLLM - Optional augmented prompt to send to LLM (if undefined, uses prompt)
     * @param ragMetadata - Optional RAG metadata (document sources) for UI display
     */
    const handleSend = async (modelId: string, prompt: string, promptForLLM?: string, ragMetadata?: string) => {
        try {
            // Extract the original model ID from batch IDs (e.g., "model__batch_1" -> "model")
            // Batch IDs have format: originalId__batch_number
            const originalModelId = modelId.replace(BATCH_SUFFIX_PATTERN, '');

            const session = llmService.getSession(modelId, originalModelId, systemPrompt);
            setModelLoading(modelId, LoadingState.LOADING);
            // Use promptForLLM if provided (with RAG), otherwise use original prompt
            await session.sendRequest(promptForLLM || prompt, timeout, modelOptions, promptForLLM, ragMetadata, prompt);
            setModelLoading(modelId, LoadingState.SUCCESS);

            const newSyncIndex = findSyncedIndex(selectedModelIDs);
            setSyncedChatIndex(newSyncIndex);
        } catch (err: any) {
            if (err?.name === 'MultipleRequestError') {
                showNotification({
                    title: 'Request Error',
                    message: String(err),
                    type: 'warning',
                    autoClose: 5000,
                });
                return;
            }
            showNotification({
                title: 'Error',
                message: String(err),
                type: 'error',
                autoClose: 5000,
            });
            setModelLoading(modelId, LoadingState.ERROR);
            console.error(`Error for model ${modelId}:`, err);
        }
    };

    /**
     * Aborts an ongoing request for a specific model.
     *
     * @param modelID - ID of the model to abort request for (could be batch ID like "model__batch_1"), or null to skip
     */
    const handleAbort = async (modelID: string | null) => {
        if (!modelID) return;

        // Extract the original model ID from batch IDs (e.g., "model__batch_1" -> "model")
        const originalModelId = modelID.replace(BATCH_SUFFIX_PATTERN, '');

        await llmService.getSession(modelID, originalModelId).abortRequest();
    };

    return {
        /** Submit prompt to all selected models */
        handlePromptSubmit,
        /** Abort request for specific model */
        handleAbort,
        /** Send prompt to specific model */
        handleSend,
    };
};
