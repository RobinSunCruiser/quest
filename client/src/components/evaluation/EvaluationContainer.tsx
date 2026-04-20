/**
 * @fileoverview Container component for managing model evaluation state and logic.
 * Orchestrates data processing, filtering, and UI state for model performance comparison.
 * Integrates with useEvaluation hook and useModelSelectionStore for comprehensive evaluation workflow.
 *
 * @module Components.Evaluation.EvaluationContainer
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { IMessageEvaluation, IModelMessage } from '@root/server/src/interfaces/IMessageEvaluation';
import { showNotification } from '@/utils';
import { EvaluationView } from './EvaluationView';
import { ProcessedEvaluationData } from './types';
import { useEvaluation } from '@/hooks';
import { useModelSelectionStore } from '@/stores/modelSelectionStore';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import { useChatUIStore } from '@/stores/chatUIStore';
import { useSaveProject } from '@/hooks/useSaveProject';
import { useEvaluationStore } from '@/stores/evaluationStore';

/**
 * Props for the EvaluationContainer component.
 */
export interface EvaluationContainerProps {
    /** Controls modal visibility */
    open: boolean;
    /** Array of model messages for evaluation */
    models: IModelMessage[];
    /** Callback fired when modal is closed */
    onClose: () => void;
    /** Callback fired when evaluation data is received (optional) */
    onEvaluationComplete?: (data: IMessageEvaluation) => void;
}

/**
 * Container that manages state and business logic for model evaluation visualization.
 * Handles data processing, filtering, and delegates presentation to EvaluationView.
 *
 * Key features:
 * - Automatically excludes "+think" models from initial selection
 * - Provides flexible metric view filtering (cosine, levenshtein, jaccard)
 * - Supports toggling between abbreviated and full model IDs
 * - Handles error states with user notifications
 *
 * @param props - Component props
 * @returns JSX element or null if error state
 */
