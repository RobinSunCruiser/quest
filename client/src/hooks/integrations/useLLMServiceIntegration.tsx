/**
 * @fileoverview LLM service integration hook that synchronizes model sessions with UI state.
 * Manages automatic session creation and message history synchronization between llmService and chatUIStore.
 *
 * @module Hooks.Integrations.LLMServiceIntegration
 */

import { useEffect } from 'react';
import { llmService } from '@/services';
import { useChatUIStore } from '@/stores/chatUIStore';
import { IChatRoleMessage } from '@root/server/src/interfaces';
import { BATCH_SUFFIX_PATTERN } from '@/stores/modelSelectionStore';

/**
 * Hook that integrates LLM service with the chat UI store.
 *
 * Automatically creates sessions for new models and synchronizes message history
 * updates from llmService to the UI store. Handles listener management and cleanup
 * to prevent memory leaks.
 *
 * @example
 * ```tsx
 * // Used at the app level to maintain service-UI synchronization
 * function App() {
 *   useLLMServiceIntegration();
 *   return <ChatInterface />;
 * }
 * ```
 */
export const useLLMServiceIntegration = () => {
    const { setChatHistory } = useChatUIStore();

    useEffect(() => {
        // Map to track message update listeners for cleanup
        const messageUpdateListeners = new Map<string, (messages: IChatRoleMessage[]) => void>();

        /**
         * Handles model updates by creating sessions and setting up message listeners.
         * Creates new sessions for models that don't exist and establishes bidirectional
         * synchronization between service and UI store.
         *
         * @param models - Array of model objects with id properties
         */
        const handleModelsUpdate = (models: any[]) => {
            models.forEach((model) => {
                // Extract original model ID for batch models (e.g., "model__batch_1" -> "model")
                const originalModelId = model.id.replace(BATCH_SUFFIX_PATTERN, '');

                // Create session if it doesn't exist
                if (!llmService.hasSession(model.id)) {
                    llmService.createSession(model.id, originalModelId);
                }

                const session = llmService.getSession(model.id, originalModelId);

                // Remove existing listener if any
                const existingListener = messageUpdateListeners.get(model.id);
                if (existingListener) {
                    session.removeOnMessageUpdate(existingListener);
                }

                // Create new listener for this model
                const messageUpdateListener = (messageHistory: IChatRoleMessage[]) => {
                    setChatHistory(model.id, messageHistory);
                };

                // Add listener and track it
                session.addOnMessageUpdate(messageUpdateListener);
                messageUpdateListeners.set(model.id, messageUpdateListener);

                // Initialize chat history immediately with current session messages
                const currentMessages = session.getMessageHistory();
                if (currentMessages.length > 0) {
                    setChatHistory(model.id, currentMessages);
                }
            });
        };

        // Subscribe to model updates
        llmService.addOnModelsUpdate(handleModelsUpdate);

        // IMPORTANT: Initialize chat histories for models that already exist
        // This handles the case where models are already available when the hook mounts
        const existingSessions = llmService.getAllSessions();
        if (existingSessions.size > 0) {
            const existingModels = Array.from(existingSessions.keys()).map(id => ({ id }));
            handleModelsUpdate(existingModels);
        }

        // Cleanup function
        return () => {
            // Remove all message update listeners
            messageUpdateListeners.forEach((listener, modelId) => {
                if (llmService.hasSession(modelId)) {
                    // Extract original model ID for batch models
                    const originalModelId = modelId.replace(BATCH_SUFFIX_PATTERN, '');
                    const session = llmService.getSession(modelId, originalModelId);
                    session.removeOnMessageUpdate(listener);
                }
            });

            // Remove models update listener
            llmService.removeOnModelsUpdate(handleModelsUpdate);
        };
    }, [setChatHistory]);
};
