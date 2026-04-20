/**
 * @fileoverview Container component that orchestrates all application settings panels.
 * Manages state through the app settings store and coordinates between general settings, model options, and system prompt configuration.
 * @module Components.Sidebar.AppSettings.AppSettingsWindow
 */

import React from 'react';
import { Stack } from '@mantine/core';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import { GeneralSettings } from './Panels/GeneralSettings';
import { ModelOptions } from './Panels/ModelOptions';
import { SystemPrompt } from './Panels/SystemPrompt';

/**
 * Container component that manages all settings state using the app settings store.
 * Provides a unified interface for configuring application behavior, model parameters, and system prompts.
 *
 * @returns Stack layout containing all settings panels with centralized state management
 */
export const AppSettingsWindow: React.FC = () => {
    const {
        // General Settings
        isMarkdownRendered,
        setMarkdownRendered,
        shouldParseThinkingBlock,
        setShouldParseThinkingBlock,
        timeout,
        setTimeout,
        isModelInfoVisible,
        setModelInfoVisible,
        showConsensusScores,
        setShowConsensusScores,
        consensusMuThreshold,
        setConsensusMuThreshold,
        consensusSigmaThreshold,
        setConsensusSigmaThreshold,
        batchSize,
        setBatchSize,
        isRAGEnabled,
        setRAGEnabled,

        // Model Options
        modelOptions,
        setModelOptions,

        // System Prompt
        systemPrompt,
        setSystemPrompt,

        // UI State
        isGeneralSettingsOpen,
        toggleGeneralSettings,
        isModelOptionsOpen,
        toggleModelOptions,
    } = useAppSettingsStore();

    return (
        <Stack gap={'md'}>
            <GeneralSettings
                renderMarkdown={isMarkdownRendered}
                setRenderMarkdown={setMarkdownRendered}
                parseThinkingBlock={shouldParseThinkingBlock}
                setParseThinkingBlock={setShouldParseThinkingBlock}
                timeout={timeout}
                setTimeout={setTimeout}
                showModelInfo={isModelInfoVisible}
                setShowModelInfo={setModelInfoVisible}
                showConsensusScores={showConsensusScores}
                setShowConsensusScores={setShowConsensusScores}
                consensusMuThreshold={consensusMuThreshold}
                setConsensusMuThreshold={setConsensusMuThreshold}
                consensusSigmaThreshold={consensusSigmaThreshold}
                setConsensusSigmaThreshold={setConsensusSigmaThreshold}
                batchSize={batchSize}
                setBatchSize={setBatchSize}
                ragEnabled={isRAGEnabled}
                setRAGEnabled={setRAGEnabled}
                isOpen={isGeneralSettingsOpen}
                toggleIsOpen={toggleGeneralSettings}
            />
            <ModelOptions modelOptions={modelOptions} setModelOptions={setModelOptions} isOpen={isModelOptionsOpen} toggleIsOpen={toggleModelOptions} />
            <SystemPrompt systemPrompt={systemPrompt} onSystemPromptChange={setSystemPrompt} />
        </Stack>
    );
};
