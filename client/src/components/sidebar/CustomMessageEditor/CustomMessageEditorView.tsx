/**
 * @fileoverview Presentational view component for the custom message editor modal.
 * Renders UI for creating, editing, and managing custom messages with inline validation
 * and dynamic message count adjustment. Delegates all business logic to its container.
 * @module Components.Sidebar.CustomMessageEditor.CustomMessageEditorView
 */

import { ActionIcon, Alert, Badge, Button, Checkbox, Group, Modal, Paper, ScrollArea, Stack, Textarea, TextInput, Tooltip, NumberInput, Text } from '@mantine/core';
import { FaCodeCompare, FaCheck, FaTrash, FaTriangleExclamation } from 'react-icons/fa6';
import { CiEdit } from 'react-icons/ci';

import { ICustomMessage } from '@root/server/src/interfaces';
import { remToPx } from '@/utils';

/**
 * Props for the CustomMessageEditorView component.
 * Contains all state and handlers passed down from the container component.
 */
export interface CustomMessageEditorViewProps {
    // State props
    /** Array of custom messages being edited */
    customMessages: ICustomMessage[];
    /** Current number of message inputs displayed */
    numberOfInputs: string | number;
    /** Whether the modal is currently open */
    isOpen: boolean;
    /** Index of the message currently being edited for label changes */
    editingIndex: number | null;
    /** Current validation error message, if any */
    error: string | null;
    /** Count of messages marked as active/used for comparison */
    activeMessagesCount: number;
    /** Ref for handling clicks outside the label editor */
    clickedOutsideRef: React.RefObject<HTMLDivElement>;

    // Handler props
    /** Updates message content for a specific index */
    onInputChange: (index: number, value: string) => void;
    /** Updates message label for a specific index */
    onLabelChange: (index: number, value: string) => void;
    /** Toggles the used/active state of a message */
    onToggleUsed: (index: number, used: boolean) => void;
    /** Removes a message from the list */
    onDelete: (index: number) => void;
    /** Saves changes and closes the modal */
    onClose: () => void;
    /** Validates and triggers message comparison */
    onCompare: () => void;
    /** Closes modal without saving changes */
    onCancel: () => void;
    /** Clears the current error message */
    onClearError: () => void;
    /** Sets which message label is being edited */
    onSetEditingIndex: (index: number | null) => void;
    /** Updates the number of message inputs */
    onSetNumberOfInputs: (value: string | number) => void;
}

/**
 * Pure presentational component that renders the custom message editor modal.
 * Features dynamic message count adjustment, inline label editing, and real-time validation.
 * Focuses solely on UI rendering while delegating all business logic to its container.
 *
 * @param props - Component props containing state and event handlers
 * @returns Modal component with custom message configuration interface
 */
export const CustomMessageEditorView: React.FC<CustomMessageEditorViewProps> = ({
    // State props
    customMessages,
    numberOfInputs,
    isOpen,
    editingIndex,
    error,
    activeMessagesCount,
    clickedOutsideRef,
    // Handler props
    onInputChange,
    onLabelChange,
    onToggleUsed,
    onDelete,
    onClose,
    onCompare,
    onCancel,
    onClearError,
    onSetEditingIndex,
    onSetNumberOfInputs,
}) => {
    return (
        <Modal
            size="xl"
            opened={isOpen}
            onClose={onClose}
            centered
            title={
                <Group justify="space-between" w="100%">
                    <Text size="lg" fw={500}>
                        Configure Custom Messages
                    </Text>
                    {/* Counter badge showing active messages */}
                    <Badge variant="light" size="lg">
                        {activeMessagesCount} Active
                    </Badge>
                </Group>
            }
        >
            <Stack gap="md" p="md">
                {/* Error alert for validation messages */}
                {error && (
                    <Alert icon={<FaTriangleExclamation size={remToPx(1.2)} />} title="Warning" color="red" variant="light" onClose={onClearError} withCloseButton>
                        {error}
                    </Alert>
                )}

                {/* Control for adding or removing message inputs */}
                <NumberInput
                    label="Number of messages"
                    description="Add or remove message inputs"
                    value={numberOfInputs}
                    min={1}
                    max={50}
                    w="10rem"
                    clampBehavior="strict"
                    onChange={onSetNumberOfInputs}
                />

                {/* Scrollable area containing message inputs */}
                <ScrollArea h="30rem" type="hover" offsetScrollbars mb="lg">
                    <Stack gap="lg">
                        {customMessages.map((item, index) => (
                            <Paper key={index} shadow="sm" p="md" withBorder ref={index === editingIndex ? clickedOutsideRef : undefined}>
                                <Stack gap="xs">
                                    {/* Message header with checkbox, label editor and delete button */}
                                    <Group justify="space-between" align="center">
                                        <Group gap="xs">
                                            {/* Toggle checkbox to activate/deactivate message */}
                                            <Checkbox checked={item.used} onChange={(event) => onToggleUsed(index, event.currentTarget.checked)} />
                                            {/* Inline label editor that switches between view/edit modes */}
                                            {editingIndex === index ? (
                                                <TextInput
                                                    value={item.label}
                                                    onChange={(e) => onLabelChange(index, e.target.value)}
                                                    onBlur={() => onSetEditingIndex(null)}
                                                    autoFocus
                                                    w="15rem"
                                                    maxLength={14}
                                                />
                                            ) : (
                                                <Group gap="xs">
                                                    <Text fw={500}>{item.label}</Text>
                                                    <Tooltip label="Edit label">
                                                        <ActionIcon variant="subtle" onClick={() => onSetEditingIndex(index)}>
                                                            <CiEdit size={remToPx(1.2)} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                </Group>
                                            )}
                                        </Group>
                                        {/* Delete message button */}
                                        <Tooltip label="Delete message">
                                            <ActionIcon color="red" variant="subtle" onClick={() => onDelete(index)}>
                                                <FaTrash size={remToPx(1)} />
                                            </ActionIcon>
                                        </Tooltip>
                                    </Group>

                                    {/* Message content textarea with validation */}
                                    <Textarea
                                        spellCheck={false}
                                        autosize
                                        minRows={3}
                                        maxRows={6}
                                        placeholder="Enter your message here..."
                                        value={item.message}
                                        onChange={(e) => onInputChange(index, e.target.value)}
                                        error={item.used && !item.message.trim() ? 'Message cannot be empty' : null}
                                    />
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                </ScrollArea>

                {/* Action buttons footer */}
                <Paper w="100%" bg="gray.0" p="md" radius="md">
                    <Group justify="space-between" align="center">
                        <Button variant="subtle" color="gray" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Group gap="xs">
                            <Button variant="light" color="blue" onClick={onCompare} leftSection={<FaCodeCompare size={remToPx(1.2)} />}>
                                Compare Messages
                            </Button>
                            <Button variant="filled" onClick={onClose} leftSection={<FaCheck size={remToPx(1.2)} />} gradient={{ from: 'blue', to: 'cyan', deg: 90 }}>
                                Save Changes
                            </Button>
                        </Group>
                    </Group>
                </Paper>
            </Stack>
        </Modal>
    );
};
