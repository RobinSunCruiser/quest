/**
 * @fileoverview Zustand store for managing chat UI state across multiple models.
 * Handles chat histories, custom messages, loading states, and chat synchronization logic.
 * Uses subscribeWithSelector middleware for reactive state updates.
 *
 * @module Stores.ChatUIStore
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { IChatRoleMessage, ICustomMessage } from '@root/server/src/interfaces';

/**
 * Enumeration of possible loading states for chat operations.
 */
export enum LoadingState {
    /** Operation completed successfully */
    SUCCESS = 'success',
    /** Operation is currently in progress */
    LOADING = 'loading',
    /** Operation failed with an error */
    ERROR = 'error',
}

/**
 * Chat UI store state interface managing multi-model chat interactions.
 */
interface ChatUIState {
    /** Map of chat message histories keyed by model ID */
    chatHistories: Map<string, IChatRoleMessage[]>;
    /** Array of custom/saved messages for quick insertion */
    customMessages: ICustomMessage[];
    /** Map of loading states keyed by model ID */
    loadingStates: Map<string, LoadingState>;
    /** Index of the last synchronized message across all models */
    syncedChatIndex: number;

    // === Basic Actions ===
    /** Sets the complete chat history for a specific model */
    setChatHistory: (modelId: string, messages: IChatRoleMessage[]) => void;
    /** Adds a single message to a model's chat history */
    addMessage: (modelId: string, message: IChatRoleMessage) => void;
    /** Clears all messages for a specific model */
    clearChatHistory: (modelId: string) => void;
    /** Clears all chat histories for all models */
    clearAllChatHistories: () => void;
    /** Sets the loading state for a specific model */
    setLoadingState: (modelId: string, state: LoadingState) => void;
    /** Sets the same loading state for multiple models */
    setLoadingStateForAll: (modelIds: string[], state: LoadingState) => void;
    /** Updates the array of custom messages */
    setCustomMessages: (messages: ICustomMessage[]) => void;
    /** Sets the synchronized chat index */
    setSyncedChatIndex: (index: number) => void;

    // === Computed Getters ===
    /**
     * Gets chat history for a specific model
     * @param modelId - The model identifier
     * @returns Array of chat messages or empty array if none exist
     */
    getChatHistory: (modelId: string) => IChatRoleMessage[];
    /**
     * Gets loading state for a specific model
     * @param modelId - The model identifier
     * @returns Current loading state or SUCCESS if none set
     */
    getLoadingState: (modelId: string) => LoadingState;
    /**
     * Checks if any model is currently loading
     * @returns True if any model has LOADING state
     */
    isAnyLoading: () => boolean;
    /**
     * Gets only the custom messages that have been used
     * @returns Array of custom messages where used=true
     */
    getUsedCustomMessages: () => ICustomMessage[];

    // === Synchronization ===
    /**
     * Finds the last synchronized message index across selected models.
     * Only considers assistant messages as sync points.
     *
     * @param selectedModelIDs - Array of model IDs to check for synchronization
     * @returns Index of last synchronized assistant message, or -1 if none found
     */
    findSyncedIndex: (selectedModelIDs: string[]) => number;
}

/**
 * Zustand store for managing chat UI state with reactive updates.
 * Handles multi-model chat histories, loading states, and message synchronization.
 *
 * @example
 * ```typescript
 * // Add a message to a specific model
 * const { addMessage } = useChatUIStore();
 * addMessage('model-1', { role: 'user', content: 'Hello' });
 *
 * // Check if any model is loading
 * const { isAnyLoading } = useChatUIStore();
 * if (isAnyLoading()) {
 *   console.log('Some models are processing...');
 * }
 *
 * // Find synchronized messages across models
 * const { findSyncedIndex } = useChatUIStore();
 * const syncIndex = findSyncedIndex(['model-1', 'model-2']);
 * ```
 */
export const useChatUIStore = create<ChatUIState>()(
    subscribeWithSelector((set, get) => ({
        chatHistories: new Map(),
        customMessages: [],
        loadingStates: new Map(),
        syncedChatIndex: -1,

        setChatHistory: (modelId, messages) => {
            set((state) => {
                // Deep clone messages to ensure React detects changes
                const clonedMessages = messages.map((msg) => ({ ...msg }));
                return {
                    chatHistories: new Map(state.chatHistories.set(modelId, clonedMessages)),
                };
            });
        },

        addMessage: (modelId, message) => {
            const current = get().getChatHistory(modelId);
            get().setChatHistory(modelId, [...current, message]);
        },

        clearChatHistory: (modelId) => {
            get().setChatHistory(modelId, []);
        },

        clearAllChatHistories: () => {
            set({ chatHistories: new Map() });
        },

        setLoadingState: (modelId, state) => {
            set((prev) => ({
                loadingStates: new Map(prev.loadingStates.set(modelId, state)),
            }));
        },

        setLoadingStateForAll: (modelIds, state) => {
            set((prev) => {
                const newStates = new Map(prev.loadingStates);
                modelIds.forEach((id) => newStates.set(id, state));
                return { loadingStates: newStates };
            });
        },

        setCustomMessages: (messages) => {
            set({ customMessages: messages });
        },

        setSyncedChatIndex: (index) => {
            set({ syncedChatIndex: index });
        },

        getChatHistory: (modelId) => {
            return get().chatHistories.get(modelId) || [];
        },

        getLoadingState: (modelId) => {
            return get().loadingStates.get(modelId) || LoadingState.SUCCESS;
        },

        isAnyLoading: () => {
            return Array.from(get().loadingStates.values()).some((state) => state === LoadingState.LOADING);
        },

        getUsedCustomMessages: () => {
            return get().customMessages.filter((msg) => msg.used);
        },

        findSyncedIndex: (selectedModelIDs) => {
            if (selectedModelIDs.length < 2) return -1;

            const histories = selectedModelIDs.map((id) => get().chatHistories.get(id)).filter((h): h is IChatRoleMessage[] => !!h);

            if (histories.length !== selectedModelIDs.length) return -1;

            const minLength = Math.min(...histories.map((h) => h.length));
            if (minLength <= 1) return -1;

            let lastSyncedIdx = -1;

            for (let i = 1; i < minLength; i++) {
                const ref = histories[0][i];
                // Check if all histories have identical content at this index
                if (histories.every((h) => h[i].content === ref.content)) {
                    // Only track assistant messages as sync points
                    if (ref.role === 'assistant') {
                        lastSyncedIdx = i;
                    }
                } else {
                    break;
                }
            }

            return lastSyncedIdx;
        },
    }))
);
