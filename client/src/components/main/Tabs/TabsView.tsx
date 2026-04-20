/**
 * @fileoverview Pure presentation component for tabbed model selection interface.
 * Renders tabs with model IDs and interactive status indicators for loading states.
 * @module Components.Main.Tabs.TabsView
 */

import { ActionIcon, Center, Group, Loader, Space, Stack, Tabs, ScrollArea, Text, Tooltip } from '@mantine/core';
import { FaCircleCheck, FaRegCircleStop } from 'react-icons/fa6';
import { MdError } from 'react-icons/md';
import { remToPx } from '@/utils';
import { LoadingState } from '@/stores/chatUIStore';
import { BATCH_SUFFIX_PATTERN } from '@/stores/modelSelectionStore';

/**
 * Props for the TabsView component.
 */
export interface TabsViewProps {
    /**
     * The sorted list of selected model IDs.
     */
    selectedModels: string[];

    /**
     * The index of the currently active tab.
     */
    activeTabIndex: number;

    /**
     * A map containing the loading state of each model, keyed by model ID.
     */
    states: Map<string, LoadingState>;

    /**
     * A map tracking hover states for each model.
     */
    isHovering: Map<string, boolean>;

    /**
     * Callback function triggered when a tab is selected or deselected.
     * @param value - The model ID of the selected tab, or `null` if no tab is selected.
     */
    onTabChange: (value: string | null) => void;

    /**
     * Callback function triggered when the abort button is clicked.
     * @param modelID - The ID of the model whose loading should be aborted.
     */
    onAbort: (modelID: string) => void;

    /**
     * Callback function triggered when mouse enters a model's loading indicator.
     * @param modelID - The ID of the model being hovered.
     */
    onMouseEnter: (modelID: string) => void;

    /**
     * Callback function triggered when mouse leaves a model's loading indicator.
     * @param modelID - The ID of the model no longer being hovered.
     */
    onMouseLeave: (modelID: string) => void;
}

/**
 * Pure view component for displaying a tabbed interface with model status indicators.
 *
 * Each tab shows a model ID with an interactive status icon (loading spinner, success checkmark,
 * or error indicator). Loading models display an abort button on hover.
 *
 * @param props - Component props
 * @returns JSX element rendering the tabbed interface
 */
