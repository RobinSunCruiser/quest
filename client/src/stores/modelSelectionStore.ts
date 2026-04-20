/**
 * @fileoverview Zustand store for managing model selection and active model state with persistence.
 * Handles available models, selection tracking, and active model management with validation
 * and automatic cleanup of invalid selections.
 *
 * @module Stores.ModelSelectionStore
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import { IModelInfo } from '@root/server/src/interfaces';

/**
 * Batch model suffix string for creating batch model IDs.
 * Format: __batch_
 */
export const BATCH_SUFFIX = '__batch_';

/**
 * Batch model suffix pattern used to identify batch models.
 * Matches: __batch_1, __batch_2, etc.
 * Automatically derived from BATCH_SUFFIX constant.
 */
export const BATCH_SUFFIX_PATTERN = new RegExp(`${BATCH_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\d+$`);

/**
 * Model selection store state interface managing available and selected models.
 */
interface ModelSelectionState {
    // === State ===
    /** Array of all available models from the server */
    availableModels: IModelInfo[];
    /** Array of currently selected model IDs (sorted for consistency) */
    selectedModelIDs: string[];
    /** ID of the currently active model, must be in selectedModelIDs */
    activeModelId: string | null;

    // === Actions ===
    /** Updates available models and cleans up invalid selections */
    setAvailableModels: (models: IModelInfo[]) => void;
    /** Adds a model to the selection if it exists and isn't already selected */
    selectModel: (modelId: string) => void;
    /** Removes a model from selection and updates active model if needed */
    deselectModel: (modelId: string) => void;
    /** Sets the active model (must be in selected models) */
    setActiveModel: (modelId: string | null) => void;
    /** Clears all selected models and active model */
    clearAllSelections: () => void;

    // === Computed Getters ===
    /**
     * Gets the full model info objects for all selected models
     * @returns Array of selected model info objects
     */
    getSelectedModels: () => IModelInfo[];
    /**
     * Gets the full model info object for the active model
     * @returns Active model info or null if no active model
     */
    getActiveModel: () => IModelInfo | null;
    /**
     * Checks if a specific model is currently selected
     * @param modelId - The model ID to check
     * @returns True if the model is selected and exists
     */
    isModelSelected: (modelId: string) => boolean;

    // === Batch Helpers ===
    /**
     * Checks if a model ID is a batch model
     * @param modelId - The model ID to check
     * @returns True if this is a batch model
     */
    isBatchModel: (modelId: string) => boolean;
    /**
     * Gets the parent model ID for a batch model
     * @param modelId - The batch model ID
     * @returns The parent model ID or the original ID if not a batch model
     */
    getParentModelId: (modelId: string) => string;
    /**
     * Gets all batch models for a parent model
     * @param parentModelId - The parent model ID
     * @returns Array of batch model IDs (excluding the parent)
     */
    getBatchModelsForParent: (parentModelId: string) => string[];
    /**
     * Gets all non-batch models from available models
     * @returns Array of non-batch model info objects
     */
    getNonBatchModels: () => IModelInfo[];
}

/**
 * Zustand store for managing model selection with localStorage persistence.
 * Provides validation, automatic cleanup, and reactive state management for model selection.
 *
 * @example
 * ```typescript
 * // Select models and set active
 * const { selectModel, setActiveModel } = useModelSelectionStore();
 * selectModel('gpt-4');
 * setActiveModel('gpt-4');
 *
 * // Get selected models
 * const { getSelectedModels } = useModelSelectionStore();
 * const models = getSelectedModels();
 *
 * // Check selection status
 * const { isModelSelected } = useModelSelectionStore();
 * if (isModelSelected('gpt-4')) {
 *   console.log('GPT-4 is selected');
 * }
 * ```
 */
