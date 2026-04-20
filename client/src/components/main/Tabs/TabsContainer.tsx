/**
 * @fileoverview Container component for tab-based model selection interface.
 * Manages tab state, hover interactions, and loading states for selected models.
 * @module Components.Main.Tabs.TabsContainer
 */

import { useEffect, useState } from 'react';
import { Box, Text } from '@mantine/core';
import { useChatUIStore } from '@/stores/chatUIStore';
import { useModelSelectionStore } from '@/stores/modelSelectionStore';
import { usePromptSubmit } from '@/hooks/usePromptSubmit';
import { TabsView } from './TabsView';

/**
 * Container component that manages tab-based model selection interface.
 *
 * Coordinates between model selection store, chat UI state, and tab interactions.
 * Handles tab switching, hover states for abort buttons, and empty state display.
 *
 * @returns JSX element with tabs interface or empty state message
 */
export const TabsContainer: React.FC = () => {
    /**
     * Index of the currently active tab (-1 when no tab is selected)
     */
    const [activeTabIndex, setActiveTabIndex] = useState<number>(0);

    /**
     * Tracks hover states for each model's loading indicator to show abort buttons
     */
    const [isHovering, setIsHovering] = useState<Map<string, boolean>>(new Map());

    const { loadingStates } = useChatUIStore();
    const { selectedModelIDs, setActiveModel, activeModelId } = useModelSelectionStore();
    const { handleAbort: onAbort } = usePromptSubmit();

    /**
     * Handles tab selection changes and updates active model in store.
     *
     * @param value - The model ID of the selected tab, or null to deselect
     */
    const handleTabChange = (value: string | null) => {
        if (value === null) {
            console.log('Active tab: [none]');
            setActiveTabIndex(-1);
            setActiveModel(null);
            return;
        }

        console.log('Active tab model ID:', value);
        setActiveTabIndex(selectedModelIDs.indexOf(value));
        setActiveModel(value);
    };

    /**
     * Synchronizes active tab index when selected models or active model changes
     */
    useEffect(() => {
        if (activeModelId) {
            setActiveTabIndex(selectedModelIDs.indexOf(activeModelId));
        } else {
            setActiveTabIndex(-1);
        }
    }, [selectedModelIDs]);

    /**
     * Handles abort button click for loading models.
     * Clears hover state and triggers abort callback.
     *
     * @param modelID - The ID of the model to abort loading for
     */
    const handleAbort = (modelID: string) => {
        setIsHovering((prev) => new Map(prev.set(modelID, false)));
        onAbort(modelID);
    };

    /**
     * Sets hover state to show abort button for loading models.
     *
     * @param modelID - The ID of the model being hovered
     */
    const handleMouseEnter = (modelID: string) => {
        setIsHovering((prev) => new Map(prev.set(modelID, true)));
    };

    /**
     * Clears hover state to hide abort button.
     *
     * @param modelID - The ID of the model no longer being hovered
     */
    const handleMouseLeave = (modelID: string) => {
        setIsHovering((prev) => new Map(prev.set(modelID, false)));
    };

    // Guard clause: show empty state when no models are selected
    if (selectedModelIDs.length === 0) {
        return (
            <Box mt="lg">
                <Text size="md" fw={500}>
                    No models selected. Please select a model to start chatting.
                </Text>
            </Box>
        );
    }

    return (
        <TabsView
            selectedModels={selectedModelIDs}
            activeTabIndex={activeTabIndex}
            states={loadingStates}
            isHovering={isHovering}
            onTabChange={handleTabChange}
            onAbort={handleAbort}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        />
    );
};
