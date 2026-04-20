/**
 * @fileoverview Component to display active custom messages indicator.
 * Shows a compact indicator when custom messages are active.
 * @module Components.Main.ChatHistory.ActiveCustomMessages
 */

import { Badge, Group, Stack, Text, Tooltip } from '@mantine/core';
import { ICustomMessage } from '@root/server/src/interfaces';
import { FaComments } from 'react-icons/fa';

/**
 * Props for the ActiveCustomMessages component.
 */
interface ActiveCustomMessagesProps {
    /** Array of active custom messages */
    activeCustomMessages: ICustomMessage[];
}

/**
 * Displays an indicator for active custom messages.
 * Shows when custom messages are being used for comparison.
 *
 * @param props - Component props
 * @returns JSX element with custom message indicator or null if no active messages
 */
export const ActiveCustomMessages: React.FC<ActiveCustomMessagesProps> = ({ activeCustomMessages }) => {
    if (activeCustomMessages.length === 0) return null;

    // Simple blue styling
    const backgroundColor = 'var(--mantine-color-blue-0)';
    const borderColor = 'var(--mantine-color-blue-2)';
    const headerColor = 'blue.7';

    return (
        <Stack
            gap="xs"
            p="xs"
            style={{
                backgroundColor,
                borderRadius: '6px',
                border: `1px solid ${borderColor}`,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
        >
            <Group justify="space-between" align="center">
                <Group gap="xs" align="center">
                    <FaComments size={14} color={`var(--mantine-color-${headerColor.split('.')[0]}-6)`} />
                    <Text size="sm" fw={500} c={headerColor}>
                        Active Custom Messages ({activeCustomMessages.length})
                    </Text>
                    <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
                        (Use `Configure Custom Messages` to enable/disable)
                    </Text>
                </Group>
            </Group>

            <Group gap="xs" wrap="wrap">
                {activeCustomMessages.map((msg, index) => (
                    <Tooltip
                        key={index}
                        label={`Custom message: ${msg.message.length > 50 ? msg.message.substring(0, 50) + '...' : msg.message}`}
                        withArrow
                        position="top"
                        multiline
                        w={300}
                    >
                        <Badge variant="light" color="blue" size="sm" style={{ cursor: 'help' }}>
                            {msg.label}
                        </Badge>
                    </Tooltip>
                ))}
            </Group>
        </Stack>
    );
};
