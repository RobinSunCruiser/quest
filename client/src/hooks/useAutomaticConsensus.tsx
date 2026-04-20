/**
 * @fileoverview Hook for automatically detecting when consensus scores should be displayed
 * and calculating them when multiple models respond to the same user message.
 * @module Hooks.AutomaticConsensus
 */

import { useMemo } from 'react';
import { useModelSelectionStore, BATCH_SUFFIX_PATTERN } from '@/stores/modelSelectionStore';
import { useChatUIStore } from '@/stores/chatUIStore';
import { llmService } from '@/services';
import { LoadingState } from '@/stores/chatUIStore';

/**
 * Hook that automatically detects when to show consensus scores and calculates them.
 * Monitors chat state and triggers consensus calculations when:
 * 1. Multiple models have responses at the same message index
 * 2. The user messages (prompts) are identical across models
 * 3. Custom messages are being used for comparison
 */
export const useAutomaticConsensus = () => {
    const { selectedModelIDs } = useModelSelectionStore();
    const { chatHistories, customMessages, loadingStates } = useChatUIStore();

    /**
     * Gets the user message (prompt) that led to a specific assistant response.
     * @param modelId - The model ID
     * @param messageIndex - Index of the assistant message
     * @returns The user message that prompted this response, or null if not found
     */
    const getUserMessageForResponse = (modelId: string, messageIndex: number): string | null => {
        if (!llmService.hasSession(modelId)) return null;

        // Extract original model ID for batch models (e.g., "model__batch_1" -> "model")
        const originalModelId = modelId.replace(BATCH_SUFFIX_PATTERN, '');
        const session = llmService.getSession(modelId, originalModelId);
        const messages = session.getMessageHistory();
        
        // Assistant messages are at odd indices (0=system, 1=user, 2=assistant, 3=user, 4=assistant, ...)
        // So for assistant message at index N, the user message is at index N-1
        if (messageIndex > 0 && messageIndex < messages.length) {
            const userMessage = messages[messageIndex - 1];
            if (userMessage && userMessage.role === 'user') {
                return userMessage.content;
            }
        }
        return null;
    };

    /**
     * Checks if all models have the same user message for a given response index.
     * @param messageIndex - Index of the assistant response
     * @returns Object with validation result and the common user message
     */
    const validateUserMessagesMatch = (messageIndex: number) => {
        const userMessages = new Set<string>();
        const validModels: string[] = [];

        for (const modelId of selectedModelIDs) {
            if (loadingStates.get(modelId) === LoadingState.LOADING) continue;
            
            const chatHistory = chatHistories.get(modelId);
            if (!chatHistory || chatHistory.length <= messageIndex) continue;

            const userMessage = getUserMessageForResponse(modelId, messageIndex);
            if (userMessage) {
                userMessages.add(userMessage);
                validModels.push(modelId);
            }
        }

        // All user messages must be identical
        const messagesMatch = userMessages.size === 1;
        const commonUserMessage = messagesMatch ? Array.from(userMessages)[0] : null;

        return {
            messagesMatch,
            commonUserMessage,
            validModels,
            modelCount: validModels.length
        };
    };


    /**
     * Returns information about active custom messages for UI display.
     */
    const getActiveCustomMessages = useMemo(() => {
        const active = customMessages.filter(msg => msg.used);
        return active;
    }, [customMessages]);

    return {
        getActiveCustomMessages,
        validateUserMessagesMatch
    };
};