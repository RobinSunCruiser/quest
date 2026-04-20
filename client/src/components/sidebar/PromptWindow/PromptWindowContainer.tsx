/**
 * @fileoverview Container component for the prompt input window in the sidebar.
 * Manages prompt text input, submission, and abort functionality for multi-model chat interactions.
 * @module Components.Sidebar.PromptWindow.PromptWindowContainer
 */

import React, { useEffect, useState } from 'react';
import { PromptWindowView } from './PromptWindowView';
import { useChatUIStore } from '@/stores/chatUIStore';
import { useModelSelectionStore } from '@/stores/modelSelectionStore';
import { usePromptSubmit } from '@/hooks/usePromptSubmit';
import { ragService } from '@/services';
import { useAppSettingsStore } from '@/stores/appSettingsStore';

/**
 * Props for the PromptWindowContainerProps component.
 */
export interface PromptWindowContainerProps {
    /** Whether the prompt window should use full height layout */
    fullHeight: boolean;
}

/**
 * Container component that manages prompt input state and coordinates with chat operations.
 * Handles user input validation, submission to multiple models, and abort functionality.
 *
 * The component automatically disables input when no models are selected or when requests
 * are in progress, and manages the visual state of action buttons accordingly.
 *
 * @param props - Component props
 * @returns React functional component for prompt input management
 */
export const PromptWindowContainer: React.FC<PromptWindowContainerProps> = ({ fullHeight }) => {
    const { isAnyLoading } = useChatUIStore();
    const { selectedModelIDs, activeModelId } = useModelSelectionStore();
    const { handleAbort, handlePromptSubmit } = usePromptSubmit();
    const { isRAGEnabled } = useAppSettingsStore();

    // Derive component state from store values
    const anyLoading = isAnyLoading();
    const hasActiveModel = activeModelId !== null;
    const hasSelectedModels = selectedModelIDs.length > 0;

    const disabled = anyLoading || !hasActiveModel || !hasSelectedModels;
    const canAbort = anyLoading && hasActiveModel && hasSelectedModels;

    const [prompt, setPrompt] = useState<string>('');
    const [sendDisabled, setSendDisabled] = useState<boolean>(true);
    const [abortDisabled, setAbortDisabled] = useState<boolean>(!canAbort);
    const [hasFullHeight, setFullHeight] = useState<boolean>(fullHeight);

    /**
     * Handles changes to the prompt textarea input.
     * @param e - The textarea change event
     */
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPrompt(e.target.value);
    };

    /**
     * Submits the current prompt to all selected models and clears the input.
     * Only proceeds if the prompt contains non-whitespace content.
     */
    const handleSend = () => {
        if (!prompt.trim()) return;
        handlePromptSubmit(prompt);
        setPrompt('');
    };

    /**
     * Clears the current prompt text from the input field.
     */
    const handleDelete = () => {
        setPrompt('');
    };

    /**
     * Aborts all active requests for the currently selected models.
     * Iterates through selected model IDs and calls abort for each.
     */
    const handleAbortAll = () => {
        selectedModelIDs.forEach((id: string) => handleAbort(id));
    };

    // Sync abort button state with loading conditions
    useEffect(() => {
        setAbortDisabled(!canAbort);
    }, [canAbort]);

    // Sync height preference with prop changes
    useEffect(() => {
        setFullHeight(fullHeight);
    }, [fullHeight]);

    // Update send button state based on prompt content and general availability
    useEffect(() => {
        setSendDisabled(prompt.trim().length === 0 || disabled);
    }, [prompt, disabled]);

    // Get RAG status
    const ragDocuments = ragService.listDocuments();

    return (
        <PromptWindowView
            prompt={prompt}
            disabled={disabled}
            sendDisabled={sendDisabled}
            abortDisabled={abortDisabled}
            fullHeight={hasFullHeight}
            ragEnabled={isRAGEnabled}
            ragDocumentCount={ragDocuments.length}
            onTextChange={handleTextChange}
            onSend={handleSend}
            onAbortAll={handleAbortAll}
            onDelete={handleDelete}
        />
    );
};
