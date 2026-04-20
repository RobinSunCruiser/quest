/**
 * @fileoverview View component for the prompt input window interface.
 * Renders the prompt textarea and action buttons for sending, clearing, and aborting requests.
 * @module Components.Sidebar.PromptWindow.PromptWindowView
 */

import { ActionIcon, Group, Stack, Textarea, Tooltip, Text } from '@mantine/core';
import { MdSend } from 'react-icons/md';
import { RxCross1 } from 'react-icons/rx';
import { FaRegCircleStop } from 'react-icons/fa6';
import { FaFileAlt } from 'react-icons/fa';
import { remToPx } from '@/utils';

/**
 * Props for the PromptWindowView component.
 */
export interface PromptWindowViewProps {
    /** Current prompt text value */
    prompt: string;
    /** Whether the entire prompt window is disabled */
    disabled: boolean;
    /** Whether the send button should be disabled */
    sendDisabled: boolean;
    /** Whether the abort button should be disabled */
    abortDisabled: boolean;
    /** Whether to use full height layout (affects textarea max rows) */
    fullHeight: boolean;
    /** Whether RAG is enabled and will augment the next prompt */
    ragEnabled: boolean;
    /** Number of documents available for RAG */
    ragDocumentCount: number;
    /** Handler for textarea input changes */
    onTextChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    /** Handler for sending the prompt */
    onSend: () => void;
    /** Handler for aborting all active requests */
    onAbortAll: () => void;
    /** Handler for clearing the prompt text */
    onDelete: () => void;
}

/**
 * Presentation component that renders the prompt input interface with action buttons.
 * Features an auto-sizing textarea with keyboard shortcuts and three action buttons:
 * clear (delete), abort all requests, and send prompt.
 *
 * The textarea supports Enter to send (Shift+Enter for new line) and adjusts height
 * based on the fullHeight prop (8-11 rows vs 8-30 rows).
 *
 * @param props - Component props
 * @returns React functional component for prompt input UI
 */
export const PromptWindowView: React.FC<PromptWindowViewProps> = ({
    prompt,
    disabled,
    sendDisabled,
    abortDisabled,
    fullHeight,
    ragEnabled,
    ragDocumentCount,
    onTextChange,
    onSend,
    onAbortAll,
    onDelete,
}) => {
    return (
        <Stack gap="xs" p="xs">
            <Textarea
                spellCheck={false}
                size="sm"
                autosize
                minRows={8}
                maxRows={fullHeight ? 30 : 11}
                lh={1.5}
                radius="lg"
                placeholder="Input your prompt"
                value={prompt}
                onChange={onTextChange}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        onSend();
                    }
                }}
                aria-label="Prompt input field"
                disabled={disabled}
            />

            <Group justify="space-between" px="1rem">
                <ActionIcon variant="subtle" size="xl" color="blue" onClick={onDelete} aria-label="Clear prompt text">
                    <RxCross1 size={remToPx(2.5)} />
                </ActionIcon>

                {ragEnabled && ragDocumentCount > 0 && (
                    <Group gap="0.4rem">
                        <FaFileAlt size={remToPx(1)} color="#12b886" />
                        <Text size="sm" c="teal.6" fw={500}>
                            RAG active ({ragDocumentCount} {ragDocumentCount === 1 ? 'document' : 'documents'})
                        </Text>
                    </Group>
                )}

                <Group>
                    <Tooltip label="Abort all requests" position="top" withArrow>
                        <ActionIcon disabled={abortDisabled} variant="subtle" size="xl" color="red" onClick={onAbortAll} aria-label="Abort all requests">
                            <FaRegCircleStop size={remToPx(2.5)} />
                        </ActionIcon>
                    </Tooltip>

                    <Tooltip label="Send prompt" position="top" withArrow>
                        <ActionIcon disabled={sendDisabled} variant="subtle" size="xl" color="blue" onClick={onSend} aria-label="Send prompt">
                            <MdSend size={remToPx(2.5)} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>
        </Stack>
    );
};
