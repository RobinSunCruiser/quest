/**
 * @fileoverview Presentational view component for the model selection drawer.
 * Renders a hierarchical interface with adapter groups and individual model checkboxes,
 * supporting batch selection and individual model toggles.
 * @module Components.Sidebar.ModelSelectionDrawer.ModelSelectionView
 */

import React from 'react';
import { Group, Text, Badge, ScrollArea, Drawer, Stack, Paper, Checkbox } from '@mantine/core';
import { GroupedModel } from './types';

/**
 * Props for the ModelSelectionView component.
 */
export interface ModelSelectionViewProps {
    /** Controls whether the drawer is open or closed */
    opened: boolean;
    /** Handler called when the drawer should be closed */
    onClose: () => void;
    /** Models grouped by adapter ID for hierarchical display */
    groupedModels: GroupedModel[];
    /** Total count of currently selected models across all adapters */
    selectedCount: number;
    /** Handler for toggling all models within an adapter group */
    onGroupToggle: (adapterID: string, models: GroupedModel['models']) => void;
    /** Handler for toggling individual model selection */
    onModelToggle: (modelId: string) => void;
    /** Function to check if a specific model is currently selected */
    isModelSelected: (modelId: string) => boolean;
}

/**
 * Pure presentational component that renders the model selection drawer interface.
 * Features hierarchical selection with adapter groups, individual model checkboxes,
 * and visual indicators for selection state including indeterminate checkboxes.
 *
 * @param props - Component props containing drawer state and selection handlers
 * @returns Drawer component with grouped model selection interface
 */
export const ModelSelectionView: React.FC<ModelSelectionViewProps> = ({ opened, onClose, groupedModels, selectedCount, onGroupToggle, onModelToggle, isModelSelected }) => {
    return (
        <Drawer opened={opened} position="right" onClose={onClose} size="md" padding="lg">
            {/* Header with title and selection counter */}
            <Group justify="space-between" w="100%" mb="md">
                <Text size="xl" fw={500}>
                    Select Models
                </Text>
                <Badge variant="light" size="lg" radius="lg">
                    {selectedCount} Selected
                </Badge>
            </Group>

            {/* Scrollable content area for adapter groups */}
            <ScrollArea h="calc(100vh - 200px)" type="always" offsetScrollbars="y">
                <Stack gap="md">
                    {groupedModels.map(({ groupID: adapterID, models }) => {
                        // Compute group selection state for checkbox display
                        const selectedModels = models.filter((m) => isModelSelected(m.id));
                        const selectedCount = selectedModels.length;
                        const totalCount = models.length;
                        const allSelected = selectedCount === totalCount;
                        const someSelected = selectedCount > 0;

                        return (
                            <Paper key={adapterID} shadow="sm" p="md" withBorder radius="md">
                                <Stack gap="xs">
                                    {/* Adapter group header with batch selection checkbox */}
                                    <Group gap="xs">
                                        <Checkbox
                                            checked={allSelected}
                                            indeterminate={someSelected && !allSelected}
                                            onChange={() => onGroupToggle(adapterID, models)}
                                            styles={{
                                                input: { cursor: 'pointer' },
                                                label: { cursor: 'pointer' },
                                            }}
                                        />
                                        <Text fw={600} size="lg" c="black">
                                            {adapterID}
                                        </Text>
                                        <Badge size="sm" variant="dot" color="blue">
                                            {selectedCount}/{totalCount} Models
                                        </Badge>
                                    </Group>

                                    {/* Individual model checkboxes indented under group */}
                                    <Stack gap="xs" pl="2rem">
                                        {models.map((model) => (
                                            <Checkbox
                                                key={model.id}
                                                checked={isModelSelected(model.id)}
                                                label={<Text size="sm">{model.model}</Text>}
                                                onChange={() => onModelToggle(model.id)}
                                                styles={{
                                                    input: { cursor: 'pointer' },
                                                    label: { cursor: 'pointer' },
                                                }}
                                            />
                                        ))}
                                    </Stack>
                                </Stack>
                            </Paper>
                        );
                    })}
                </Stack>
            </ScrollArea>
        </Drawer>
    );
};
