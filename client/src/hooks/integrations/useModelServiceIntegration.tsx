/**
 * @fileoverview Model service integration hook that synchronizes available models with the UI store.
 * Handles initial model fetching and subscribes to model updates from llmService.
 *
 * @module Hooks.Integrations.ModelServiceIntegration
 */

import { useEffect } from 'react';
import { llmService } from '@/services';
import { useModelSelectionStore } from '@/stores/modelSelectionStore';
import type { IModelInfo } from '@root/server/src/interfaces';
import { showNotification } from '@/utils';

/**
 * Hook that integrates model service with the model selection store.
 *
 * Performs initial model fetching on mount and subscribes to model updates
 * from llmService. Updates the model selection store when models change
 * and handles error notifications for failed operations.
 *
 * @example
 * ```tsx
 * // Used at the app level to keep available models synchronized
 * function App() {
 *   useModelServiceIntegration();
 *   return <ModelSelector />;
 * }
 * ```
 */
export const useModelServiceIntegration = () => {
    const { setAvailableModels } = useModelSelectionStore();

    useEffect(() => {
        /**
         * Handles model updates by synchronizing them with the store.
         *
         * @param models - Updated array of available models
         */
        const handleModelsUpdate = (models: IModelInfo[]) => {
            setAvailableModels(models);
        };

        // Subscribe to model updates
        llmService.addOnModelsUpdate(handleModelsUpdate);

        /**
         * Initializes the available models by fetching them from the service.
         * Shows error notification if the initial fetch fails.
         */
        const initializeModels = async () => {
            try {
                const models = await llmService.listModels();
                if (models) {
                    setAvailableModels(models);
                }
            } catch (error) {
                showNotification({
                    title: 'Error',
                    message: 'Failed to fetch models. Please try again later.',
                    type: 'error',
                });
                console.error('Failed to initialize models:', error);
            }
        };

        initializeModels();

        // Cleanup subscription on unmount
        return () => {
            llmService.removeOnModelsUpdate(handleModelsUpdate);
        };
    }, [setAvailableModels]);
};
