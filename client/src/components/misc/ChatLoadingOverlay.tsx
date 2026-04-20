/**
 * @fileoverview Loading overlay component with abort functionality for chat operations.
 * @module Components.Misc.ChatLoadingOverlay
 */

import { LoadingOverlay } from '@mantine/core';
import { useEffect, useState } from 'react';
import { FaRegCircleStop } from 'react-icons/fa6';
import { remToPx } from '@/utils';

/**
 * Props for the ChatLoadingOverlay component.
 */
interface ChatLoadingOverlayProps {
    /** Whether the loading overlay is visible */
    visible: boolean;

    /**
     * Callback triggered when the abort button is clicked.
     * Should handle cancellation of ongoing operations.
     */
    onAbort: () => void;
}

/**
 * Loading overlay component with hover-to-abort functionality.
 *
 * Displays a loading animation by default, which transforms into an abort button
 * when hovered. Designed for chat operations where users need the ability to
 * cancel long-running requests.
 *
 * @param props - Component properties
 * @returns LoadingOverlay with custom styling and abort functionality
 *
 * @example
 * ```tsx
 * const [isLoading, setIsLoading] = useState(false);
 * const [controller, setController] = useState<AbortController | null>(null);
 *
 * const handleAbort = () => {
 *   controller?.abort();
 *   setController(null);
 * };
 *
 * <ChatLoadingOverlay visible={isLoading} onAbort={handleAbort} />
 * ```
 */
export const ChatLoadingOverlay: React.FC<ChatLoadingOverlayProps> = ({ visible, onAbort }) => {
    /** Tracks overlay visibility, synchronized with props */
    const [isVisible, setVisible] = useState<boolean>(visible);

    /** Controls abort button display on hover */
    const [canAbort, setCanAbort] = useState<boolean>(false);

    /** Syncs internal visibility state with visible prop */
    useEffect(() => {
        setVisible(visible);
    }, [visible]);

    /**
     * Handles abort action when overlay is clicked in abort mode.
     * Resets abort state and triggers onAbort callback.
     */
    const handleAbort = () => {
        setCanAbort(false);
        onAbort();
    };

    return (
        <LoadingOverlay
            visible={isVisible}
            zIndex={1000}
            component={'a'}
            overlayProps={{
                radius: 'sm',
                blur: 1,
            }}
            style={{ cursor: canAbort ? 'pointer' : 'default' }}
            loaderProps={
                !canAbort
                    ? { color: 'blue', type: 'dots' }
                    : {
                          children: <FaRegCircleStop size={remToPx(2.5)} color="#FA5252" aria-hidden="true" />,
                      }
            }
            onMouseEnter={() => setCanAbort(true)}
            onMouseLeave={() => setCanAbort(false)}
            onClick={handleAbort}
            title={canAbort ? 'Click to cancel operation' : 'Loading, please wait'}
        />
    );
};
