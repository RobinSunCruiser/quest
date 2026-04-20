/**
 * @fileoverview General application settings panel for the app settings sidebar.
 * Provides controls for markdown rendering, thinking block parsing, model info display, and request timeout configuration.
 * @module Components.Sidebar.AppSettings.Panels.GeneralSettings
 */

import React from 'react';
import { Paper, Stack, Group, Text, Switch, UnstyledButton, Title, TextInput, NumberInput } from '@mantine/core';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

/**
 * Props for the GeneralSettings component.
 */
export interface GeneralSettingsProps {
    /** Whether markdown rendering is enabled */
    renderMarkdown: boolean;
    /** Callback to toggle markdown rendering */
    setRenderMarkdown: (value: boolean) => void;

    /** Whether thinking block parsing is enabled */
    parseThinkingBlock: boolean;
    /** Callback to toggle thinking block parsing */
    setParseThinkingBlock: (value: boolean) => void;

    /** Whether model info display is enabled */
    showModelInfo: boolean;
    /** Callback to toggle model info display */
    setShowModelInfo: (value: boolean) => void;

    /** Request timeout in milliseconds */
    timeout: number;
    /** Callback to update timeout value */
    setTimeout: (value: number) => void;

    /** Whether consensus scores are shown */
    showConsensusScores: boolean;
    /** Callback to toggle consensus scores display */
    setShowConsensusScores: (value: boolean) => void;

    /** Consensus μ threshold */
    consensusMuThreshold: number;
    /** Callback to update consensus μ threshold */
    setConsensusMuThreshold: (value: number) => void;

    /** Consensus σ threshold */
    consensusSigmaThreshold: number;
    /** Callback to update consensus σ threshold */
    setConsensusSigmaThreshold: (value: number) => void;

    /** Batch size for model runs */
    batchSize: number;
    /** Callback to update batch size */
    setBatchSize: (value: number) => void;

    /** Whether RAG is enabled */
    ragEnabled: boolean;
    /** Callback to toggle RAG */
    setRAGEnabled: (value: boolean) => void;

    /** Whether the settings panel is expanded */
    isOpen: boolean;
    /** Callback to toggle panel expansion */
    toggleIsOpen: () => void;
}

/**
 * Pure view component for general application settings in a collapsible panel.
 * Provides controls for UI rendering options and network configuration without managing internal state.
 *
 * @param props - Component props containing settings values and handlers
 * @returns Collapsible panel with general application settings
 */
