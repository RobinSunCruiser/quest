/**
 * @fileoverview Zustand store for application-wide settings management with persistence.
 * Handles UI state, model configuration, general settings, and provides bulk update capabilities.
 * Data is automatically persisted to localStorage for session continuity.
 *
 * @module Stores.AppSettingsStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { IModelOptions, IProjectOptions } from '@root/server/src/interfaces';

/**
 * Model options configuration slice managing model parameters and UI visibility.
 */
interface ModelOptionsState {
    /** Whether the model options panel is currently open */
    isModelOptionsOpen: boolean;
    /** Sets the model options panel visibility state */
    setModelOptionsOpen: (opened: boolean) => void;
    /** Toggles the model options panel open/closed */
    toggleModelOptions: () => void;

    /** Current model configuration options (temperature, top_p, etc.) */
    modelOptions: IModelOptions;
    /** Updates the model configuration options */
    setModelOptions: (options: IModelOptions) => void;
}

/**
 * General application settings slice managing display preferences and behavior.
 */
interface GeneralSettingsState {
    /** Whether the general settings panel is currently open */
    isGeneralSettingsOpen: boolean;
    /** Sets the general settings panel visibility state */
    setGeneralSettingsOpen: (opened: boolean) => void;
    /** Toggles the general settings panel open/closed */
    toggleGeneralSettings: () => void;

    /** Whether model information is visible in the UI */
    isModelInfoVisible: boolean;
    /** Request timeout duration in milliseconds */
    timeout: number;
    /** Whether to render markdown in chat messages */
    isMarkdownRendered: boolean;
    /** Whether to parse and display thinking blocks from model responses */
    shouldParseThinkingBlock: boolean;
    /** Whether to show consensus scores in chat messages */
    showConsensusScores: boolean;
    /** Threshold for μ (upper triangular mean) - above this is considered good consensus */
    consensusMuThreshold: number;
    /** Threshold for σ (standard deviation) - below this is considered good consensus */
    consensusSigmaThreshold: number;
    /** Number of batch runs for each selected model (1 = no batching) */
    batchSize: number;
    /** Whether RAG (Retrieval Augmented Generation) is enabled */
    isRAGEnabled: boolean;

    /** Sets model information visibility */
    setModelInfoVisible: (show: boolean) => void;
    /** Sets request timeout duration */
    setTimeout: (timeout: number) => void;
    /** Sets markdown rendering preference */
    setMarkdownRendered: (render: boolean) => void;
    /** Sets thinking block parsing preference */
    setShouldParseThinkingBlock: (parse: boolean) => void;
    /** Sets consensus scores visibility */
    setShowConsensusScores: (show: boolean) => void;
    /** Sets consensus μ threshold */
    setConsensusMuThreshold: (threshold: number) => void;
    /** Sets consensus σ threshold */
    setConsensusSigmaThreshold: (threshold: number) => void;
    /** Sets batch size for model runs */
    setBatchSize: (size: number) => void;
    /** Sets RAG enabled state */
    setRAGEnabled: (enabled: boolean) => void;
}

/**
 * Main application UI and global settings slice managing layout and core configuration.
 */
interface AppSettingsState {
    /** Whether the sidebar is currently open */
    isSidebarOpen: boolean;
    /** Whether the app settings panel is currently open */
    isAppSettingsOpen: boolean;

    /** Sets sidebar visibility state */
    setSidebarOpen: (visible: boolean) => void;
    /** Toggles sidebar open/closed */
    toggleSidebar: () => void;
    /** Sets app settings panel visibility state */
    setAppSettingsOpen: (opened: boolean) => void;
    /** Toggles app settings panel open/closed */
    toggleAppSettings: () => void;

    /** Global system prompt for all model interactions */
    systemPrompt: string;
    /** Updates the system prompt */
    setSystemPrompt: (prompt: string) => void;

    /**
     * Aggregates current settings into project options format
     * @returns Project options object for save/load operations
     */
    getProjectOptions: () => IProjectOptions;

    /**
     * Performs bulk update of multiple settings at once
     * @param settings - Partial settings object to merge with current state
     */
    updateAppSettings: (settings: Partial<AppSettingsStore>) => void;
}