export const useModelSelectionStore = create<ModelSelectionState>()(
    subscribeWithSelector(
        persist(
            (set, get) => ({
                // === Initial State ===
                availableModels: [],
                selectedModelIDs: [],
                activeModelId: null,

                // === Actions ===
                setAvailableModels: (models) => {
                    set((state) => {
                        const validIds = models.map((m) => m.id);

                        // Clean up invalid selections and maintain sort order
                        const validSelectedIDs = state.selectedModelIDs.filter((id) => validIds.includes(id)).sort();

                        // Validate active model still exists
                        let validActiveModelId = state.activeModelId;
                        if (validActiveModelId && !validIds.includes(validActiveModelId)) {
                            validActiveModelId = null;
                        }

                        // Ensure active model is in selected models
                        if (validActiveModelId && !validSelectedIDs.includes(validActiveModelId)) {
                            validActiveModelId = validSelectedIDs[0] || null;
                        }

                        // Auto-select first model if no active model but have selections
                        if (!validActiveModelId && validSelectedIDs.length > 0) {
                            validActiveModelId = validSelectedIDs[0];
                        }

                        return {
                            availableModels: models,
                            selectedModelIDs: validSelectedIDs,
                            activeModelId: validActiveModelId,
                        };
                    });
                },

                selectModel: (modelId) => {
                    set((state) => {
                        // Validate model exists
                        const modelExists = state.availableModels.some((m) => m.id === modelId);
                        if (!modelExists) {
                            console.warn(`Cannot select model ${modelId}: not in available models`);
                            return state;
                        }

                        if (!state.selectedModelIDs.includes(modelId)) {
                            const newSelected = [...state.selectedModelIDs, modelId].sort();

                            return {
                                selectedModelIDs: newSelected,
                                activeModelId: state.activeModelId || modelId,
                            };
                        }
                        return state;
                    });
                },

                deselectModel: (modelId) => {
                    set((state) => {
                        const newSelected = state.selectedModelIDs.filter((id) => id !== modelId);

                        return {
                            selectedModelIDs: newSelected,
                            activeModelId: state.activeModelId === modelId ? newSelected[0] || null : state.activeModelId,
                        };
                    });
                },

                setActiveModel: (modelId) => {
                    set((state) => {
                        // Validate model is selected
                        if (modelId && !state.selectedModelIDs.includes(modelId)) {
                            console.warn(`Cannot set active model ${modelId}: not in selected models`);
                            return state;
                        }

                        // Validate model exists
                        if (modelId && !state.availableModels.some((m) => m.id === modelId)) {
                            console.warn(`Cannot set active model ${modelId}: not in available models`);
                            return state;
                        }

                        return { activeModelId: modelId };
                    });
                },

                clearAllSelections: () => {
                    set({ selectedModelIDs: [], activeModelId: null });
                },

                // === Computed Getters ===
                getSelectedModels: () => {
                    const { availableModels, selectedModelIDs } = get();
                    return availableModels.filter((model) => selectedModelIDs.includes(model.id));
                },

                getActiveModel: () => {
                    const { availableModels, activeModelId, selectedModelIDs } = get();

                    // Safety check: active model must be in selected models
                    if (activeModelId && !selectedModelIDs.includes(activeModelId)) {
                        return null;
                    }

                    return availableModels.find((model) => model.id === activeModelId) || null;
                },

                isModelSelected: (modelId) => {
                    const { selectedModelIDs, availableModels } = get();
                    const modelExists = availableModels.some((m) => m.id === modelId);
                    return modelExists && selectedModelIDs.includes(modelId);
                },

                // === Batch Helpers ===
                isBatchModel: (modelId) => {
                    return BATCH_SUFFIX_PATTERN.test(modelId);
                },

                getParentModelId: (modelId) => {
                    return modelId.replace(BATCH_SUFFIX_PATTERN, '');
                },

                getBatchModelsForParent: (parentModelId) => {
                    const { availableModels } = get();
                    return availableModels
                        .filter((model) => {
                            const match = model.id.match(/^(.+)__batch_\d+$/);
                            return match && match[1] === parentModelId;
                        })
                        .map((model) => model.id);
                },

                getNonBatchModels: () => {
                    const { availableModels } = get();
                    return availableModels.filter((model) => !BATCH_SUFFIX_PATTERN.test(model.id));
                },
            }),
            {
                name: 'model-store',
                storage: createJSONStorage(() => localStorage),
                // Only persist selection state, not available models
                partialize: (state) => ({
                    selectedModelIDs: state.selectedModelIDs,
                    activeModelId: state.activeModelId,
                }),
                // Clean up state after rehydration from localStorage
                onRehydrateStorage: () => (state) => {
                    if (state) {
                        // Clear active model if no selections exist
                        if (state.activeModelId && state.selectedModelIDs.length === 0) {
                            state.activeModelId = null;
                        }

                        // Reset active model if not in selected models
                        if (state.activeModelId && !state.selectedModelIDs.includes(state.activeModelId)) {
                            state.activeModelId = state.selectedModelIDs[0] || null;
                        }
                    }
                },
            }
        )
    )
);
