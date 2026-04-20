/**
 * @fileoverview Container component for the control menu that manages chat operations,
 * model selection, and project state using Zustand stores. Acts as a bridge between
 * the UI view and various store/service integrations.
 * @module Components.Sidebar.ControlMenu.ControlMenuContainer
 */

import React from 'react';
import { useDisclosure } from '@mantine/hooks';
import { ICustomMessage, IProjectSavestate } from '@root/server/src/interfaces';
import { useModelSelectionStore, BATCH_SUFFIX_PATTERN } from '@/stores/modelSelectionStore';
import { useChatUIStore } from '@/stores/chatUIStore';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import { useEvaluationStore } from '@/stores/evaluationStore';
import { ControlMenuView } from './ControlMenuView';
import { useReloadBackend, useSaveProject } from '@/hooks';
import { useControlMenu } from '@/hooks/useControlMenu';
import { llmService } from '@/services';
import { showNotification } from '@/utils';

/**
 * Props for the ControlMenuContainer component.
 * Simplified to only include handlers that cannot be derived from stores.
 */
interface ControlMenuContainerProps {
    /**
     * Handler for opening the model selection dialog.
     */
    onOpenModelSelect: () => void;

    /**
     * Handler for directly comparing custom messages.
     */
    onCustomMessageDirectCompare: (messages: ICustomMessage[]) => void;
}

/**
 * Container component that orchestrates control menu functionality through Zustand stores.
 * Manages chat synchronization, project saving/loading, and model adapter operations.
 *
 * @param props - Component props containing event handlers
 * @returns Rendered ControlMenuView with computed state and handlers
 */
