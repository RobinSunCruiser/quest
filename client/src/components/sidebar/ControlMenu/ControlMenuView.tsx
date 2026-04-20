/**
 * @fileoverview Presentational view component for the control menu interface.
 * Renders buttons and controls for model management, chat synchronization,
 * project operations, and custom message configuration in the sidebar.
 * @module Components.Sidebar.ControlMenu.ControlMenuView
 */

import { remToPx } from '@/utils';
import { Button, Group, Loader, Paper, Stack, Tooltip } from '@mantine/core';
import { BiSelectMultiple } from 'react-icons/bi';
import { FaFileAlt } from 'react-icons/fa';
import { FaRegTrashCan } from 'react-icons/fa6';
import { TiArrowSync } from 'react-icons/ti';
import { ProjectFileMenu } from './ProjectFileMenu';
import { LuServer } from 'react-icons/lu';
import { TbDeviceDesktopAnalytics } from 'react-icons/tb';
import { CustomMessageEditor } from '../CustomMessageEditor';
import { DocumentManager } from '@/components/rag';
import { ICustomMessage, IProjectSavestate } from '@root/server/src/interfaces';
import { useDisclosure } from '@mantine/hooks';

/**
 * Props for the ControlMenuView component.
 * Contains state flags and event handlers passed down from the container.
 */
interface ControlMenuViewProps {
    /** Whether the sync chat histories button should be disabled */
    syncDisabledDisabled: boolean;
    /** Whether the clear histories button should be disabled */
    clearHistoryDisabled: boolean;
    /** Whether the backend adapters are currently being reloaded */
    isAdapterLoading: boolean;
    /** Whether the custom message editor modal is open */
    isCustomMessageEditorOpen: boolean;
    /** Handler for opening the model selection dialog */
    onModelSelectionOpen: () => void;
    /** Handler for synchronizing chat histories across models */
    onSyncChatHistories: () => void;
    /** Handler for clearing all chat histories */
    onResetChats: () => void;
    /** Handler for saving the current project state */
    onSaveProject: () => void;
    /** Handler for loading project data from file */
    onLoadProject: (data: IProjectSavestate) => void;
    /** Handler for reloading backend model adapters */
    onReloadAdapters: () => void;
    /** Handler for opening the custom message editor */
    onCustomMessageEditorOpen: () => void;
    /** Handler for direct comparison of custom messages */
    onCustomMessageDirectCompare: (messages: ICustomMessage[]) => void;
    /** Handler for closing the custom message editor */
    onCustomMessageEditorClose: () => void;
}

/**
 * Pure presentational component that renders the control menu interface.
 * Organized into two main groups: model management controls and project/custom message controls.
 * Uses tooltips to provide helpful context for each action.
 *
 * @param props - Component props containing state and event handlers
 * @returns Rendered control menu with grouped action buttons
 */
export const ControlMenuView: React.FC<ControlMenuViewProps> = ({
    syncDisabledDisabled,
    clearHistoryDisabled,
    isAdapterLoading,
    isCustomMessageEditorOpen,
    onSaveProject,
    onLoadProject,
    onModelSelectionOpen,
    onResetChats,
    onSyncChatHistories,
    onReloadAdapters,
    onCustomMessageEditorOpen,
    onCustomMessageEditorClose,
    onCustomMessageDirectCompare,
}) => {
    const [isDocumentManagerOpen, { open: openDocumentManager, close: closeDocumentManager }] = useDisclosure();

    return (
        <>
            <CustomMessageEditor opened={isCustomMessageEditorOpen} onClose={onCustomMessageEditorClose} onDirectCompare={onCustomMessageDirectCompare} />
            <DocumentManager opened={isDocumentManagerOpen} onClose={closeDocumentManager} />
            <Paper shadow="sm" p="0" radius="md">
                <Stack gap="xs" p="xs">
                    {/* Model management controls */}
                    <Group gap="xs">
                        {/* Model selection button */}
                        <Button variant="light" flex={1} size="xs" leftSection={<BiSelectMultiple size={remToPx(1.2)} />} onClick={onModelSelectionOpen}>
                            Select Models
                        </Button>

                        {/* Sync chat histories button - applies active model's history to all selected models */}
                        <Tooltip label="Apply this conversation's history to all models, keeping their context aligned">
                            <Button
                                variant="light"
                                size="xs"
                                disabled={syncDisabledDisabled}
                                leftSection={<TiArrowSync size={remToPx(1.2)} />}
                                onClick={() => onSyncChatHistories()}
                            >
                                Sync Chat Histories
                            </Button>
                        </Tooltip>

                        {/* Clear histories button - destructive action with red color */}
                        <Tooltip label="Delete all chat histories and start fresh across all models">
                            <Button
                                variant="light"
                                size="xs"
                                color="red"
                                disabled={clearHistoryDisabled}
                                leftSection={<FaRegTrashCan size={remToPx(1.2)} />}
                                onClick={() => onResetChats()}
                            >
                                Clear Histories
                            </Button>
                        </Tooltip>
                    </Group>

                    {/* Project and custom message controls */}
                    <Group gap="xs">
                        {/* Project save/load menu */}
                        <ProjectFileMenu onSave={onSaveProject} onLoad={onLoadProject} />

                        {/* Backend reload button - shows loading spinner when active */}
                        <Tooltip label="Reinitialize all model adapters in the backend server">
                            <Button variant="light" size="xs" leftSection={isAdapterLoading ? <Loader size="xs" /> : <LuServer size={remToPx(1.2)} />} onClick={onReloadAdapters}>
                                Reload Adapters
                            </Button>
                        </Tooltip>

                        {/* Custom message configuration button */}
                        <Tooltip label="Open the menu to input custom messages and compare them with LLM-generated responses">
                            <Button variant="light" size="xs" leftSection={<TbDeviceDesktopAnalytics size={remToPx(1.2)} />} onClick={onCustomMessageEditorOpen}>
                                Configure Custom Messages
                            </Button>
                        </Tooltip>

                        {/* RAG document manager button */}
                        <Tooltip label="Upload and manage documents for Retrieval Augmented Generation (RAG)">
                            <Button variant="light" size="xs" leftSection={<FaFileAlt size={remToPx(1.2)} />} onClick={openDocumentManager}>
                                RAG Documents
                            </Button>
                        </Tooltip>
                    </Group>
                </Stack>
            </Paper>
        </>
    );
};
