/**
 * @fileoverview Custom React hook for exporting project state to downloadable JSON files.
 * Handles serialization of models, chat histories, custom messages, and project options.
 *
 * @module Hooks.SaveProject
 */

import { downloadFile } from '@/utils';
import { simpleDateFormat } from '@root/server/src/utils/strings';
import { IChatRoleMessage, ICustomMessage, IModelInfo, IProjectOptions, IProjectSavestate, IMessageEvaluation } from '@root/server/src/interfaces';

/**
 * Custom hook that provides functionality to save the current project state to a JSON file.
 * Packages all project components into a standardized format for backup and sharing purposes.
 *
 * @returns Hook interface containing the saveProject function
 *
 * @example
 * ```tsx
 * const { saveProject } = useSaveProject();
 *
 * const handleSave = () => {
 *   saveProject(models, chatHistories, customMessages, options);
 * };
 * ```
 */
export const useSaveProject = () => {
    /**
     * Saves the current project state to a downloadable JSON file.
     * Creates a timestamped filename and triggers browser download of serialized project data.
     *
     * @param selectedModels - Array of model information objects for all selected models
     * @param chatHistories - Map of chat message histories, keyed by model ID
     * @param customMessages - Array of custom/saved messages for quick insertion
     * @param options - Project configuration options (system prompt, settings, etc.)
     * @param evaluations - Optional array of evaluation data with consensus metrics and MDS coordinates
     */
    const saveProject = (
        selectedModels: IModelInfo[],
        chatHistories: Map<string, IChatRoleMessage[]>,
        customMessages: ICustomMessage[],
        options: IProjectOptions,
        evaluations?: Array<{ messageIndex: number; evaluation: IMessageEvaluation; analysis?: any }>
    ): void => {
        // Create a standardized save state object by mapping all data into the expected format
        const saveState: IProjectSavestate = {
            // Convert models and their associated chat histories to the save format
            models: selectedModels.map((modelInfo) => ({
                modelID: modelInfo.id,
                modelInfo,
                messages: chatHistories.get(modelInfo.id) || [],
            })),
            customMessages,
            options,
            // Include evaluation data if provided
            evaluations: evaluations && evaluations.length > 0 ? evaluations : undefined,
        };

        // Generate a timestamped filename and download the JSON file
        downloadFile(JSON.stringify(saveState, null, 2), `quest-project-${simpleDateFormat()}.json`, 'application/json');
    };

    return {
        /** Function to save the current project state to a JSON file */
        saveProject,
    };
};
