/**
 * @fileoverview Container component for the chat history interface that manages conversation
 * display between users and AI models. Handles message operations like editing, deletion,
 * retry functionality, and evaluation triggers while maintaining synchronization state across models.
 * @module Components.Main.ChatHistory.ChatHistoryContainer
 */

import React, { useMemo, useCallback } from 'react';
import { useChatUIStore } from '@/stores/chatUIStore';
import { ChatHistoryView } from './ChatHistoryView';
import { useModelSelectionStore, BATCH_SUFFIX_PATTERN } from '@/stores/modelSelectionStore';
import { useChatOperations } from '@/hooks/useChatOperations';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import { llmService } from '@/services';
import { useAutomaticConsensus } from '@/hooks/useAutomaticConsensus';

/**
 * Props for the ChatHistoryContainer component.
 */
export interface ChatHistoryContainerProps {
    /**
     * The width of the chat window container.
     * Accepts CSS width values (e.g., '100%', '500px').
     */
    width: string;

    /**
     * Callback triggered when user clicks the evaluate button on a message.
     * Used to initiate evaluation comparison across all selected models.
     *
     * @param messageIndex - Zero-based index of the message in the chat history
     */
    onClickEvaluate: (messageIndex: number) => void;
}

/**
 * Container component that orchestrates chat history display and message operations.
 *
 * Connects chat state management with the presentation layer, handling:
 * - Message CRUD operations (edit, delete, retry)
 * - Streaming state detection to disable interactions
 * - Synchronization indicators across multiple models
 * - Evaluation triggers for model comparison
 *
 * @param props - Component configuration
 * @returns Rendered chat history interface, or null if no active model
 */
export const ChatHistoryContainer: React.FC<ChatHistoryContainerProps> = ({ width, onClickEvaluate }) => {
    const { chatHistories, syncedChatIndex } = useChatUIStore();
    const { activeModelId } = useModelSelectionStore();
    const { deleteChatMessage, resendChatMessage, resendEditedMessage } = useChatOperations(activeModelId);
    const { shouldParseThinkingBlock, isMarkdownRendered } = useAppSettingsStore();

    // Enable automatic consensus detection and get active custom messages
    const { getActiveCustomMessages } = useAutomaticConsensus();

    // Memoize streaming check to prevent unnecessary recalculations
    const isStreaming = useMemo(() => {
        if (!activeModelId) return false;
        const originalModelId = activeModelId.replace(BATCH_SUFFIX_PATTERN, '');
        return llmService.getSession(activeModelId, originalModelId).isStreaming();
    }, [activeModelId]);

    // Memoize messages to prevent re-renders
    const messages = useMemo(() => {
        return activeModelId ? chatHistories.get(activeModelId) || [] : [];
    }, [activeModelId, chatHistories]);

    // Memoize callbacks to prevent re-creation
    const handleSendEdit = useCallback((index: number, value: string) => {
        resendEditedMessage(index, value);
    }, [resendEditedMessage]);

    const handleDelete = useCallback((index: number) => {
        deleteChatMessage(index);
    }, [deleteChatMessage]);

    if (!activeModelId) return null;

    return (
        <ChatHistoryView
            disabled={isStreaming}
            width={width}
            messages={messages}
            shouldRenderMarkdown={isMarkdownRendered}
            shouldParseThinking={shouldParseThinkingBlock}
            syncedChatIndex={syncedChatIndex}
            activeCustomMessages={getActiveCustomMessages}
            onClickSendEdit={handleSendEdit}
            onClickDelete={handleDelete}
            onClickRetry={resendChatMessage}
            onClickEvaluate={onClickEvaluate}
        />
    );
};
