/**
 * @fileoverview Pure view component for configuring model-specific parameters in the app settings sidebar.
 * Provides controls for temperature, top_p, penalties, seed, and streaming options with validation and tooltips.
 * @module Components.Sidebar.AppSettings.Panels.ModelOptions
 */

import React from 'react';
import { Stack, Group, Switch, TextInput, Text, Paper, Tooltip, UnstyledButton, Title } from '@mantine/core';
import { FaChevronUp, FaChevronDown, FaInfoCircle } from 'react-icons/fa';

import { IModelOptions } from '@root/server/src/interfaces';

/**
 * Props for the ModelOptions component.
 */
export interface ModelOptionsProps {
    /** Model configuration options */
    modelOptions: IModelOptions;
    /** Callback to update model options */
    setModelOptions: (options: IModelOptions) => void;
    /** Whether the model options panel is expanded */
    isOpen: boolean;
    /** Callback to toggle panel expansion */
    toggleIsOpen: () => void;
}

/**
 * Pure view component that renders model-specific configuration options in a collapsible panel.
 * Handles input validation and clamping for all numerical parameters to ensure valid ranges.
 *
 * @param props - Component props containing model options and handlers
 * @returns Collapsible panel with model configuration controls
 */
export const ModelOptions: React.FC<ModelOptionsProps> = ({ modelOptions, setModelOptions, isOpen, toggleIsOpen }) => {
    /**
     * Toggles streaming mode for chat responses.
     * @param checked - Whether streaming should be enabled
     */
    const handleStreamChange = (checked: boolean) => {
        setModelOptions({
            ...modelOptions,
            stream: checked,
        });
    };

    /**
     * Updates temperature with validation and clamping to 0.0-2.0 range.
     * @param value - Raw input value from text field
     */
    const handleTemperatureChange = (value: string) => {
        const newTemp = Number(value);
        if (isNaN(newTemp)) return;

        const clampedTemp = Math.max(0, Math.min(2, newTemp));
        setModelOptions({
            ...modelOptions,
            temperature: clampedTemp,
        });
    };

    /**
     * Updates top_p with validation and clamping to 0.0-1.0 range.
     * @param value - Raw input value from text field
     */
    const handleTopPChange = (value: string) => {
        const newTopP = Number(value);
        if (isNaN(newTopP)) return;

        const clampedTopP = Math.max(0, Math.min(1, newTopP));
        setModelOptions({
            ...modelOptions,
            top_p: clampedTopP,
        });
    };

    /**
     * Updates frequency penalty with validation and clamping to -2.0 to 2.0 range.
     * @param value - Raw input value from text field
     */
    const handleFrequencyPenaltyChange = (value: string) => {
        const newPenalty = Number(value);
        if (isNaN(newPenalty)) return;

        const clampedPenalty = Math.max(-2, Math.min(2, newPenalty));
        setModelOptions({
            ...modelOptions,
            frequency_penalty: clampedPenalty,
        });
    };

    /**
     * Updates presence penalty with validation and clamping to -2.0 to 2.0 range.
     * @param value - Raw input value from text field
     */
    const handlePresencePenaltyChange = (value: string) => {
        const newPenalty = Number(value);
        if (isNaN(newPenalty)) return;

        const clampedPenalty = Math.max(-2, Math.min(2, newPenalty));
        setModelOptions({
            ...modelOptions,
            presence_penalty: clampedPenalty,
        });
    };

    /**
     * Updates seed value, supporting both integer values and empty state for random seed.
     * @param value - Raw input value from text field
     */
    const handleSeedChange = (value: string) => {
        if (value === '') {
            setModelOptions({
                ...modelOptions,
                seed: undefined,
            });
            return;
        }

        const newSeed = parseInt(value, 10);
        if (isNaN(newSeed)) return;

        setModelOptions({
            ...modelOptions,
            seed: newSeed,
        });
    };

    return (
        <Paper shadow="sm" p="xs" radius="md">
            <Stack gap={0}>
                <UnstyledButton onClick={toggleIsOpen}>
                    <Group align="center">
                        <Title order={4}>Model Options</Title>
                        {isOpen ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                    </Group>
                </UnstyledButton>

                {isOpen && (
                    <Group p={'xs'} grow gap={'2rem'} align="flex-start">
                        <Stack gap={'xs'} pt={'0.4rem'}>
                            <Group align="center" justify="space-between">
                                <Tooltip
                                    label="When enabled, tokens are sent incrementally as they're generated. This creates a typing effect."
                                    position="bottom"
                                    withArrow
                                    multiline
                                    w={220}
                                >
                                    <Group gap="xs">
                                        <Text size="sm">Stream Chat Response</Text>
                                        <FaInfoCircle size={12} style={{ opacity: 0.6 }} />
                                    </Group>
                                </Tooltip>
                                <Switch checked={modelOptions.stream} size="sm" onLabel="ON" offLabel="OFF" onChange={(event) => handleStreamChange(event.currentTarget.checked)} />
                            </Group>
                            <Group align="center" justify="space-between">
                                <Tooltip
                                    label="Controls randomness (0.0-2.0). Higher values produce more random, creative outputs. Lower values make outputs more focused and deterministic."
                                    position="bottom"
                                    withArrow
                                    multiline
                                    w={220}
                                >
                                    <Group gap="xs">
                                        <Text size="sm">temperature</Text>
                                        <FaInfoCircle size={12} style={{ opacity: 0.6 }} />
                                    </Group>
                                </Tooltip>
                                <TextInput
                                    type="number"
                                    min={0}
                                    max={2}
                                    step={0.1}
                                    size="xs"
                                    w={'3rem'}
                                    value={modelOptions.temperature}
                                    onChange={(event) => handleTemperatureChange(event.currentTarget.value)}
                                />
                            </Group>
                            <Group align="center" justify="space-between">
                                <Tooltip
                                    label="Alternative to temperature for controlling randomness (0.0-1.0). Limits token selection to the top percentage of probability mass."
                                    position="bottom"
                                    withArrow
                                    multiline
                                    w={220}
                                >
                                    <Group gap="xs">
                                        <Text size="sm">top_p</Text>
                                        <FaInfoCircle size={12} style={{ opacity: 0.6 }} />
                                    </Group>
                                </Tooltip>
                                <TextInput
                                    size="xs"
                                    w={'3rem'}
                                    type="number"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={modelOptions.top_p}
                                    onChange={(event) => handleTopPChange(event.currentTarget.value)}
                                />
                            </Group>
                        </Stack>
                        <Stack gap={'xs'}>
                            <Group align="center" justify="space-between">
                                <Tooltip
                                    label="Reduces repetition by penalizing tokens based on their frequency (-2.0 to 2.0). Higher values decrease likelihood of frequent tokens."
                                    position="bottom"
                                    withArrow
                                    multiline
                                    w={220}
                                >
                                    <Group gap="xs">
                                        <Text size="sm">frequency_penalty</Text>
                                        <FaInfoCircle size={12} style={{ opacity: 0.6 }} />
                                    </Group>
                                </Tooltip>
                                <TextInput
                                    size="xs"
                                    w={'3rem'}
                                    type="number"
                                    min={-2}
                                    max={2}
                                    step={0.1}
                                    value={modelOptions.frequency_penalty}
                                    onChange={(event) => handleFrequencyPenaltyChange(event.currentTarget.value)}
                                />
                            </Group>
                            <Group align="center" justify="space-between">
                                <Tooltip
                                    label="Reduces repetition by penalizing tokens that have already appeared (-2.0 to 2.0). Higher values decrease likelihood of repeating any token."
                                    position="bottom"
                                    withArrow
                                    multiline
                                    w={220}
                                >
                                    <Group gap="xs">
                                        <Text size="sm">presence_penalty</Text>
                                        <FaInfoCircle size={12} style={{ opacity: 0.6 }} />
                                    </Group>
                                </Tooltip>
                                <TextInput
                                    size="xs"
                                    type="number"
                                    min={-2}
                                    max={2}
                                    step={0.1}
                                    w={'3rem'}
                                    value={modelOptions.presence_penalty}
                                    onChange={(event) => handlePresencePenaltyChange(event.currentTarget.value)}
                                />
                            </Group>
                            <Group align="center" justify="space-between">
                                <Tooltip
                                    label="Sets a specific random seed for deterministic results. Using the same seed with identical inputs produces the same output. Empty means random seed."
                                    position="bottom"
                                    withArrow
                                    multiline
                                    w={220}
                                >
                                    <Group gap="xs">
                                        <Text size="sm">seed</Text>
                                        <FaInfoCircle size={12} style={{ opacity: 0.6 }} />
                                    </Group>
                                </Tooltip>
                                <TextInput
                                    type="number"
                                    step={1}
                                    size="xs"
                                    w={'6rem'}
                                    value={modelOptions.seed !== undefined ? modelOptions.seed : ''}
                                    placeholder="(no seed)"
                                    onChange={(event) => handleSeedChange(event.currentTarget.value)}
                                />
                            </Group>
                        </Stack>
                    </Group>
                )}
            </Stack>
        </Paper>
    );
};
