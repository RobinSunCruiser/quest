/**
 * @fileoverview Project loading hook that provides file selection and validation functionality.
 * Handles JSON project file loading with schema validation and provides a hidden file input component.
 *
 * @module Hooks.LoadProject
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileInput } from '@mantine/core';
import { showNotification } from '@/utils';
import { IProjectSavestate, ProjectSavestateSchema } from '@root/server/src/interfaces';

/**
 * Hook for handling project file loading with built-in file input component.
 *
 * Provides file selection, validation against project schema, and success/error handling
 * with notifications. Returns a hidden file input component and methods to trigger
 * the file selection process.
 *
 * @param onLoad - Callback function called when a valid project file is loaded
 * @returns Object containing loading state, file selection trigger, and file input component
 *
 * @example
 * ```tsx
 * const { isLoading, triggerFileSelection, FileInputComponent } = useLoadProject(
 *   (projectData) => console.log('Project loaded:', projectData)
 * );
 *
 * return (
 *   <div>
 *     <button onClick={triggerFileSelection} disabled={isLoading}>
 *       Load Project
 *     </button>
 *     <FileInputComponent />
 *   </div>
 * );
 * ```
 */
export const useLoadProject = (onLoad: (data: IProjectSavestate) => void) => {
    /** Reference to the file input element for programmatic clicking */
    const fileInputRef = useRef<HTMLButtonElement>(null);

    /** State to track the selected file */
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    /** State to track loading state */
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Validates the selected file by parsing it as JSON and validating against the project schema.
     *
     * @param file - File to validate
     * @returns Promise resolving to validated project savestate data
     * @throws Error if file cannot be read or fails schema validation
     */
    const validateFile = useCallback(async (file: File): Promise<IProjectSavestate> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                try {
                    const parsed = JSON.parse(reader.result as string);
                    const validatedData = ProjectSavestateSchema.parse(parsed) as IProjectSavestate;
                    resolve(validatedData);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Error reading the file'));
            };

            reader.readAsText(file);
        });
    }, []);

    /**
     * Processes a file by validating it and calling the onLoad callback.
     * Shows success/error notifications and manages loading state.
     *
     * @param file - File to process
     */
    const processFile = useCallback(
        async (file: File): Promise<void> => {
            if (!file) return;

            setIsLoading(true);

            try {
                const data: IProjectSavestate = await validateFile(file);
                onLoad?.(data);

                showNotification({
                    title: 'Loading successful',
                    message: 'Project has been loaded',
                    type: 'success',
                    autoClose: 4000,
                });
            } catch (error) {
                showNotification({
                    title: 'Loading failed',
                    message: 'Format not supported',
                    type: 'error',
                    autoClose: 4000,
                });

                console.error('Project validation failed:', error);
                throw error;
            } finally {
                setIsLoading(false);
            }
        },
        [validateFile, onLoad]
    );

    /**
     * Triggers the file selection dialog by programmatically clicking the hidden file input.
     */
    const triggerFileSelection = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    /**
     * Handles file selection from the file input.
     *
     * @param file - Selected file or null if selection was cancelled
     */
    const handleFileSelect = useCallback((file: File | null) => {
        setSelectedFile(file);
    }, []);

    // Process file when selected
    useEffect(() => {
        if (selectedFile) {
            const handleFileProcessing = async () => {
                try {
                    await processFile(selectedFile);
                } catch (error) {
                    // Error is already handled in processFile
                } finally {
                    // Reset the file input value
                    setSelectedFile(null);
                }
            };

            handleFileProcessing();
        }
    }, [selectedFile]);

    /**
     * Hidden FileInput component that can be rendered by the consuming component.
     * Accepts only JSON files and triggers file processing on selection.
     */
    const FileInputComponent = useCallback(
        () => (
            <FileInput w={0} display={'none'} ref={fileInputRef} variant="unstyled" value={selectedFile} valueComponent={() => null} onChange={handleFileSelect} accept=".json" />
        ),
        [selectedFile, handleFileSelect]
    );

    return {
        /** Loading state indicator */
        isLoading,
        /** Function to trigger file selection dialog */
        triggerFileSelection,
        /** Hidden FileInput component to render */
        FileInputComponent,
        /** Additional utility functions for advanced usage */
        validateFile,
        processFile,
    };
};