export const ControlMenuContainer: React.FC<ControlMenuContainerProps> = ({ onOpenModelSelect, onCustomMessageDirectCompare }) => {
    const { selectedModelIDs, activeModelId, availableModels, selectModel, clearAllSelections } = useModelSelectionStore();
    const { chatHistories, customMessages, isAnyLoading, setCustomMessages } = useChatUIStore();
    const { syncChatHistories, resetChats } = useControlMenu();
    const { systemPrompt, timeout, getProjectOptions, setTimeout, setMarkdownRendered, setSystemPrompt, setShouldParseThinkingBlock, setModelOptions, setShowConsensusScores, setConsensusMuThreshold, setConsensusSigmaThreshold, setBatchSize } = useAppSettingsStore();
    const { loading: adapterLoading, reloadAdapters } = useReloadBackend(timeout);
    const { getAllEvaluations } = useEvaluationStore();
    const { saveProject } = useSaveProject();

    /**
     * Saves the current project state including selected models, chat histories, custom messages, and evaluation data.
     * Filters available models to only include currently selected ones.
     * Includes all evaluation data with server metrics and client-computed values (MDS, consensus).
     */
    const onSaveProject = () => {
        const selectedModels = availableModels.filter((item) => selectedModelIDs.some((selItem) => item.id === selItem));
        const evaluations = getAllEvaluations();
        saveProject(selectedModels, chatHistories, customMessages, getProjectOptions(), evaluations);

        // Notify user about evaluation data status
        if (evaluations.length === 0) {
            showNotification({
                title: 'Project exported',
                message: 'Project saved successfully. Note: No evaluation data available to export.',
                type: 'info',
                autoClose: 5000,
            });
        } else {
            showNotification({
                title: 'Project exported',
                message: `Project saved with chat histories, settings, and ${evaluations.length} evaluation${evaluations.length !== 1 ? 's' : ''}`,
                type: 'success',
                autoClose: 5000,
            });
        }
    };

    /**
     * Applies loaded project data to all relevant stores and creates LLM sessions.
     * Restores app settings, model selections, and chat histories from saved state.
     * Provides default values for missing settings and logs any missing fields for backwards compatibility.
     *
     * @param data - The project savestate containing models, messages, and configuration
     */
    const applyProjectData = (data: IProjectSavestate) => {
        const missingFields: string[] = [];

        // Handle case where entire options object is missing
        if (!data.options) {
            console.log('Project import: No options found in project file, using all defaults');
            missingFields.push('entire options object');
        }

        const options = data.options || {};

        // Apply settings with defaults and track missing fields
        const timeout = options.timeout ?? 60000;
        const markdown = options.markdown ?? true;
        const systemPrompt = options.systemPrompt ?? 'You are a helpful assistant.';
        const parseThinkingBlock = options.parseThinkingBlock ?? true;
        const showConsensusScores = options.showConsensusScores ?? true;
        const consensusMuThreshold = options.consensusMuThreshold ?? 0.7;
        const consensusSigmaThreshold = options.consensusSigmaThreshold ?? 0.2;
        const batchSize = options.batchSize ?? 1;

        // Handle model options with defaults
        const defaultModelOptions = {
            stream: true,
            temperature: 1.0,
            top_p: 1.0,
            seed: undefined,
            presence_penalty: 0,
            frequency_penalty: 0,
        };
        const modelOptions = options.modelOptions ? { ...defaultModelOptions, ...options.modelOptions } : defaultModelOptions;

        // Track missing fields for logging (only if options object exists)
        if (data.options) {
            if (options.timeout === undefined) missingFields.push('timeout');
            if (options.markdown === undefined) missingFields.push('markdown');
            if (options.systemPrompt === undefined) missingFields.push('systemPrompt');
            if (options.parseThinkingBlock === undefined) missingFields.push('parseThinkingBlock');
            if (options.showConsensusScores === undefined) missingFields.push('showConsensusScores');
            if (options.consensusMuThreshold === undefined) missingFields.push('consensusMuThreshold');
            if (options.consensusSigmaThreshold === undefined) missingFields.push('consensusSigmaThreshold');
            if (options.batchSize === undefined) missingFields.push('batchSize');
            if (options.modelOptions === undefined) missingFields.push('modelOptions');
        }

        // Log missing fields if any
        if (missingFields.length > 0) {
            console.log(`Project import: Using defaults for missing fields: ${missingFields.join(', ')}`);
        }

        // Apply all settings
        setTimeout(timeout);
        setMarkdownRendered(markdown);
        setSystemPrompt(systemPrompt);
        setShouldParseThinkingBlock(parseThinkingBlock);
        setModelOptions(modelOptions);
        setShowConsensusScores(showConsensusScores);
        setConsensusMuThreshold(consensusMuThreshold);
        setConsensusSigmaThreshold(consensusSigmaThreshold);
        setBatchSize(batchSize);

        clearAllSelections();

        // Restore model selections and chat histories
        if (data.models && data.models.length > 0) {
            data.models.forEach((model) => {
                selectModel(model.modelID);

                // Extract original model ID for batch models (e.g., "model__batch_1" -> "model")
                const originalModelId = model.modelID.replace(BATCH_SUFFIX_PATTERN, '');

                if (!llmService.hasSession(model.modelID)) {
                    llmService.createSession(model.modelID, originalModelId, systemPrompt);
                }
                const session = llmService.getSession(model.modelID, originalModelId);

                // Handle missing messages array
                const messages = model.messages || [];
                if (messages.length > 0) {
                    session.setMessageHistory([session.getMessageHistory()[0], ...messages]);
                }
            });
        } else {
            console.log('Project import: No models found in project file');
        }

        // Handle missing custom messages
        setCustomMessages(data.customMessages || []);
        if (!data.customMessages) {
            console.log('Project import: No custom messages found in project file');
        }
    };

    // Local state for custom message editor
    const [isCustomMessageEditorOpen, { open: openCustomMessageEditor, close: closeCustomMessageEditor }] = useDisclosure();

    /**
     * Synchronizes chat histories from the active model to all selected models.
     * Uses the control menu hook to perform the synchronization operation.
     */
    const handleSyncChatHistories = () => {
        if (activeModelId) {
            syncChatHistories(activeModelId, selectedModelIDs, systemPrompt);
        }
    };

    /**
     * Resets chat histories for all selected models using the current system prompt.
     */
    const handleResetChats = () => {
        resetChats(selectedModelIDs, systemPrompt);
    };

    /**
     * Handles direct comparison of custom messages by converting them to model messages
     * and triggering the evaluation modal.
     */
    const handleCustomMessageDirectCompare = (messages: ICustomMessage[]) => {
        onCustomMessageDirectCompare(messages);
    };

    // Compute disabled states based on current store state
    const syncDisabled = !activeModelId || !chatHistories.has(activeModelId) || (chatHistories.get(activeModelId)?.length ?? 0) === 0;
    const clearHistoryDisabled = selectedModelIDs.length === 0 || Array.from(chatHistories.values()).every((history) => history.length === 0);
    const anyLoading = isAnyLoading();

    return (
        <ControlMenuView
            syncDisabledDisabled={syncDisabled || anyLoading}
            clearHistoryDisabled={clearHistoryDisabled || anyLoading}
            isAdapterLoading={adapterLoading}
            isCustomMessageEditorOpen={isCustomMessageEditorOpen}
            onModelSelectionOpen={onOpenModelSelect}
            onSyncChatHistories={handleSyncChatHistories}
            onResetChats={handleResetChats}
            onSaveProject={onSaveProject}
            onLoadProject={applyProjectData}
            onReloadAdapters={reloadAdapters}
            onCustomMessageEditorOpen={openCustomMessageEditor}
            onCustomMessageDirectCompare={handleCustomMessageDirectCompare}
            onCustomMessageEditorClose={closeCustomMessageEditor}
        />
    );
};
