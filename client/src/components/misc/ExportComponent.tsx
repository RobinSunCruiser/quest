/**
 * @fileoverview Export button component for downloading chat history data.
 * @module Components.Misc.ExportComponent
 */

import { ActionIcon, Tooltip } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { FaFileExport } from 'react-icons/fa6';
import { remToPx } from '@/utils';

/**
 * Props for the ExportComponent.
 */
export interface ExportComponentProps {
    /** Callback triggered when export button is clicked */
    onExport: () => void;

    /** Whether the export button is disabled (typically when no chat history exists) */
    disabled: boolean;
}

/**
 * Export button component with tooltip and disabled state handling.
 *
 * Displays an action button that triggers chat history export functionality.
 * Button is automatically disabled when no exportable data is available.
 *
 * @param props - Component properties
 * @returns Export button with tooltip
 *
 * @example
 * ```tsx
 * <ExportComponent
 *   onExport={() => downloadChatHistory()}
 *   disabled={chatHistory.length === 0}
 * />
 * ```
 */
export const ExportComponent: React.FC<ExportComponentProps> = ({ onExport, disabled }) => {
    /** Button reference for programmatic interaction */
    const fileInputRef = useRef<HTMLButtonElement>(null);

    /** Tracks button disabled state, synced with props */
    const [show, setShow] = useState<boolean>(disabled);

    /** Syncs internal disabled state with disabled prop */
    useEffect(() => {
        setShow(disabled);
    }, [disabled]);

    /**
     * Handles export button click by triggering both button interaction and export callback.
     */
    const clickOnButton = (): void => {
        fileInputRef.current?.click();
        onExport();
    };

    return (
        <Tooltip label="Export selected chat history" arrowSize={4} withArrow>
            <ActionIcon ref={fileInputRef} disabled={show} variant="subtle" size="lg" color="blue" onClick={clickOnButton}>
                <FaFileExport size={remToPx(2)} />
            </ActionIcon>
        </Tooltip>
    );
};
