/**
 * @fileoverview Presentation component for rendering chat conversation history with individual
 * messages and synchronization indicators. Handles empty state display and accessibility features.
 * @module Components.Main.ChatHistory.ChatHistoryView
 */

import { Stack, Text } from '@mantine/core';
import { IChatRoleMessage, ICustomMessage } from '@root/server/src/interfaces';
import React from 'react';
import { ChatMessage } from '../ChatMessage';
import { SyncedChatIndicator } from './SyncedChatIndicator';
import { ActiveCustomMessages } from './ActiveCustomMessages';

/**
 * Props for the ChatHistoryView component.
 */
interface ChatHistoryViewProps {
    /** Whether message interactions should be disabled (e.g., during streaming) */
    disabled: boolean;
    /** CSS width value for the chat container */
    width: string;
    /** Array of chat messages to display */
    messages: IChatRoleMessage[];
    /** Whether to render message content as Markdown */
    shouldRenderMarkdown: boolean;
    /** Whether to parse and display thinking blocks in messages */
    shouldParseThinking: boolean;
    /** Index of the last synchronized message across models */
    syncedChatIndex: number;
    /** Array of active custom messages being used for comparison */
    activeCustomMessages: ICustomMessage[];
    /** Callback when user submits an edited message */
    onClickSendEdit: (index: number, value: string) => void;
    /** Callback when user deletes a message */
    onClickDelete: (index: number) => void;
    /** Callback when user retries message generation */
    onClickRetry: (index: number) => void;
    /** Callback when user requests message evaluation */
    onClickEvaluate: (index: number) => void;
}

/**
 * Renders the chat conversation history with individual messages and sync indicators.
 *
 * Displays messages in chronological order with sync indicators after messages that
 * represent the last synchronized state across multiple models. Shows empty state
 * when no messages are present.
 *
 * @param props - Component configuration and event handlers
 * @returns Rendered chat history with accessibility features
 */
export const ChatHistoryView: React.FC<ChatHistoryViewProps> = ({
    disabled,
    width,
    messages,
    shouldRenderMarkdown,
    shouldParseThinking,
    syncedChatIndex,
    activeCustomMessages,
    onClickSendEdit,
    onClickDelete,
    onClickRetry,
    onClickEvaluate,
}) => {
    return (
        <Stack gap="xs" h={'100%'} w={width} role="log" aria-label="Chat conversation history">
            {/* Show active custom messages indicator at the top */}
            <ActiveCustomMessages activeCustomMessages={activeCustomMessages} />

            {messages.length > 1 ? (
                messages.map((message, index) => (
                    <React.Fragment key={index}>
                        <ChatMessage
                            disabled={disabled}
                            message={message}
                            index={index}
                            shouldRenderMarkdown={shouldRenderMarkdown}
                            shouldParseThinking={shouldParseThinking}
                            onClickSendEdit={(value) => onClickSendEdit(index, value)}
                            onClickDelete={() => onClickDelete(index)}
                            onClickRetry={() => onClickRetry(index)}
                            onClickEvaluate={() => onClickEvaluate(index)}
                        />
                        {syncedChatIndex === index ? <SyncedChatIndicator /> : null}
                    </React.Fragment>
                ))
            ) : (
                <Text c="dimmed" aria-live="polite">
                    This conversation is empty.
                </Text>
            )}
        </Stack>
    );
};
