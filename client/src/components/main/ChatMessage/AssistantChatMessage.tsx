/**
 * @fileoverview React component for rendering AI assistant chat messages with expandable thinking content,
 * markdown support, and evaluation controls. Part of the chat interface system.
 * @module Components.Main.ChatMessage.AssistantChatMessage
 */

import { remToPx } from '@/utils';
import { ActionIcon, Blockquote, Button, Card, Collapse, Group, Space, Stack, Text, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IChatRoleMessage } from '@root/server/src/interfaces';
import { splitThinkingContent } from '@root/server/src/utils/strings';
import { useMemo } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { GiBrain } from 'react-icons/gi';
import { TbDeviceDesktopAnalytics } from 'react-icons/tb';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ConsensusScores } from './ConsensusScores';
import { useEvaluationStore } from '@/stores/evaluationStore';
import { useAppSettingsStore } from '@/stores/appSettingsStore';

/**
 * Props for the AssistantChatMessage component
 */
interface AssitantChatMessageProps {
    /** The chat message object containing content and metadata */
    message: IChatRoleMessage;
    /** Message index in the chat sequence */
    index: number;
    /** Whether to parse and display thinking content separately */
    shouldParseThinking: boolean;
    /** Whether to render message content as markdown */
    shouldRenderMarkdown: boolean;
    /** Callback triggered when evaluation button is clicked */
    onClickEvaluate: () => void;
}

/**
 * Chat message component for AI assistant responses with collapsible thinking section
 * and evaluation controls.
 *
 * @param props Component props
 * @returns JSX element representing the assistant message
 */
export const AssitantChatMessage: React.FC<AssitantChatMessageProps> = ({ 
    index, 
    shouldRenderMarkdown, 
    message, 
    shouldParseThinking, 
    onClickEvaluate 
}) => {
    const [isThinkingContentOpen, { toggle: toggleThinkingContent }] = useDisclosure();
    const { getConsensusData } = useEvaluationStore();
    const { showConsensusScores, consensusMuThreshold, consensusSigmaThreshold } = useAppSettingsStore();

    // Get consensus data for this message index
    const consensusData = getConsensusData(index);

    /**
     * Separates thinking content from main message content based on parsing preference.
     * Uses memoization to avoid recalculating on every render.
     */
    const { thinkingContent, remainingMessageContent } = useMemo(() => {
        if (!shouldParseThinking) {
            return { thinkingContent: null, remainingMessageContent: message.content };
        }
        return splitThinkingContent(message.content);
    }, [message, shouldParseThinking]);

    return (
        <Stack gap={0} key={index}>
            <Group mx={0} p={0} gap={'xs'}>
                <Text fw="700" px="0.5rem" fz={14}>
                    Assistant
                </Text>
                <Text fw="400" fz={12} c="gray.7">
                    {message.source ? message.source : 'unknown'}
                </Text>
                {message.performanceMetrics && message.performanceMetrics.tokensPerSecond && (
                    <>
                        <Text fw="400" fz={12} c="gray.6">
                            |
                        </Text>
                        <Text fw="400" fz={12} c="gray.7">
                            ~{Math.round(message.performanceMetrics.tokensPerSecond / 4)} tok/s (char/4)
                        </Text>
                        <Text fw="400" fz={12} c="gray.6">
                            |
                        </Text>
                        <Text fw="400" fz={12} c="gray.7">
                            {message.performanceMetrics.tokensPerSecond.toFixed(1)} char/s
                        </Text>
                        <Text fw="400" fz={12} c="gray.6">
                            |
                        </Text>
                        <Text fw="400" fz={12} c="gray.7">
                            {message.performanceMetrics.totalTokens} chars
                        </Text>
                        {message.performanceMetrics.timeToFirstToken !== undefined && (
                            <>
                                <Text fw="400" fz={12} c="gray.6">
                                    |
                                </Text>
                                <Text fw="400" fz={12} c="gray.7">
                                    ~{(message.performanceMetrics.timeToFirstToken / 1000).toFixed(1)}s TTFT
                                </Text>
                            </>
                        )}
                        <Text fw="400" fz={12} c="gray.6">
                            |
                        </Text>
                        <Text fw="400" fz={12} c="gray.7">
                            ~{(message.performanceMetrics.totalTimeMs / 1000).toFixed(1)}s total
                        </Text>
                    </>
                )}
            </Group>

            <Group>
                <Card w={'80%'} shadow="lg" radius="md" bg="blue.0" withBorder mx={'1rem'}>
                    <Tooltip label={"View the AI's reasoning process and internal thoughts that led to this response"} arrowSize={4} withArrow>
                        <Button
                            display={thinkingContent ? 'block' : 'none'}
                            variant="light"
                            size="xs"
                            color="blue.4"
                            c={'gray.9'}
                            fz={14}
                            radius="md"
                            mb={isThinkingContentOpen ? '0.2rem' : '1rem'}
                            w={'9rem'}
                            leftSection={<GiBrain size={remToPx(1.2)} />}
                            rightSection={isThinkingContentOpen ? <FaChevronUp size={remToPx(0.9)} /> : <FaChevronDown size={remToPx(0.9)} />}
                            onClick={toggleThinkingContent}
                        >
                            Thinking
                        </Button>
                    </Tooltip>
                    <Collapse display={thinkingContent ? 'block' : 'none'} in={isThinkingContentOpen}>
                        <Blockquote lh={1.4} fz={15} c="gray.8" color="blue.3" p="1rem" mb={'1rem'} iconSize={0} pt="xs" py="0">
                            {thinkingContent}
                        </Blockquote>
                    </Collapse>

                    {shouldRenderMarkdown ? (
                        <Text span fz={15} lh={1.2} className="markdown-container">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    p: ({ node, ...props }) => <p style={{ margin: 0, padding: 0 }} {...props} />,
                                    code: ({ node, inline, ...props }: any) =>
                                        inline ? (
                                            <code {...props} style={{ whiteSpace: 'normal', overflowWrap: 'break-word' }} />
                                        ) : (
                                            <code {...props} style={{ display: 'block', whiteSpace: 'pre-wrap', overflowX: 'auto', maxWidth: '100%' }} />
                                        ),
                                    pre: ({ node, ...props }) => <pre {...props} style={{ whiteSpace: 'pre-wrap', overflowX: 'auto', maxWidth: '100%' }} />,
                                }}
                            >
                                {remainingMessageContent}
                            </ReactMarkdown>
                        </Text>
                    ) : (
                        <Text fz="15" lh={1.3}>
                            {remainingMessageContent}
                        </Text>
                    )}

                    {/* Consensus Scores */}
                    {showConsensusScores && (
                        <ConsensusScores 
                            similarityMatrix={consensusData?.similarityMatrix || null} 
                            modelLabels={consensusData?.modelLabels || null}
                            muThreshold={consensusMuThreshold}
                            sigmaThreshold={consensusSigmaThreshold}
                        />
                    )}
                </Card>
                <Group gap={'0.2rem'}>
                    <Tooltip label={'Show the evaluation compared with all models'} arrowSize={4} withArrow>
                        <ActionIcon variant="subtle" size={'xl'} color="blue" onClick={onClickEvaluate}>
                            <TbDeviceDesktopAnalytics size={remToPx(2.2)} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
                <Space />
            </Group>
        </Stack>
    );
};
