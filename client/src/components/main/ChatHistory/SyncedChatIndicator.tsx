/**
 * @fileoverview Visual indicator component that marks the synchronization point in chat history
 * where all selected models have consistent conversation state.
 * @module Components.Main.ChatHistory.SyncedChatIndicator
 */

import { remToPx } from '@/utils';
import { Badge, Divider, Flex, Tooltip } from '@mantine/core';
import { FaSyncAlt } from 'react-icons/fa';

interface SyncedChatIndicatorProps {}

/**
 * Displays a visual divider indicating the last synchronized message across all models.
 *
 * Shows a horizontal divider with a centered badge explaining that chat history
 * up to this point is consistent across all selected models. Includes a tooltip
 * for additional context.
 *
 * @returns Rendered synchronization indicator with tooltip
 */
export const SyncedChatIndicator: React.FC<SyncedChatIndicatorProps> = () => {
    return (
        <Flex align="center" gap="md" py="sm">
            <Divider
                style={{ flex: 1 }}
                color="blue.4"
                size="sm"
                labelPosition="center"
                label={
                    <>
                        <Tooltip label="Up to this point the chat history is synchronized with all other models" position="bottom" withArrow>
                            <Badge size="md" radius="md" color="blue.4" leftSection={<FaSyncAlt size={remToPx(0.8)} />} style={{ cursor: 'help' }}>
                                Synchronized Chat History
                            </Badge>
                        </Tooltip>
                    </>
                }
            />
        </Flex>
    );
};
