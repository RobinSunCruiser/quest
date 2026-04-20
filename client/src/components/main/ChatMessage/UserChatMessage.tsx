/**
 * @fileoverview React component for rendering user chat messages with inline editing,
 * deletion, and retry functionality. Part of the chat interface system.
 * @module Components.Main.ChatMessage.UserChatMessage
 */

import { remToPx } from '@/utils';
import { ActionIcon, Blockquote, Button, Card, Collapse, Group, Stack, Text, Textarea, Tooltip } from '@mantine/core';
import { getHotkeyHandler, useDisclosure } from '@mantine/hooks';
import { IChatRoleMessage } from '@root/server/src/interfaces';
import { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaRegEdit, FaFileAlt } from 'react-icons/fa';
import { FaArrowTurnDown, FaRegTrashCan } from 'react-icons/fa6';
import { HiArrowPathRoundedSquare } from 'react-icons/hi2';
import { MdSend } from 'react-icons/md';
import { RxCross1 } from 'react-icons/rx';

/**
 * Props for the UserChatMessage component
 */
interface UserChatMessageProps {
    /** Message index in the chat sequence */
    index: number;
    /** The chat message object containing user content */
    message: IChatRoleMessage;
    /** Whether actions (edit, delete, retry) are disabled */
    disabled: boolean;
    /** Callback triggered when edited message is sent */
    onClickSendEdit: (content: string) => void;
    /** Callback triggered when message deletion is requested */
    onClickDelete: () => void;
    /** Callback triggered when message retry is requested */
    onClickRetry: () => void;
}

/**
 * Chat message component for user messages with inline editing capabilities
 * and action controls for deletion and retry.
 *
 * @param props Component props
 * @returns JSX element representing the user message
 */
export const UserChatMessage: React.FC<UserChatMessageProps> = ({ index, message, disabled, onClickSendEdit, onClickDelete, onClickRetry }) => {
    /** Current content of the message being edited */
    const [editedMessage, setEditedMessage] = useState(message.content);
    /** Whether the message is currently in edit mode */
    const [isEdited, setIsEdited] = useState(false);
    /** Controls RAG content visibility */
    const [isRAGContentOpen, { toggle: toggleRAGContent }] = useDisclosure();

    /**
     * Updates the edited message content as user types
     */
    const onTextAreaContentChanged = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = event.currentTarget.value;
        setEditedMessage(newContent);
    };

    /**
     * Toggles edit mode and resets edited content when entering edit mode
     */
    const onClickEdit = () => {
        setIsEdited((prev) => {
            if (!prev) {
                setEditedMessage(message.content);
            }
            return !prev;
        });
    };

    /**
     * Sends the edited message and exits edit mode
     */
    const onEnterKeyDown = () => {
        setIsEdited(false);
        onClickSendEdit(editedMessage);
    };

    /**
     * Clears the current edit content
     */
    const onClickClearEdit = () => {
        setEditedMessage('');
    };

    /**
     * Handles retry action and exits edit mode
     */
    const handleClickRetry = () => {
        setIsEdited(false);
        onClickRetry();
    };

    /**
     * Handles delete action and exits edit mode
     */
    const handleClickDelete = () => {
        setIsEdited(false);
        onClickDelete();
    };

    /**
     * Handles send button click in edit mode
     */
    const handleClickSend = () => {
        onEnterKeyDown();
    };

    return (
        <Stack gap={0} key={index}>
            <Group m={0} p={0} gap={'0.5rem'}>
                <Text fw="700" pl="0.5rem" fz={14}>
                    User
                </Text>
            </Group>
            <Group justify="space-between">
                <Card flex={1} shadow="lg" radius="md" bg="white" withBorder>
                    {isEdited ? (
                        <>
                            <Textarea
                                h="auto"
                                value={editedMessage}
                                variant="unstyled"
                                size="md"
                                onChange={onTextAreaContentChanged}
                                onKeyDown={getHotkeyHandler([['Enter', onEnterKeyDown]])}
                            />
                            <Group justify="space-between" gap={0}>
                                <ActionIcon disabled={editedMessage.length === 0} variant="subtle" size={'md'} color="blue" onClick={onClickClearEdit}>
                                    <RxCross1 size={remToPx(2)} />
                                </ActionIcon>
                                <ActionIcon disabled={editedMessage.length === 0} variant="subtle" size={'md'} color="blue" onClick={handleClickSend}>
                                    <MdSend size={remToPx(2)} />
                                </ActionIcon>
                            </Group>
                        </>
                    ) : (
                        <>
                            <Tooltip label={'View the actual prompt sent to the LLM with RAG context'} arrowSize={4} withArrow>
                                <Button
                                    display={message.ragContext ? 'block' : 'none'}
                                    variant="light"
                                    size="xs"
                                    color="teal.4"
                                    c={'gray.9'}
                                    fz={14}
                                    radius="md"
                                    mb={isRAGContentOpen ? '0.2rem' : '1rem'}
                                    w={'11rem'}
                                    leftSection={<FaFileAlt size={remToPx(1.2)} />}
                                    rightSection={isRAGContentOpen ? <FaChevronUp size={remToPx(0.9)} /> : <FaChevronDown size={remToPx(0.9)} />}
                                    onClick={toggleRAGContent}
                                >
                                    RAG Prompt
                                </Button>
                            </Tooltip>
                            <Collapse display={message.ragContext ? 'block' : 'none'} in={isRAGContentOpen}>
                                <Blockquote lh={1.3} fz={11} c="gray.6" color="blue.3" p="0.6rem" mb={'1rem'} iconSize={0} pt="xs" py="0">
                                    <Text
                                        size="xs"
                                        fw={500}
                                        style={{
                                            whiteSpace: 'pre-wrap',
                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                        }}
                                    >
                                        {message.ragMetadata}
                                    </Text>
                                </Blockquote>
                                <Blockquote lh={1.3} fz={11} c="gray.7" color="teal.3" p="0.8rem" mb={'0.5rem'} iconSize={0} pt="xs" py="0">
                                    <Text
                                        size="xs"
                                        style={{
                                            whiteSpace: 'pre-wrap',
                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                        }}
                                    >
                                        {message.ragContext}
                                    </Text>
                                </Blockquote>
                            </Collapse>

                            <Text fz="15" lh={1.3}>
                                {message.content}
                            </Text>
                        </>
                    )}
                </Card>
                <Group gap={'0.2rem'}>
                    <Tooltip label={'Delete this and all subsequent messages'} arrowSize={4} withArrow>
                        <ActionIcon disabled={disabled} variant="subtle" size={'lg'} color="#FA5252" onClick={handleClickDelete}>
                            <FaRegTrashCan size={remToPx(2)} />
                            <FaArrowTurnDown size={remToPx(2)} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={'Resend this message'} arrowSize={4} withArrow>
                        <ActionIcon disabled={disabled} variant="subtle" size={'lg'} color="blue" onClick={handleClickRetry}>
                            <HiArrowPathRoundedSquare size={remToPx(2)} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={'Edit this message'} arrowSize={4} withArrow>
                        <ActionIcon disabled={disabled} variant="subtle" size={'lg'} color="blue" onClick={onClickEdit}>
                            <FaRegEdit size={remToPx(1.8)} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>
        </Stack>
    );
};
