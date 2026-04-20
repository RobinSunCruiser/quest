/**
 * @fileoverview Container component for the model selection drawer interface.
 * Manages model grouping by adapter, selection state, and batch toggle operations
 * using the model selection store.
 * @module Components.Sidebar.ModelSelectionDrawer.ModelSelectionContainer
 */

import React, { useMemo } from 'react';
import { useModelSelectionStore } from '@/stores/modelSelectionStore';
import { ModelSelectionView } from './ModelSelectionView';

/**
 * Props for the ModelSelectionContainer component.
 */
export interface ModelSelectionContainerProps {
    /** Controls whether the drawer is open or closed */
    opened: boolean;
    /** Handler called when the drawer should be closed */
    onClose: () => void;
}

/**
 * Container component that orchestrates model selection functionality.
 * Groups available models by their adapter ID and provides batch selection operations.
 * Connects the model selection store to the drawer UI presentation.
 *
 * @param props - Component props containing drawer state and handlers
 * @returns Rendered ModelSelectionView with grouped models and selection handlers
 */
export const ModelSelectionContainer: React.FC<ModelSelectionContainerProps> = ({ opened, onClose }) => {
    const { availableModels, selectedModelIDs, selectModel, deselectModel, isModelSelected, getNonBatchModels } = useModelSelectionStore();

    /**
     * Groups available models by their adapter ID for organized display.
     * Filters out batch models - only shows original models for selection.
     * Creates a simplified structure with groupID and models array for each adapter.
     */
    const groupedModels = useMemo(() => {
        const groups = new Map<string, typeof availableModels>();

        // Filter to only non-batch models
        const nonBatchModels = getNonBatchModels();

        nonBatchModels.forEach((model) => {
            if (!groups.has(model.adapterID)) {
                groups.set(model.adapterID, []);
            }
            groups.get(model.adapterID)!.push(model);
        });

        return Array.from(groups.entries()).map(([adapterID, models]) => ({
            groupID: adapterID,
            models,
        }));
    }, [availableModels, getNonBatchModels]);

    /**
     * Handles batch selection/deselection for an entire adapter group.
     * If all models in the group are selected, deselects all; otherwise selects all.
     *
     * @param _ - Unused group parameter (maintained for interface compatibility)
     * @param models - Array of models in the group to toggle
     */
    const handleGroupToggle = (_: any, models: typeof availableModels) => {
        const allSelected = models.every((m) => isModelSelected(m.id));

        models.forEach((model) => {
            if (allSelected) {
                deselectModel(model.id);
            } else {
                selectModel(model.id);
            }
        });
    };

    /**
     * Toggles the selection state of an individual model.
     *
     * @param modelId - The ID of the model to toggle
     */
    const handleModelToggle = (modelId: string) => {
        if (isModelSelected(modelId)) {
            deselectModel(modelId);
        } else {
            selectModel(modelId);
        }
    };

    return (
        <ModelSelectionView
            opened={opened}
            onClose={onClose}
            groupedModels={groupedModels}
            selectedCount={selectedModelIDs.length}
            onGroupToggle={handleGroupToggle}
            onModelToggle={handleModelToggle}
            isModelSelected={isModelSelected}
        />
    );
};
