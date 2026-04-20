/**
 * @fileoverview Batch model management hook that automatically creates and cleans up virtual batch models.
 * Watches batch size settings and selected models to maintain the correct number of batch instances.
 *
 * @module Hooks.BatchModelManager
 */

import { useEffect, useRef } from 'react';
import { useModelSelectionStore, BATCH_SUFFIX_PATTERN, BATCH_SUFFIX } from '@/stores/modelSelectionStore';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import { useChatUIStore } from '@/stores/chatUIStore';
import { llmService } from '@/services';
import { IChatRoleMessage } from '@root/server/src/interfaces';

/**
 * Hook that automatically manages batch model creation and cleanup based on batch size setting.
 *
 * Creates virtual batch models with the pattern `{modelId}__batch_{n}` when batch size > 1.
 * For each selected model, creates (batchSize - 1) additional batch instances. Handles
 * session lifecycle, chat history synchronization, and cleanup when models are deselected
 * or batch size changes.
 *
 * @example
 * ```tsx
 * function App() {
 *   useBatchModelManager(); // Automatically manages batch models
 *   return <YourApp />;
 * }
 * ```
 */
export const useBatchModelManager = () => {
    const { selectedModelIDs, availableModels, setAvailableModels, selectModel, deselectModel, getBatchModelsForParent } = useModelSelectionStore();

    const { batchSize, systemPrompt } = useAppSettingsStore();
    const { setChatHistory } = useChatUIStore();

    const prevSelectedModelsRef = useRef<string[]>(selectedModelIDs);

    useEffect(() => {
        const selectedNonBatchModels = selectedModelIDs.filter((id) => !BATCH_SUFFIX_PATTERN.test(id));
        const prevSelectedModels = prevSelectedModelsRef.current.filter((id) => !BATCH_SUFFIX_PATTERN.test(id));

        // batchSize - 1 because original model counts as first run
        const requiredBatchCount = Math.max(0, batchSize - 1);

        const modelsToCreateBatches: string[] = [];
        const batchesToRemove: string[] = [];
        selectedNonBatchModels.forEach((modelId) => {
            const existingBatches = getBatchModelsForParent(modelId);
            const currentBatchCount = existingBatches.length;

            if (currentBatchCount < requiredBatchCount) {
                modelsToCreateBatches.push(modelId);
            } else if (currentBatchCount > requiredBatchCount) {
                const excessBatches = existingBatches.slice(requiredBatchCount);
                batchesToRemove.push(...excessBatches);
            }
        });

        const deselectedModels = prevSelectedModels.filter((id) => !selectedNonBatchModels.includes(id));
        deselectedModels.forEach((modelId) => {
            const batches = getBatchModelsForParent(modelId);
            batchesToRemove.push(...batches);
        });
        if (batchesToRemove.length > 0) {
            batchesToRemove.forEach((batchId) => {
                if (llmService.hasSession(batchId)) {
                    llmService.removeSession(batchId);
                }

                if (selectedModelIDs.includes(batchId)) {
                    deselectModel(batchId);
                }
            });

            const updatedModels = availableModels.filter((model) => !batchesToRemove.includes(model.id));
            setAvailableModels(updatedModels);
        }
        if (modelsToCreateBatches.length > 0 && requiredBatchCount > 0) {
            const newVirtualModels: typeof availableModels = [];
            const newBatchIds: string[] = [];

            modelsToCreateBatches.forEach((modelId) => {
                const modelInfo = availableModels.find((m) => m.id === modelId);
                if (!modelInfo) return;

                const existingBatches = getBatchModelsForParent(modelId);
                const currentCount = existingBatches.length;
                const toCreate = requiredBatchCount - currentCount;

                for (let i = 0; i < toCreate; i++) {
                    const batchNumber = currentCount + i + 1;
                    const batchId = `${modelId}${BATCH_SUFFIX}${batchNumber}`;

                    if (!llmService.hasSession(batchId)) {
                        llmService.createSession(batchId, modelId, systemPrompt);
                    }

                    const session = llmService.getSession(batchId, modelId);
                    const messageUpdateListener = (messageHistory: IChatRoleMessage[]) => {
                        setChatHistory(batchId, messageHistory);
                    };
                    session.addOnMessageUpdate(messageUpdateListener);

                    const currentMessages = session.getMessageHistory();
                    setChatHistory(batchId, currentMessages);

                    const virtualModel = {
                        ...modelInfo,
                        id: batchId,
                    };
                    newVirtualModels.push(virtualModel);
                    newBatchIds.push(batchId);
                }
            });

            if (newVirtualModels.length > 0) {
                const updatedModels = [...availableModels, ...newVirtualModels];
                setAvailableModels(updatedModels);

                newBatchIds.forEach((batchId) => {
                    selectModel(batchId);
                });
            }
        }
        prevSelectedModelsRef.current = selectedModelIDs;
    }, [selectedModelIDs, batchSize, systemPrompt, availableModels, setAvailableModels, selectModel, deselectModel, getBatchModelsForParent, setChatHistory]);
};
