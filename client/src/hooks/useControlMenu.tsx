/**
 * @fileoverview Control menu hook that provides chat history synchronization and reset operations.
 * Manages bulk operations across multiple model sessions including history syncing and conversation resets.
 *
 * @module Hooks.ControlMenu
 */

import { llmService } from '@/services';
import { showNotification } from '@/utils';
import { useChatUIStore } from '@/stores/chatUIStore';
import { useEvaluationStore } from '@/stores/evaluationStore';
import { BATCH_SUFFIX_PATTERN } from '@/stores/modelSelectionStore';

/**
 * Hook that provides control menu operations for managing multiple chat sessions.
 *
 * Handles synchronization of chat histories across multiple models and bulk reset operations.
 * Integrates with llmService for session management and chatUIStore for UI state synchronization.
 *
 * @returns Object containing control menu operation methods
 *
 * @example
 * ```tsx
 * const { syncChatHistories, resetChats } = useControlMenu();
 *
 * // Sync active model's history to selected models
 * syncChatHistories(activeModelId, selectedModels, systemPrompt);
 *
 * // Reset all selected model conversations
 * resetChats(selectedModels, systemPrompt);
 * ```
 */
export const useControlMenu = () => {
    const { setSyncedChatIndex, findSyncedIndex } = useChatUIStore();
    const { clearEvaluationData } = useEvaluationStore();

    /**
     * Synchronizes chat history from an active model to multiple selected models.
     * Creates sessions if they don't exist and updates the UI sync state.
     *
     * @param activeModelId - ID of the source model to copy history from
     * @param selectedModelIDs - Array of target model IDs to sync history to
     * @param systemPrompt - System prompt to use for new sessions
     */
    const syncChatHistories = (activeModelId: string, selectedModelIDs: string[], systemPrompt: string) => {
        if (!activeModelId) return;

        // Extract original model ID for batch models (e.g., "model__batch_1" -> "model")
        const activeOriginalModelId = activeModelId.replace(BATCH_SUFFIX_PATTERN, '');

        if (!llmService.hasSession(activeModelId)) {
            llmService.createSession(activeModelId, activeOriginalModelId, systemPrompt);
        }

        const history = llmService.getSession(activeModelId, activeOriginalModelId).getMessageHistory();
        const index = history.length - 2;

        setSyncedChatIndex(index);

        selectedModelIDs.forEach((id) => {
            // Extract original model ID for batch models
            const originalModelId = id.replace(BATCH_SUFFIX_PATTERN, '');

            if (!llmService.hasSession(id)) {
                llmService.createSession(id, originalModelId, systemPrompt);
            }
            llmService.getSession(id, originalModelId).setMessageHistory(history.slice());
        });

        showNotification({ title: 'Success', message: 'Applied this chat history to all models.', type: 'success', autoClose: 2000 });

        const syncIndex = findSyncedIndex(selectedModelIDs);
        setSyncedChatIndex(syncIndex);
    };

    /**
     * Resets chat conversations for multiple models to their initial state.
     * Creates sessions if they don't exist before resetting.
     * Also clears all stored evaluation data and consensus scores.
     *
     * @param selectedModelIDs - Array of model IDs to reset
     * @param systemPrompt - System prompt to use for reset conversations
     */
    const resetChats = (selectedModelIDs: string[], systemPrompt: string) => {
        selectedModelIDs.forEach((id) => {
            // Extract original model ID for batch models (e.g., "model__batch_1" -> "model")
            const originalModelId = id.replace(BATCH_SUFFIX_PATTERN, '');

            if (!llmService.hasSession(id)) {
                llmService.createSession(id, originalModelId, systemPrompt);
            }
            llmService.getSession(id, originalModelId).resetConversation(systemPrompt);
        });

        // Clear all evaluation data and consensus scores
        clearEvaluationData();

        showNotification({ title: 'Success', message: 'Reset chat history for all models.', type: 'success', autoClose: 2000 });
    };

    return {
        /** Reset conversations for multiple models */
        resetChats,
        /** Synchronize chat history from active model to selected models */
        syncChatHistories,
    };
};
