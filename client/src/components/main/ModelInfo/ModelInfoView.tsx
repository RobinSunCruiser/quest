/**
 * @fileoverview Compact presentation component for displaying model information.
 * Shows all IModelInfo and IModelMetadata standard fields, with filterable dynamic metadata.
 * Standard fields are always present (may be undefined), while dynamic fields are only present when set.
 * @module Components.Main.ModelInfo.ModelInfoView
 */

import { ActionIcon, Badge, Box, Divider, Group, Menu, ScrollArea, Text } from '@mantine/core';
import { IModelInfo } from '@root/server/src/interfaces/IModelInfo';
import { useMemo, useState } from 'react';
import { MdContentCopy, MdSettings, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { usePersistedState } from '@/hooks';
import { showNotification } from '@/utils';

/**
 * Props for the ModelInfoView component.
 */
export interface ModelInfoViewProps {
    /** The model information to display */
    model: IModelInfo | undefined;
}

/**
 * Format a metadata value for display
 *
 * @param value - The value to format
 * @returns Formatted string representation
 */
const formatMetadataValue = (value: any): string => {
    if (value === undefined || value === null) {
        return 'null';
    }
    if (Array.isArray(value)) {
        return value.join(', ');
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    if (typeof value === 'number' && value > 1000) {
        return value.toLocaleString();
    }
    return String(value);
};

/**
 * Compact view component that renders model information as key-value pairs.
 *
 * Features:
 * - Always displays all IModelInfo fields
 * - Always displays all IModelMetadata standard fields (even if undefined)
 * - Filterable dynamic metadata fields via settings menu
 * - Click to copy values
 *
 * Standard fields are detected by the fact that they're always present in the metadata object,
 * while dynamic fields are only added when they have actual values.
 */
export const ModelInfoView: React.FC<ModelInfoViewProps> = ({ model }) => {
    // Persisted state for visible dynamic metadata fields
    const [visibleDynamicFields, setVisibleDynamicFields] = usePersistedState<string[]>(
        'modelInfo.visibleDynamicFields',
        []
    );

    // Persisted state for showing/hiding model info and standard metadata sections
    const [showModelInfo, setShowModelInfo] = usePersistedState<boolean>('modelInfo.showModelInfo', true);
    const [showStandardMetadata, setShowStandardMetadata] = usePersistedState<boolean>('modelInfo.showStandardMetadata', true);

    const [showSettings, setShowSettings] = useState(false);

    // Extract all fields, separating standard metadata from dynamic metadata
    const { modelInfoEntries, standardMetadataEntries, dynamicMetadataEntries } = useMemo(() => {
        if (!model || !model.metadata) {
            return {
                modelInfoEntries: [],
                standardMetadataEntries: [],
                dynamicMetadataEntries: [],
            };
        }

        const modelInfoEntries: Array<[string, any]> = [];
        const standardMetadataEntries: Array<[string, any]> = [];
        const dynamicMetadataEntries: Array<[string, any]> = [];

        // Model info fields - these are the top-level IModelInfo properties
        const modelInfoKeys = ['id', 'model', 'baseUrl', 'provider', 'adapterID'];
        modelInfoKeys.forEach((key) => {
            modelInfoEntries.push([key, model[key as keyof IModelInfo]]);
        });

        // Standard metadata fields are those defined in IModelMetadata interface
        // These are: family, parameterSize, quantization, contextLength, tokenizerGgmlModel, template
        // Always show these fields even if null/undefined
        const standardMetadataKeys = [
            'family',
            'parameterSize',
            'quantization',
            'contextLength',
            'tokenizerGgmlModel',
            'template'
        ];

        // Add all standard fields (even if null/undefined)
        standardMetadataKeys.forEach((key) => {
            const value = model.metadata[key];
            standardMetadataEntries.push([key, value]);
        });

        // Get all metadata keys for dynamic fields
        const allMetadataKeys = Object.keys(model.metadata);

        // Add dynamic fields (everything except standard fields)
        allMetadataKeys.forEach((key) => {
            if (!standardMetadataKeys.includes(key)) {
                const value = model.metadata[key];
                dynamicMetadataEntries.push([key, value]);
            }
        });

        return {
            modelInfoEntries,
            standardMetadataEntries,
            dynamicMetadataEntries,
        };
    }, [model]);

    // Get all available dynamic field keys
    const availableDynamicFields = useMemo(() => {
        return dynamicMetadataEntries.map(([key]) => key).sort();
    }, [dynamicMetadataEntries]);

    // Initialize visible dynamic fields with all fields on first load ONLY if never set before
    // Don't auto-reinitialize if user explicitly hid all fields
    useMemo(() => {
        // Only initialize if we have fields AND the persisted state has never been set (is empty array by default)
        const isDefaultState = visibleDynamicFields.length === 0;
        const hasFields = availableDynamicFields.length > 0;

        // Check if user has interacted with settings - if localStorage has the key, user has made choices
        const hasUserPreference = localStorage.getItem('modelInfo.visibleDynamicFields') !== null;

        if (isDefaultState && hasFields && !hasUserPreference) {
            setVisibleDynamicFields(availableDynamicFields);
        }
    }, [availableDynamicFields, visibleDynamicFields.length, setVisibleDynamicFields]);

    // Create display entries
    const displayFields = useMemo(() => {
        const fields: Array<{ key: string; value: string; rawValue: any }> = [];

        // Add model info fields (if visible)
        if (showModelInfo) {
            modelInfoEntries.forEach(([key, value]) => {
                fields.push({
                    key,
                    value: formatMetadataValue(value),
                    rawValue: value,
                });
            });
        }

        // Add standard metadata fields (if visible)
        if (showStandardMetadata) {
            standardMetadataEntries.forEach(([key, value]) => {
                fields.push({
                    key,
                    value: formatMetadataValue(value),
                    rawValue: value,
                });
            });
        }

        // Add visible dynamic metadata fields
        dynamicMetadataEntries
            .filter(([key]) => visibleDynamicFields.includes(key))
            .forEach(([key, value]) => {
                fields.push({
                    key,
                    value: formatMetadataValue(value),
                    rawValue: value,
                });
            });

        return fields;
    }, [modelInfoEntries, standardMetadataEntries, dynamicMetadataEntries, visibleDynamicFields, showModelInfo, showStandardMetadata]);

    if (!model) return null;

    const toggleFieldVisibility = (fieldKey: string, event: React.MouseEvent) => {
        event.stopPropagation();
        setVisibleDynamicFields((prev) =>
            prev.includes(fieldKey) ? prev.filter((k) => k !== fieldKey) : [...prev, fieldKey]
        );
    };

    const showAllFields = () => {
        setVisibleDynamicFields(availableDynamicFields);
        setShowSettings(false);
    };

    const hideAllFields = () => {
        setVisibleDynamicFields([]);
        setShowSettings(false);
    };

    const copyToClipboard = (key: string, value: string, rawValue: any) => {
        const textToCopy = typeof rawValue === 'object' ? JSON.stringify(rawValue, null, 2) : String(rawValue);

        navigator.clipboard
            .writeText(textToCopy)
            .then(() => {
                showNotification({
                    title: 'Copied to clipboard',
                    message: `${key}: ${value}`,
                    type: 'success',
                    icon: <MdContentCopy />,
                    color: 'blue',
                    autoClose: 8000,
                });
            })
            .catch((error) => {
                showNotification({
                    title: 'Failed to copy',
                    message: 'Could not copy to clipboard',
                    type: 'error',
                    autoClose: 4000,
                });
                console.error('Failed to copy to clipboard:', error);
            });
    };

    return (
        <>
            <Box>
                <Group justify="space-between" align="flex-start" mb="xs" wrap="nowrap">
                    <Box style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        {model.metadataLoading ? (
                            <Group gap="xs" align="flex-start">
                                <Badge
                                    variant="light"
                                    color="blue"
                                    size="sm"
                                    style={{ cursor: 'default' }}
                                >
                                    Loading metadata...
                                </Badge>
                            </Group>
                        ) : displayFields.length > 0 ? (
                            <Group gap="xs" align="flex-start">
                                {displayFields.map(({ key, value, rawValue }) => (
                                    <Group key={key} gap={4} wrap="nowrap">
                                        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                                            {key}:
                                        </Text>
                                        <Badge
                                            variant="light"
                                            size="sm"
                                            onClick={() => copyToClipboard(key, value, rawValue)}
                                            style={{
                                                textTransform: 'none',
                                                maxWidth: '150px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <Text size="xs" truncate>
                                                {value}
                                            </Text>
                                        </Badge>
                                    </Group>
                                ))}
                            </Group>
                        ) : (
                            <Text size="xs" c="dimmed" ta="center">
                                No fields available
                            </Text>
                        )}
                    </Box>
                    <Menu opened={showSettings} onChange={setShowSettings} position="bottom-end" shadow="md" width={240}>
                        <Menu.Target>
                            <ActionIcon variant="subtle" size="sm" style={{ flexShrink: 0 }}>
                                <MdSettings size={16} />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            {showModelInfo ? (
                                <Menu.Item onClick={() => setShowModelInfo(false)}>
                                    <Text size="xs">Hide Model Info</Text>
                                </Menu.Item>
                            ) : (
                                <Menu.Item onClick={() => setShowModelInfo(true)}>
                                    <Text size="xs">Show Model Info</Text>
                                </Menu.Item>
                            )}

                            {showStandardMetadata ? (
                                <Menu.Item onClick={() => setShowStandardMetadata(false)}>
                                    <Text size="xs">Hide Metadata</Text>
                                </Menu.Item>
                            ) : (
                                <Menu.Item onClick={() => setShowStandardMetadata(true)}>
                                    <Text size="xs">Show Metadata</Text>
                                </Menu.Item>
                            )}

                            {availableDynamicFields.length > 0 && (
                                <>
                                    <Menu.Divider />
                                    <Menu.Label>Dynamic Metadata Fields</Menu.Label>
                                    <ScrollArea h={200}>
                                        {availableDynamicFields.map((fieldKey) => {
                                            const isVisible = visibleDynamicFields.includes(fieldKey);

                                            return (
                                                <Menu.Item
                                                    key={fieldKey}
                                                    leftSection={isVisible ? <MdVisibility size={14} /> : <MdVisibilityOff size={14} />}
                                                    onClick={(event) => toggleFieldVisibility(fieldKey, event)}
                                                    closeMenuOnClick={false}
                                                >
                                                    <Text size="xs">{fieldKey}</Text>
                                                </Menu.Item>
                                            );
                                        })}
                                    </ScrollArea>
                                    <Menu.Divider />
                                    <Menu.Item onClick={showAllFields}>
                                        <Text size="xs">Show All Dynamic Fields</Text>
                                    </Menu.Item>
                                    <Menu.Item onClick={hideAllFields}>
                                        <Text size="xs">Hide All Dynamic Fields</Text>
                                    </Menu.Item>
                                </>
                            )}
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </Box>
            <Divider />
        </>
    );
};
