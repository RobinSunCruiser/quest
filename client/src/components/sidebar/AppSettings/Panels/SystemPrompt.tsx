/**
 * @fileoverview System prompt configuration component for the app settings sidebar.
 * Provides an auto-resizing textarea for editing system instructions that control AI model behavior.
 * @module Components.Sidebar.AppSettings.Panels.SystemPrompt
 */

import { Paper, Stack, Textarea, Title } from '@mantine/core';
import { useEffect, useState } from 'react';

/**
 * Props for the SystemPrompt component.
 */
export interface SystemPromptProps {
    /** The current system prompt value to display */
    systemPrompt: string;
    /** Callback triggered when the system prompt changes */
    onSystemPromptChange: (prompt: string) => void;
}

/**
 * Component for editing system prompts that define AI model behavior and context.
 * Features auto-resizing textarea with state synchronization between local and parent state.
 *
 * @param props - Component props
 * @returns Paper-wrapped system prompt editor with title and textarea
 *
 * @example
 * ```tsx
 * const [systemPrompt, setSystemPrompt] = useState("You are a helpful AI assistant.");
 *
 * const handleSystemPromptChange = (prompt: string) => {
 *     setSystemPrompt(prompt);
 *     updateModelBehavior(prompt);
 * };
 *
 * <SystemPrompt
 *     systemPrompt={systemPrompt}
 *     onSystemPromptChange={handleSystemPromptChange}
 * />
 * ```
 */
export const SystemPrompt: React.FC<SystemPromptProps> = ({ systemPrompt, onSystemPromptChange }) => {
    /** Local state to manage the textarea value */
    const [prompt, setPrompt] = useState<string>(systemPrompt);

    /**
     * Handles textarea changes and notifies parent component.
     * @param event - The change event from the textarea
     */
    const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newPrompt = event.target.value;
        setPrompt(newPrompt);
        onSystemPromptChange(newPrompt);
    };

    /**
     * Synchronizes local state with prop changes to ensure textarea reflects current value.
     */
    useEffect(() => {
        setPrompt(systemPrompt);
    }, [systemPrompt]);

    return (
        <Paper shadow="sm" p="xs" radius="md">
            <Stack gap="xs">
                <Title order={4}>System Prompt</Title>
                <Textarea
                    spellCheck={false}
                    size="sm"
                    autosize
                    minRows={4}
                    maxRows={6}
                    radius="lg"
                    value={prompt}
                    onChange={handleTextChange}
                    placeholder="Enter system instructions for the AI model..."
                    aria-label="System prompt editor"
                />
            </Stack>
        </Paper>
    );
};
