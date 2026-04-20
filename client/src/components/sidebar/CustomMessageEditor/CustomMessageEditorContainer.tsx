/**
 * @fileoverview Container component for the custom message editor modal.
 * Manages local editing state, validation, and synchronization with the chat store.
 * Handles message creation, editing, deletion, and comparison workflows.
 * @module Components.Sidebar.CustomMessageEditor.CustomMessageEditorContainer
 */

import { useClickOutside } from '@mantine/hooks';
import { useEffect, useState } from 'react';

import { ICustomMessage } from '@root/server/src/interfaces';
import { CustomMessageEditorView } from './CustomMessageEditorView';
import { useChatUIStore } from '@/stores/chatUIStore';

/**
 * Props for the CustomMessageEditorContainer component.
 */
export interface CustomMessageEditorContainerProps {
    /**
     * Callback function triggered when user chooses to compare selected messages.
     * @param messages - Array of custom messages to be compared
     */
    onDirectCompare: (messages: ICustomMessage[]) => void;

    /**
     * Controls whether the modal is open or closed.
     */
    opened: boolean;

    /**
     * Callback function triggered when the modal is closed.
     */
    onClose: () => void;
}

/**
 * Container component that manages custom message editing workflow.
 * Maintains local working state separate from the store until changes are saved or cancelled.
 * Provides validation for message content and comparison requirements.
 *
 * @param props - Component props containing modal state and event handlers
 * @returns Rendered CustomMessageEditorView with managed state and handlers
 */
export const CustomMessageEditorContainer: React.FC<CustomMessageEditorContainerProps> = ({ onDirectCompare, opened, onClose }) => {
    // Get messages and actions from store
    const { customMessages, setCustomMessages } = useChatUIStore();

    // Local UI state for editing workflow
    const [workingMessages, setWorkingMessages] = useState<ICustomMessage[]>([]);
    const [numberOfInputs, setNumberOfInputs] = useState<string | number>(1);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    /**
     * Initializes working messages from store when modal opens.
     * Creates a default message if none exist in the store.
     */
    useEffect(() => {
        if (opened) {
            const initialMessages = customMessages.length > 0 ? customMessages : [{ label: 'Message 1', message: '', used: false, edited: false }];
            setWorkingMessages(initialMessages);
            setNumberOfInputs(initialMessages.length);
            setError(null);
        }
    }, [opened, customMessages]);

    /**
     * Dynamically adjusts the message array when the number of inputs changes.
     * Adds new empty messages or removes excess ones to match the desired count.
     */
    useEffect(() => {
        const newCount = parseInt(numberOfInputs as string);
        if (newCount > workingMessages.length) {
            // Add new empty message entries
            setWorkingMessages((prev) => [
                ...prev,
                ...Array(newCount - prev.length)
                    .fill(null)
                    .map((_, i) => ({
                        label: `Message ${prev.length + i + 1}`,
                        message: '',
                        used: false,
                        edited: false,
                    })),
            ]);
        } else if (newCount < workingMessages.length) {
            // Remove excess message entries
            setWorkingMessages((prev) => prev.slice(0, newCount));
        }
    }, [numberOfInputs, workingMessages.length]);

    /**
     * Validates that all active messages have content before closing the modal.
     * @returns True if validation passes, false otherwise
     */
    const validateBeforeClose = () => {
        const emptyMessages = workingMessages.filter((msg) => msg.used && !msg.message.trim());
        if (emptyMessages.length > 0) {
            setError('Some active messages have no content. Please add content or uncheck them.');
            return false;
        }
        setError(null);
        return true;
    };

    /**
     * Validates that at least 2 active messages with content exist for comparison.
     * @returns True if validation passes, false otherwise
     */
    const validateCompare = () => {
        const activeMessages = workingMessages.filter((msg) => msg.used);
        if (activeMessages.length < 2) {
            setError('Please select at least 2 messages to compare');
            return false;
        }
        const emptyMessages = activeMessages.filter((msg) => !msg.message.trim());
        if (emptyMessages.length > 0) {
            setError('All selected messages must have content');
            return false;
        }
        setError(null);
        return true;
    };

    // Click outside handler for label editing
    const clickedOutsideRef = useClickOutside(() => {
        setEditingIndex(null);
        validateBeforeClose();
    });

    /**
     * Updates the message content for a specific message index.
     */
    const handleInputChange = (index: number, value: string) => {
        setWorkingMessages((prev) => prev.map((item, i) => (i === index ? { ...item, message: value } : item)));
        setError(null);
    };

    /**
     * Updates the label for a specific message, truncated to 13 characters.
     */
    const handleLabelChange = (index: number, value: string) => {
        const truncatedValue = value.slice(0, 13);
        setWorkingMessages((prev) => prev.map((item, i) => (i === index ? { ...item, label: truncatedValue } : item)));
    };

    /**
     * Toggles the used state of a message for comparison inclusion.
     */
    const handleToggleUsed = (index: number, used: boolean) => {
        setWorkingMessages((prev) => prev.map((msg, i) => (i === index ? { ...msg, used } : msg)));
        setError(null);
    };

    /**
     * Removes a message from the working array and updates the input count.
     */
    const handleDelete = (index: number) => {
        setWorkingMessages((prev) => prev.filter((_, i) => i !== index));
        setNumberOfInputs((prev) => Math.max(1, Number(prev) - 1));
        setError(null);
    };

    /**
     * Saves working messages to store and closes modal if validation passes.
     */
    const handleClose = () => {
        if (validateBeforeClose()) {
            setCustomMessages(workingMessages);
            onClose();
        }
    };

    /**
     * Validates, saves messages to store, triggers comparison, and closes modal.
     */
    const handleCompare = () => {
        if (validateCompare()) {
            setCustomMessages(workingMessages);
            onDirectCompare(workingMessages);
            onClose();
        }
    };

    /**
     * Closes modal without saving changes to the store.
     */
    const handleCancel = () => {
        onClose();
    };

    /**
     * Clears the current error message.
     */
    const handleClearError = () => {
        setError(null);
    };

    // Calculate active messages count for UI display
    const activeMessagesCount = workingMessages.filter((m) => m.used).length;

    return (
        <CustomMessageEditorView
            // State
            customMessages={workingMessages}
            numberOfInputs={numberOfInputs}
            isOpen={opened}
            editingIndex={editingIndex}
            error={error}
            activeMessagesCount={activeMessagesCount}
            clickedOutsideRef={clickedOutsideRef}
            // Handlers
            onInputChange={handleInputChange}
            onLabelChange={handleLabelChange}
            onToggleUsed={handleToggleUsed}
            onDelete={handleDelete}
            onClose={handleClose}
            onCompare={handleCompare}
            onCancel={handleCancel}
            onClearError={handleClearError}
            onSetEditingIndex={setEditingIndex}
            onSetNumberOfInputs={setNumberOfInputs}
        />
    );
};
