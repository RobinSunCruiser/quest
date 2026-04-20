/**
 * @fileoverview Main content area component that orchestrates the chat interface.
 * Manages chat history, model tabs, evaluation functionality, and import/export operations.
 * @module Components.Main.MainContent
 */

import { ActionIcon, Flex, ScrollArea, Space, Stack } from '@mantine/core';
import { TbLayoutSidebarRightCollapse, TbLayoutSidebarRightExpand } from 'react-icons/tb';
import { useState, useEffect, useCallback } from 'react';

import { Tabs } from '@/components/main/Tabs';
import { ChatHistory } from '@/components/main/ChatHistory';
import { ModelInfo } from '@/components/main/ModelInfo';
import { ChatLoadingOverlay, ExportComponent, ImportComponent } from '@/components/misc';
import { Evaluation } from '@/components/evaluation';
import { usePromptSubmit, useChatOperations } from '@/hooks';
import { llmService } from '@/services';
import { useModelSelectionStore, BATCH_SUFFIX_PATTERN } from '@/stores/modelSelectionStore';
import { LoadingState, useChatUIStore } from '@/stores/chatUIStore';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import { useEvaluationStore } from '@/stores/evaluationStore';
import { showNotification, ConsensusAnalyzer } from '@/utils';
import { ICustomMessage, IMessageEvaluation, IModelMessage } from '@root/server/src/interfaces';

/**
 * Props for the MainContent component.
 */
interface MainContentProps {
    /**
     * Whether the sidebar is currently open.
     */
    isSidebarOpen: boolean;

    /**
     * Whether the screen size is considered small (mobile).
     */
    isSmallScreen: boolean | undefined;

    /**
     * Callback to toggle sidebar visibility.
     */
    onToggleSidebar: () => void;

    /**
     * Handler for directly comparing custom messages.
     */
    onCustomMessageDirectCompare: (handler: (messages: ICustomMessage[]) => void) => void;
}

/**
 * Main content area component that orchestrates the chat interface.
 *
 * Manages chat history display, model tabs, evaluation functionality, and import/export operations.
 * Includes responsive sidebar toggle and loading state management.
 *
 * @param props - Component configuration
 * @returns JSX element with the main chat interface
 */