export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
    renderMarkdown,
    setRenderMarkdown,
    parseThinkingBlock,
    setParseThinkingBlock,
    showModelInfo,
    setShowModelInfo,
    timeout,
    setTimeout,
    showConsensusScores,
    setShowConsensusScores,
    consensusMuThreshold,
    setConsensusMuThreshold,
    consensusSigmaThreshold,
    setConsensusSigmaThreshold,
    batchSize,
    setBatchSize,
    ragEnabled,
    setRAGEnabled,
    isOpen,
    toggleIsOpen,
}) => {
    /**
     * Handles timeout value changes.
     * @param value - Raw input value from text field
     */
    const handleTimeoutChange = (value: string | number) => {
        const newTimeout = typeof value === 'string' ? Number(value) : value;
        setTimeout(newTimeout);
    };

    /**
     * Handles μ threshold changes with validation and clamping to 0-1 range.
     * @param value - Raw input value from text field
     */
    const handleMuThresholdChange = (value: string | number) => {
        const newThreshold = typeof value === 'string' ? Number(value) : value;
        if (isNaN(newThreshold) || newThreshold < 0 || newThreshold > 1) {
            return;
        }
        setConsensusMuThreshold(newThreshold);
    };

    /**
     * Handles σ threshold changes with validation and clamping to 0-1 range.
     * @param value - Raw input value from text field
     */
    const handleSigmaThresholdChange = (value: string | number) => {
        const newThreshold = typeof value === 'string' ? Number(value) : value;
        if (isNaN(newThreshold) || newThreshold < 0 || newThreshold > 1) {
            return;
        }
        setConsensusSigmaThreshold(newThreshold);
    };

    return (
        <Paper shadow="sm" p="xs" radius="md">
            <Stack gap={0}>
                <UnstyledButton onClick={toggleIsOpen} style={{ cursor: 'pointer' }}>
                    <Group align="center">
                        <Title order={4}>General Settings</Title>
                        {isOpen ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                    </Group>
                </UnstyledButton>

                {isOpen && (
                    <Group p={'xs'} grow gap={'2rem'} align="flex-start">
                        <Stack gap={'0.6rem'} pt={'0.4rem'}>
                            <Group align="center" justify="space-between">
                                <Text size="sm">Render Markdown</Text>
                                <Switch checked={renderMarkdown} size="sm" onLabel="ON" offLabel="OFF" onChange={(event) => setRenderMarkdown(event.currentTarget.checked)} />
                            </Group>
                            <Group align="center" justify="space-between">
                                <Text size="sm">Parse Think Block</Text>
                                <Switch
                                    checked={parseThinkingBlock}
                                    size="sm"
                                    onLabel="ON"
                                    offLabel="OFF"
                                    onChange={(event) => setParseThinkingBlock(event.currentTarget.checked)}
                                />
                            </Group>
                            <Group align="center" justify="space-between">
                                <Text size="sm">Show Consensus Scores</Text>
                                <Switch
                                    checked={showConsensusScores}
                                    size="sm"
                                    onLabel="ON"
                                    offLabel="OFF"
                                    onChange={(event) => setShowConsensusScores(event.currentTarget.checked)}
                                />
                            </Group>

                            <Group align="center" justify="space-between">
                                <Text size="sm">Show Model Info</Text>
                                <Switch checked={showModelInfo} size="sm" onLabel="ON" offLabel="OFF" onChange={(event) => setShowModelInfo(event.currentTarget.checked)} />
                            </Group>
                            <Group align="center" justify="space-between">
                                <Text size="sm">Enable RAG</Text>
                                <Switch checked={ragEnabled} size="sm" onLabel="ON" offLabel="OFF" onChange={(event) => setRAGEnabled(event.currentTarget.checked)} />
                            </Group>
                        </Stack>
                        <Stack gap={'0.4rem'}>
                            <Group align="center" justify="space-between">
                                <Text size="sm">Batch Size</Text>
                                <NumberInput size="xs" w={'3rem'} min={1} max={20} value={batchSize} onChange={(value) => setBatchSize(Number(value) || 1)} />
                            </Group>
                            <Group align="center" justify="space-between">
                                <Text size="sm">Timeout in ms</Text>
                                <TextInput size="xs" w={'6rem'} type="number" min={0} value={timeout} onChange={(event) => handleTimeoutChange(event.currentTarget.value)} />
                            </Group>

                            <Group align="center" justify="space-between">
                                <Text size="sm">μ Threshold</Text>
                                <TextInput
                                    size="xs"
                                    w={'6rem'}
                                    type="number"
                                    min={0}
                                    max={1}
                                    step={0.1}
                                    value={consensusMuThreshold}
                                    onChange={(event) => handleMuThresholdChange(event.currentTarget.value)}
                                />
                            </Group>
                            <Group align="center" justify="space-between">
                                <Text size="sm">σ Threshold</Text>
                                <TextInput
                                    size="xs"
                                    w={'6rem'}
                                    type="number"
                                    min={0}
                                    max={1}
                                    step={0.1}
                                    value={consensusSigmaThreshold}
                                    onChange={(event) => handleSigmaThresholdChange(event.currentTarget.value)}
                                />
                            </Group>
                        </Stack>
                    </Group>
                )}
            </Stack>
        </Paper>
    );
};