export const EvaluationContainer: React.FC<EvaluationContainerProps> = ({ models, open, onClose, onEvaluationComplete }) => {
    const [opened, setOpened] = useState<boolean>(open);
    const [selectedModels, setSelectedModels] = useState<string[]>([]);

    // Check if there are custom messages (those with modelID that doesn't match selected model IDs)
    const { getSelectedModels, availableModels, selectedModelIDs } = useModelSelectionStore();
    const { getProjectOptions } = useAppSettingsStore();
    const { chatHistories, customMessages: allCustomMessages } = useChatUIStore();
    const { getAllEvaluations } = useEvaluationStore();
    const { saveProject } = useSaveProject();
    const modelList = getSelectedModels();
    const hasCustomMessages = useMemo(() => {
        const selectedModelIds = new Set(modelList.map(m => m.id));
        return models.some(model => !selectedModelIds.has(model.modelID));
    }, [models, modelList]);
    
    // Default metrics - include table only if there are custom messages
    const defaultMetrics = useMemo(() => {
        const baseMetrics = ['mds', 'chart', 'cosine', 'levenshtein', 'jaccard'];
        return hasCustomMessages ? ['table', ...baseMetrics] : baseMetrics;
    }, [hasCustomMessages]);
    
    const [activeMetrics, setActiveMetrics] = useState<Set<string>>(new Set(defaultMetrics));
    const [showFullModelId, setShowFullModelId] = useState<boolean>(false);
    const [showOptions, setShowOptions] = useState<boolean>(false);
    const [showEmbeddingID, setShowEmbeddingID] = useState<boolean>(false);
    const [errorState, setError] = useState<Error | null>(null);

    const { data, error, loading } = useEvaluation(models);

    /**
     * Initialize selected models, excluding "+think" models by default.
     * This design decision reduces visual clutter by hiding specialized thinking models
     * unless explicitly selected by the user.
     */
    useEffect(() => {
        if (data?.models) {
            setSelectedModels(data.models.filter((model) => !model.modelID.endsWith('+think')).map((model) => model.modelID));
        }
    }, [data, models]);

    /**
     * Update active metrics based on whether custom messages are present.
     * Automatically include consensus table when custom messages are used.
     */
    useEffect(() => {
        setActiveMetrics(new Set(defaultMetrics));
    }, [defaultMetrics]);

    /**
     * Sync modal visibility with open prop.
     */
    useEffect(() => {
        setOpened(open);
    }, [open]);

    /**
     * Handle errors with notifications and update error state.
     * Displays user-friendly error messages while maintaining error state for conditional rendering.
     */
    useEffect(() => {
        if (error) {
            showNotification({
                title: 'Evaluation Error',
                message: error.message,
                type: 'warning',
                autoClose: 5000,
            });
        }
        setError(error);
    }, [error, models]);

    /**
     * Filters similarity matrix to include only selected model indices.
     * Creates a subset of the original matrix based on user's model selection.
     *
     * @param matrix - 2D similarity matrix with all models
     * @param indices - Array of model indices to include in filtered result
     * @returns Filtered matrix containing only selected model comparisons
     */
    const filterMatrix = (matrix: number[][], indices: number[]) => {
        return indices.map((i) => indices.map((j) => matrix[i][j]));
    };

    /**
     * Creates filtered evaluation data based on selected models.
     * Transforms raw evaluation data to include only user-selected models and
     * applies display preferences for embedding IDs.
     *
     * @returns Filtered data structure matching ProcessedEvaluationData interface, or null if no data/selection
     */
    const getFilteredData = (): ProcessedEvaluationData | null => {
        if (!data || selectedModels.length === 0) return null;

        const modelIndices = selectedModels.map((modelId) => data.models.findIndex((model) => model.modelID === modelId)).filter((index) => index !== -1);
        const filteredModels = data.models.filter((model) => selectedModels.includes(model.modelID));

        // Filter the cosine matrices for the selected models
        const filteredCosines = data.cosines.map((item) => ({
            embeddingModel: showEmbeddingID
                ? `${item.embeddingModel.embeddingID}: ${item.embeddingModel.modelID}`
                : modelList.find((model) => model.id === item.embeddingModel.modelID)?.model || item.embeddingModel.modelID,
            cosine: filterMatrix(item.cosine, modelIndices),
        }));

        return {
            models: filteredModels,
            cosines: filteredCosines,
            levenshtein: filterMatrix(data.levenshtein, modelIndices),
            levenshteinNormalized: filterMatrix(data.levenshteinNormalized, modelIndices),
            jaccard: filterMatrix(data.jaccard, modelIndices),
        };
    };

    const filteredData = useMemo(() => getFilteredData(), [data, selectedModels, showEmbeddingID]);

    /**
     * Formats model ID for display, handling "+think" suffix and full ID toggle.
     * Provides user-friendly model names by leveraging the model selection store
     * and handling special cases like thinking models.
     *
     * @param modelID - Raw model identifier from the evaluation data
     * @returns Formatted display label (e.g., "GPT-4 (think)" or full ID based on toggle state)
     */
    const formatModelLabel = useCallback(
        (modelID: string): string => {
            if (showFullModelId) {
                return modelID;
            }

            if (modelID.endsWith('+think')) {
                const baseModelId = modelID.replace('+think', '');
                const baseModel = modelList.find((model) => model.id === baseModelId);
                return baseModel ? `${baseModel.model} (think)` : modelID;
            }

            return modelList.find((model) => model.id === modelID)?.model || modelID;
        },
        [showFullModelId, modelList]
    );

    // Event handlers for UI interactions
    const handleModelSelectionChange = (models: string[]) => {
        setSelectedModels(models);
    };

    const handleSelectAllModels = () => {
        if (data?.models) {
            setSelectedModels(data.models.map((model) => model.modelID));
        }
    };

    const handleClearAllModels = () => {
        setSelectedModels([]);
    };

    const handleMetricToggle = (metric: string) => {
        setActiveMetrics(prev => {
            const newSet = new Set(prev);
            if (newSet.has(metric)) {
                newSet.delete(metric);
            } else {
                newSet.add(metric);
            }
            return newSet;
        });
    };

    const handleMetricViewChange = (view: string) => {
        if (view === 'all') {
            setActiveMetrics(new Set(['table', 'mds', 'chart', 'cosine', 'levenshtein', 'jaccard']));
        } else if (view === 'none') {
            setActiveMetrics(new Set());
        } else {
            handleMetricToggle(view);
        }
    };

    const handleShowFullModelIdToggle = (show: boolean) => {
        setShowFullModelId(show);
    };

    const handleShowEmbeddingIdToggle = (show: boolean) => {
        setShowEmbeddingID(show);
    };

    const handleShowOptionsToggle = () => {
        setShowOptions((prev) => !prev);
    };

    /**
     * Handles exporting full project data including evaluation metrics, chat histories, and settings
     */
    const handleExport = () => {
        if (data) {
            // Export full project with all evaluation data
            const selectedModelsForExport = availableModels.filter((item) => selectedModelIDs.some((selItem) => item.id === selItem));
            const evaluations = getAllEvaluations();

            saveProject(
                selectedModelsForExport,
                chatHistories,
                allCustomMessages,
                getProjectOptions(),
                evaluations
            );

            showNotification({
                title: 'Project exported',
                message: `Exported full project with chat histories, settings, and ${evaluations.length} evaluation${evaluations.length !== 1 ? 's' : ''}`,
                type: 'success',
                autoClose: 5000,
            });
        }
    };

    // Call callback when evaluation data is received
    useEffect(() => {
        if (data && onEvaluationComplete) {
            onEvaluationComplete(data);
        }
    }, [data]); // Remove onEvaluationComplete from dependencies to prevent infinite loop

    if (errorState) return null;

    // Determine visible metrics based on active selections
    const shouldShowCosine = activeMetrics.has('cosine');
    const shouldShowLevenshtein = activeMetrics.has('levenshtein');
    const shouldShowJaccard = activeMetrics.has('jaccard');
    const shouldShowTable = activeMetrics.has('table');
    const shouldShowMDS = activeMetrics.has('mds');
    const shouldShowConsensusChart = activeMetrics.has('chart');

    return (
        <EvaluationView
            opened={opened}
            onClose={onClose}
            isLoading={loading}
            data={data}
            filteredData={filteredData}
            selectedModels={selectedModels}
            showFullModelId={showFullModelId}
            showOptions={showOptions}
            showEmbeddingID={showEmbeddingID}
            shouldShowCosine={shouldShowCosine}
            shouldShowLevenshtein={shouldShowLevenshtein}
            shouldShowJaccard={shouldShowJaccard}
            shouldShowTable={shouldShowTable}
            shouldShowMDS={shouldShowMDS}
            shouldShowConsensusChart={shouldShowConsensusChart}
            formatModelLabel={formatModelLabel}
            onModelSelectionChange={handleModelSelectionChange}
            onSelectAllModels={handleSelectAllModels}
            onClearAllModels={handleClearAllModels}
            onMetricViewChange={handleMetricViewChange}
            onShowFullModelIdToggle={handleShowFullModelIdToggle}
            onShowEmbeddingIdToggle={handleShowEmbeddingIdToggle}
            onShowOptionsToggle={handleShowOptionsToggle}
            onExport={handleExport}
        />
    );
};