export const MainContent: React.FC<MainContentProps> = ({ isSidebarOpen, isSmallScreen, onToggleSidebar, onCustomMessageDirectCompare }) => {
    const { handleAbort } = usePromptSubmit();
    const { activeModelId, getActiveModel, selectedModelIDs } = useModelSelectionStore();
    const { getLoadingState, getChatHistory, customMessages, loadingStates } = useChatUIStore();
    const { isModelInfoVisible, systemPrompt } = useAppSettingsStore();
    const { setEvaluationData, clearEvaluationData } = useEvaluationStore();
    const { importChat, exportChat } = useChatOperations(activeModelId);

    /**
     * Models queued for evaluation comparison.
     */
    const [modelsToEvaluate, setModelsToEvaluate] = useState<IModelMessage[]>([]);

    /**
     * Controls visibility of the evaluation modal.
     */
    const [isEvaluationOpen, setEvaluationOpen] = useState(false);

    /**
     * Current message index being evaluated.
     */
    const [currentEvaluationIndex, setCurrentEvaluationIndex] = useState<number | null>(null);

    /**
     * Clear evaluation data when model selection changes.
     * This ensures consensus scores are reset when models are selected/deselected.
     */
    useEffect(() => {
        clearEvaluationData();
    }, [selectedModelIDs, clearEvaluationData]);

    /**
     * Handles chat export for the active model.
     * Exports chat history with system prompt and model information.
     */
    const onClickExport = () => {
        const activeModel = getActiveModel();
        if (!activeModelId || !activeModel) return;
        exportChat(getChatHistory(activeModelId), systemPrompt, activeModel);
    };

    /**
     * Initiates evaluation comparison for messages at a specific index.
     * Collects messages from all selected models and custom messages for comparison.
     *
     * @param index - The message index to evaluate across models
     */
    const onClickEvaluate = (index: number) => {
        setCurrentEvaluationIndex(index);
        setEvaluationOpen(true);

        const modelMessages: IModelMessage[] = [];

        // Collect messages from all selected models at the given index
        for (const id of selectedModelIDs) {
            // Extract original model ID for batch models (e.g., "model__batch_1" -> "model")
            const originalModelId = id.replace(BATCH_SUFFIX_PATTERN, '');

            if (!llmService.hasSession(id)) {
                llmService.createSession(id, originalModelId, systemPrompt);
            }
            const session = llmService.getSession(id, originalModelId);

            // Skip models that don't have messages at this index
            if (session.getMessageHistory().length <= index) {
                continue;
            }

            const message = session.getMessageHistory()[index].content;
            modelMessages.push({ modelID: id, message: message });
        }

        // Include custom messages marked for evaluation
        const customModelsEvaluate = customMessages
            .filter((item) => item.used)
            .map((customMessage) => ({ modelID: customMessage.label, message: customMessage.message }))
            .sort((a, b) => a.modelID.localeCompare(b.modelID));

        // Filter out loading models and combine with custom messages
        const concatedAndFiltered = modelMessages
            .filter((modelMessage) => loadingStates.get(modelMessage.modelID) !== LoadingState.LOADING)
            .sort((a, b) => a.modelID.localeCompare(b.modelID))
            .concat(customModelsEvaluate);

        // Require at least two models for meaningful comparison
        if (concatedAndFiltered.length < 2) {
            showNotification({
                title: 'Insufficient models for comparison',
                message: 'At least two models must have messages at this index to perform an evaluation',
                type: 'warning',
                autoClose: 5000,
            });
            return;
        }
        setModelsToEvaluate(concatedAndFiltered);
    };
    /**
     * Handles direct comparison of custom messages by setting up evaluation.
     */
    const handleDirectCompareCustomMessages = (messages: ICustomMessage[]) => {
        const customModelsEvaluate = messages
            .filter((item) => item.used)
            .map((customMessage) => ({ modelID: customMessage.label, message: customMessage.message }))
            .sort((a, b) => a.modelID.localeCompare(b.modelID));

        if (customModelsEvaluate.length < 2) {
            return;
        }

        // Set a special index for custom message comparisons
        setCurrentEvaluationIndex(-1);
        setModelsToEvaluate(customModelsEvaluate);
        setEvaluationOpen(true);
    };

    useEffect(() => {
        onCustomMessageDirectCompare(handleDirectCompareCustomMessages);
    }, [onCustomMessageDirectCompare]);

    return (
        <>
            <Evaluation
                open={isEvaluationOpen}
                models={modelsToEvaluate}
                onClose={() => {
                    setEvaluationOpen(false);
                }}
                onEvaluationComplete={useCallback(
                    (data: IMessageEvaluation) => {
                        if (currentEvaluationIndex !== null) {
                            // Guard: ensure evaluation data has non-empty matrices before computing metrics
                            if (!data.models.length || !data.levenshteinNormalized.length || !data.jaccard.length) {
                                return;
                            }

                            // Compute consensus metrics and MDS coordinates for all similarity matrices
                            const analyzer = new ConsensusAnalyzer();
                            const modelLabels = data.models.map((m) => m.modelID);

                            // Helper function to compute metrics and MDS
                            const computeMetrics = (similarityMatrix: number[][]) => {
                                const fullMetrics = analyzer.computeMetrics(similarityMatrix, modelLabels);
                                const distanceMatrix = similarityMatrix.map((row) => row.map((val) => 1 - val));
                                const rawCoordinates = analyzer.mds(distanceMatrix, 2);
                                const mdsCoordinates = analyzer.adjustOverlappingPoints(rawCoordinates, 0.1);

                                return {
                                    consensus: {
                                        mu: fullMetrics.upper_triangular_mean,
                                        sigma: fullMetrics.upper_triangular_std,
                                        meanPairwiseSimilarity: fullMetrics.mean_pairwise_similarity,
                                        meanPairwiseSimilarityStd: fullMetrics.mean_pairwise_similarity_std,
                                        leadingEigenvalue: fullMetrics.leading_eigenvalue,
                                        leadingEigenvaluePercentage: fullMetrics.leading_eigenvalue_percentage,
                                        silhouetteScore: fullMetrics.silhouette_score,
                                        daviesBouldinScore: fullMetrics.davies_bouldin_score,
                                        calinskiHarabaszScore: fullMetrics.calinski_harabasz_score,
                                    },
                                    mdsCoordinates,
                                };
                            };

                            // Compute analysis (consensus metrics and MDS coordinates)
                            const analysis = {
                                cosine: data.cosines.map((cosineData) => computeMetrics(cosineData.cosine)),
                                levenshteinNormalized: computeMetrics(data.levenshteinNormalized),
                                jaccard: computeMetrics(data.jaccard),
                            };

                            // Store evaluation with computed analysis
                            setEvaluationData(currentEvaluationIndex, data, analysis);
                        }
                    },
                    [currentEvaluationIndex, setEvaluationData]
                )}
            />

            {/* Floating sidebar toggle for small screens */}
            {isSmallScreen && (
                <ActionIcon
                    variant="filled"
                    color="blue.5"
                    size="xl"
                    radius="xl"
                    style={{
                        position: 'fixed',
                        right: isSidebarOpen ? '36rem' : '1rem',
                        bottom: '50vh',
                        zIndex: 100,
                        transition: 'right 0.3s ease-in-out',
                        opacity: 0.5,
                    }}
                    onClick={onToggleSidebar}
                >
                    {isSidebarOpen ? <TbLayoutSidebarRightCollapse size={24} /> : <TbLayoutSidebarRightExpand size={24} />}
                </ActionIcon>
            )}

            <Stack h="calc(100vh - var(--app-shell-header-height, 0px))" p={'sm'} gap={0} justify="flex-start" w={'100%'}>
                <Tabs />

                <ModelInfo visible={isModelInfoVisible} model={getActiveModel()!}></ModelInfo>
                <Space h={'xs'} />

                <ScrollArea h={'100%'} offsetScrollbars="y" type="always" scrollbars="y" w={'100%'}>
                    <ChatLoadingOverlay
                        onAbort={() => handleAbort(activeModelId)}
                        visible={
                            getLoadingState(activeModelId || '') === LoadingState.LOADING &&
                            !(
                                activeModelId &&
                                (() => {
                                    const originalModelId = activeModelId.replace(BATCH_SUFFIX_PATTERN, '');
                                    return llmService.getSession(activeModelId, originalModelId).isStreaming();
                                })()
                            )
                        }
                    />

                    <ChatHistory width="100%" onClickEvaluate={onClickEvaluate} />
                </ScrollArea>

                <Flex justify="flex-end" align="center" h={40} pt={'sm'} gap="sm" m={'2'}>
                    <ImportComponent disabled={activeModelId === null} onImport={(chatHistory) => importChat(activeModelId!, chatHistory, systemPrompt)}></ImportComponent>
                    <ExportComponent disabled={activeModelId === null} onExport={onClickExport}></ExportComponent>
                </Flex>
            </Stack>
        </>
    );
};
