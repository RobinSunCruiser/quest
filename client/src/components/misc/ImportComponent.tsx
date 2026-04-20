/**
 * @fileoverview Import button component for uploading and validating chat history files.
 * @module Components.Misc.ImportComponent
 */

// External dependencies
import { ActionIcon, FileInput, Tooltip } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { FaFileImport } from 'react-icons/fa6';

// Internal dependencies
import { remToPx, showNotification } from '@/utils';
import { ChatHistoryStateSchema, IChatHistoryState } from '@root/server/src/interfaces/IChatHistoryState';
import { createModelMetadata } from '@root/server/src/interfaces/IModelMetadata';

/**
 * Props for the ImportComponent.
 */
export interface ImportComponentProps {
    /** Callback invoked with validated chat history data when a valid file is uploaded */
    onImport: (chat: IChatHistoryState) => void;

    /** Whether the upload functionality is disabled (typically when another operation is in progress) */
    disabled: boolean;
}

/**
 * Import button component with file validation and error handling.
 *
 * Allows users to upload JSON files containing chat history data. Validates files
 * against the expected schema and shows appropriate notifications for success/failure.
 *
 * @param props - Component properties
 * @returns Import button with tooltip and hidden file input
 *
 * @example
 * ```tsx
 * <ImportComponent
 *   onImport={(data) => setChatHistory(data)}
 *   disabled={isProcessing}
 * />
 * ```
 */
export const ImportComponent: React.FC<ImportComponentProps> = ({ onImport, disabled }) => {
    /** Reference to the hidden file input for programmatic triggering */
    const fileInputRef = useRef<HTMLButtonElement>(null);

    /** Currently selected file for import processing */
    const [value, setValue] = useState<File | null>(null);

    /** Tracks button disabled state, synced with props */
    const [show, setShow] = useState<boolean>(disabled);

    /** Triggers the file input click event programmatically */
    const clickOnButton = () => {
        fileInputRef.current?.click();
    };

    /**
     * Validates uploaded file by parsing JSON content and verifying against chat history schema.
     *
     * @param file - The uploaded file to validate
     * @returns Promise resolving with validated chat history data
     */
    const validateFile = async (file: File): Promise<IChatHistoryState> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                try {
                    const parsed = JSON.parse(reader.result as string);
                    const validatedData = ChatHistoryStateSchema.parse(parsed);

                    // Ensure metadata and metadataLoading are present for backward compatibility
                    if (validatedData.modelInfo) {
                        if (!validatedData.modelInfo.metadata) {
                            validatedData.modelInfo.metadata = createModelMetadata({});
                        }
                        if (validatedData.modelInfo.metadataLoading === undefined) {
                            validatedData.modelInfo.metadataLoading = false;
                        }
                    }

                    // Cast to IChatHistoryState after ensuring metadata is present
                    resolve(validatedData as IChatHistoryState);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Error reading the file'));
            };

            reader.readAsText(file);
        });
    };

    /** Processes selected file, validates it, and triggers import callback or shows error */
    useEffect(() => {
        if (!value) return;

        const processFile = async () => {
            try {
                const data: IChatHistoryState = await validateFile(value);
                onImport(data);
                setValue(null);
            } catch (error) {
                showNotification({
                    title: 'Import failed',
                    message: 'Format not supported.',
                    type: 'error',
                    autoClose: 4000,
                });
                console.error(error);
                setValue(null);
            }
        };

        processFile();
    }, [value, onImport]);

    /** Syncs internal disabled state with disabled prop */
    useEffect(() => {
        setShow(disabled);
    }, [disabled]);

    return (
        <>
            <FileInput
                display={'none'}
                disabled={show}
                ref={fileInputRef}
                variant="unstyled"
                value={value}
                valueComponent={() => null}
                onChange={(file) => {
                    if (file) {
                        setValue(null); // Force reset to ensure effect triggers
                        setTimeout(() => setValue(file), 0);
                    }
                }}
            />

            <Tooltip label="Import selected chat history" arrowSize={4} withArrow>
                <ActionIcon disabled={show} variant="subtle" size="lg" color="blue" onClick={clickOnButton}>
                    <FaFileImport size={remToPx(1.8)} />
                </ActionIcon>
            </Tooltip>
        </>
    );
};