export const TabsView: React.FC<TabsViewProps> = ({ selectedModels, activeTabIndex, states, isHovering, onTabChange, onAbort, onMouseEnter, onMouseLeave }) => {
    /**
     * Renders the appropriate status indicator based on model loading state.
     * Loading state shows spinner/abort button, error shows red icon, success shows green checkmark.
     *
     * @param modelID - The ID of the model to render status for
     * @returns JSX element representing the model's current status
     */
    const renderStatusIndicator = (modelID: string) => {
        const loadingState = states.get(modelID);

        if (loadingState === LoadingState.LOADING) {
            return (
                <Group
                    gap={0}
                    onMouseEnter={() => onMouseEnter(modelID)}
                    onMouseLeave={() => onMouseLeave(modelID)}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                >
                    <Space w="0.5rem" m={0} />
                    {isHovering.get(modelID) ? (
                        <Tooltip label="Abort the request" position="top" withArrow>
                            <ActionIcon component="span" variant="subtle" size={'sm'} color="red" radius={'xl'} onClick={() => onAbort(modelID)}>
                                <FaRegCircleStop size={remToPx(2)} />
                            </ActionIcon>
                        </Tooltip>
                    ) : (
                        <Loader size={remToPx(1.1)} type="dots" m={0} p={0} />
                    )}
                </Group>
            );
        }

        if (loadingState === LoadingState.ERROR) {
            return (
                <Group gap={0}>
                    <Space w="0.5rem" m={0} />
                    <MdError size={remToPx(1.2)} color="#FA5252" />
                </Group>
            );
        }

        // Default to SUCCESS state
        return (
            <Group gap={0}>
                <Space w="0.5rem" m={0} />
                <FaCircleCheck size={remToPx(1)} color="green" />
            </Group>
        );
    };

    // Handle empty selection case
    if (selectedModels.length === 0) {
        return null;
    }

    // Group models by parent model ID (extract base model from batch models)
    const modelGroups = new Map<string, string[]>();

    selectedModels.forEach((modelID) => {
        // Extract parent model ID (strip batch suffix if present)
        const parentId = modelID.replace(BATCH_SUFFIX_PATTERN, '');

        // Add to group
        if (!modelGroups.has(parentId)) {
            modelGroups.set(parentId, []);
        }
        modelGroups.get(parentId)!.push(modelID);
    });

    // Get unique parent models (in order of first appearance in selectedModels)
    const parentModels: string[] = [];
    selectedModels.forEach((modelID) => {
        const parentId = modelID.replace(BATCH_SUFFIX_PATTERN, '');
        if (!parentModels.includes(parentId)) {
            parentModels.push(parentId);
        }
    });

    // Determine which parent model is currently active
    const currentModelID = selectedModels[activeTabIndex];
    if (!currentModelID) {
        return null;
    }
    const currentParentID = currentModelID.replace(BATCH_SUFFIX_PATTERN, '');

    // Get batch runs for the currently selected parent
    const currentBatchRuns = modelGroups.get(currentParentID) || [];
    const hasBatchRuns = currentBatchRuns.length > 1;

    return (
        <Stack gap={0}>
            {/* First level: Parent model tabs */}
            <Tabs
                variant="outline"
                value={currentParentID}
                onChange={(value) => {
                    if (value) {
                        // When switching parent models, select the first run of that model
                        const firstRunOfModel = modelGroups.get(value)?.[0];
                        if (firstRunOfModel) {
                            onTabChange(firstRunOfModel);
                        }
                    }
                }}
            >
                <ScrollArea
                    offsetScrollbars
                    type="always"
                    scrollbars="x"
                    style={{
                        width: '100%',
                        overflowY: 'hidden',
                    }}
                >
                    <Tabs.List style={{ flexWrap: 'nowrap', minWidth: 'max-content' }}>
                        {parentModels.map((parentId) => {
                            const runs = modelGroups.get(parentId) || [];
                            // Use the first run's status for the parent tab indicator
                            const firstRunId = runs[0];

                            return (
                                <Tabs.Tab key={parentId} value={parentId} px={5} py={5} style={{ flexShrink: 0 }}>
                                    <Stack gap={0}>
                                        <Center>
                                            <Text fz={15} truncate style={{ maxWidth: 'auto' }}>
                                                {parentId}
                                            </Text>
                                            {renderStatusIndicator(firstRunId)}
                                        </Center>
                                    </Stack>
                                </Tabs.Tab>
                            );
                        })}
                    </Tabs.List>
                </ScrollArea>
            </Tabs>

            {/* Second level: Batch run tabs (only shown if current model has multiple runs) */}
            {hasBatchRuns && (
                <Tabs variant="outline" value={currentModelID} onChange={onTabChange}>
                    <ScrollArea
                        offsetScrollbars
                        type="always"
                        scrollbars="x"
                        style={{
                            width: '100%',
                            overflowY: 'hidden',
                        }}
                    >
                        <Tabs.List style={{ flexWrap: 'nowrap', minWidth: 'max-content' }}>
                            {currentBatchRuns.map((modelID, index) => (
                                <Tabs.Tab key={modelID} value={modelID} px={5} py={5} style={{ flexShrink: 0 }}>
                                    <Stack gap={0}>
                                        <Center>
                                            <Text fz={13} truncate>
                                                Run {index + 1}
                                            </Text>
                                            {renderStatusIndicator(modelID)}
                                        </Center>
                                    </Stack>
                                </Tabs.Tab>
                            ))}
                        </Tabs.List>
                    </ScrollArea>
                </Tabs>
            )}
        </Stack>
    );
};
