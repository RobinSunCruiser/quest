/**
 * @fileoverview Factory component for rendering chat messages based on their role type.
 * Maps message roles to their corresponding React components in the chat interface.
 * @module Components.Main.ChatMessage.MessageFactory
 */

import { IChatRoleMessage } from '@root/server/src/interfaces';
import { UserChatMessage } from './UserChatMessage';
import { AssitantChatMessage } from './AssistantChatMessage';

/**
 * Props for the MessageFactory component.
 */
interface MessageFactoryProps {
    /** The chat message containing role and content */
    message: IChatRoleMessage;
    /** Whether message interactions should be disabled */
    disabled: boolean;
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
 * Factory component that renders the appropriate message component based on the message role.
 * Supports user and assistant messages, with system messages reserved for future implementation.
 *
 * @param props - The component props
 * @returns The rendered message component or null if role is unsupported
 */
export const MessageFactory: React.FC<MessageFactoryProps> = ({ message, ...props }) => {
    const componentMap = {
        user: UserChatMessage,
        assistant: AssitantChatMessage,
        system: null, // or SystemChatMessage if needed
    };

    const Component = componentMap[message.role as keyof typeof componentMap];

    if (!Component) {
        return null;
    }

    return <Component message={message} {...props} />;
};