/**
 * Combined store type containing all setting slices.
 */
type AppSettingsStore = AppSettingsState & GeneralSettingsState & ModelOptionsState;

/**
 * Zustand store for managing application-wide settings with localStorage persistence.
 * Combines UI state, model options, and general preferences into a single store.
 *
 * @example
 * ```typescript
 * // Toggle sidebar visibility
 * const { isSidebarOpen, toggleSidebar } = useAppSettingsStore();
 *
 * // Update model options
 * const { setModelOptions } = useAppSettingsStore();
 * setModelOptions({ temperature: 0.7, top_p: 0.9 });
 *
 * // Get project options for saving
 * const { getProjectOptions } = useAppSettingsStore();
 * const options = getProjectOptions();
 * ```
 */
export const useAppSettingsStore = create<AppSettingsStore>()(
    persist(
        (set, get) => ({
            // === UI State ===
            isSidebarOpen: true,
            isAppSettingsOpen: true,
            isGeneralSettingsOpen: true,
            isModelOptionsOpen: false,

            // === App State ===
            systemPrompt: 'You are a helpful assistant.',
            isModelInfoVisible: false,
            timeout: 300000,
            isMarkdownRendered: true,
            shouldParseThinkingBlock: true,
            showConsensusScores: true,
            consensusMuThreshold: 0.7, // μ above 0.7 is good consensus
            consensusSigmaThreshold: 0.2, // σ below 0.2 is good consensus
            batchSize: 1, // Default: no batching
            isRAGEnabled: false, // Default: RAG disabled

            modelOptions: {
                stream: true,
                temperature: 1.0,
                top_p: 1.0,
                seed: undefined,
                presence_penalty: 0,
                frequency_penalty: 0,
            },

            // === UI Actions ===
            setSidebarOpen: (visible) => set({ isSidebarOpen: visible }),
            toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),

            setAppSettingsOpen: (opened) => set({ isAppSettingsOpen: opened }),
            toggleAppSettings: () => set((s) => ({ isAppSettingsOpen: !s.isAppSettingsOpen })),

            setGeneralSettingsOpen: (opened) => set({ isGeneralSettingsOpen: opened }),
            toggleGeneralSettings: () => set((s) => ({ isGeneralSettingsOpen: !s.isGeneralSettingsOpen })),

            setModelOptionsOpen: (opened) => set({ isModelOptionsOpen: opened }),
            toggleModelOptions: () => set((s) => ({ isModelOptionsOpen: !s.isModelOptionsOpen })),

            getProjectOptions: () => {
                return {
                    timeout: get().timeout,
                    markdown: get().isMarkdownRendered,
                    systemPrompt: get().systemPrompt,
                    parseThinkingBlock: get().shouldParseThinkingBlock,
                    showConsensusScores: get().showConsensusScores,
                    consensusMuThreshold: get().consensusMuThreshold,
                    consensusSigmaThreshold: get().consensusSigmaThreshold,
                    batchSize: get().batchSize,
                    modelOptions: get().modelOptions,
                } as IProjectOptions;
            },

            // === State Actions ===
            setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
            setModelInfoVisible: (show) => set({ isModelInfoVisible: show }),
            setTimeout: (timeout) => set({ timeout }),
            setMarkdownRendered: (render) => set({ isMarkdownRendered: render }),
            setShouldParseThinkingBlock: (parse) => set({ shouldParseThinkingBlock: parse }),
            setShowConsensusScores: (show) => set({ showConsensusScores: show }),
            setConsensusMuThreshold: (threshold) => set({ consensusMuThreshold: threshold }),
            setConsensusSigmaThreshold: (threshold) => set({ consensusSigmaThreshold: threshold }),
            setBatchSize: (size) => set({ batchSize: size }),
            setRAGEnabled: (enabled) => set({ isRAGEnabled: enabled }),
            setModelOptions: (options) => set({ modelOptions: options }),

            // === Bulk Update ===
            updateAppSettings: (settings) => set((state) => ({ ...state, ...settings })),
        }),
        {
            name: 'app-settings-store',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
