/**
 * @fileoverview Container component that handles the business logic and state management
 * for individual chat messages. Acts as a wrapper around MessageFactory to provide
 * a clean interface for chat message rendering.
 * @module Components.Main.ChatMessage.ChatMessage
 */

// External dependencies

// Internal dependencies
import { IChatRoleMessage } from '@root/server/src/interfaces/IChatRoleMessage';

import { MessageFactory } from './MessageFactory';

/**
 * Props for the ChatMessage component.
 */
export interface ChatMessageProps {
    /** Whether message interactions should be disabled */
    disabled: boolean;
    /** The chat message containing role and content */
    message: IChatRoleMessage;
    /** Index of the message in the chat sequence */
    index: number;
    /** Whether to render message content as markdown */
    shouldRenderMarkdown: boolean;
    /** Whether to parse and display thinking tokens */
    shouldParseThinking: boolean;
    /** Callback when user clicks to send an edited message */
    onClickSendEdit: (value: string) => void;
    /** Callback when user clicks to delete the message */
    onClickDelete: () => void;
    /** Callback when user clicks to retry message generation */
    onClickRetry: () => void;
    /** Callback when user clicks to evaluate the message */
    onClickEvaluate: () => void;
    /** Similarity matrix for consensus calculation (optional) */
    similarityMatrix?: number[][] | null;
    /** Array of model labels for consensus calculation (optional) */
    modelLabels?: string[] | null;
}

/**
 * Container component that manages state and business logic for a chat message.
 * Delegates rendering to MessageFactory which handles role-specific presentation.
 *
 * @param props - The component props
 * @returns JSX element representing the chat message
 */
export const ChatMessage: React.FC<ChatMessageProps> = ({
    shouldParseThinking,
    message,
    index,
    disabled,
    shouldRenderMarkdown,
    onClickSendEdit,
    onClickDelete,
    onClickRetry,
    onClickEvaluate,
    similarityMatrix,
    modelLabels,
}) => {
    return (
        <MessageFactory
            disabled={disabled}
            message={message}
            index={index}
            shouldParseThinking={shouldParseThinking}
            shouldRenderMarkdown={shouldRenderMarkdown}
            onClickSendEdit={onClickSendEdit}
            onClickDelete={onClickDelete}
            onClickRetry={onClickRetry}
            onClickEvaluate={onClickEvaluate}
            similarityMatrix={similarityMatrix}
            modelLabels={modelLabels}
        />
    );
};
