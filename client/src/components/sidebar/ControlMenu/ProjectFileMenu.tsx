/**
 * @fileoverview Dropdown menu component for project-level operations including
 * saving current application state to file and loading previously saved projects.
 * Provides file validation and user feedback through the useLoadProject hook.
 * @module Components.Sidebar.ControlMenu.ProjectFileMenu
 */

import { Button, Menu, Tooltip } from '@mantine/core';
import { FaProjectDiagram } from 'react-icons/fa';
import { IoIosSave } from 'react-icons/io';
import { LuFileJson2 } from 'react-icons/lu';

import { remToPx } from '@/utils';
import { IProjectSavestate } from '@root/server/src/interfaces/IProjectSavestate';
import { useLoadProject } from '@/hooks';

/**
 * Props for the ProjectFileMenu component.
 */
interface ProjectFileMenuProps {
    /**
     * Callback function triggered when user chooses to save the project.
     * The parent component is responsible for implementing the actual save logic.
     */
    onSave: () => void;
    /**
     * Callback function triggered when a valid project file is loaded.
     * Receives the parsed project data to be applied to the application state.
     */
    onLoad: (data: IProjectSavestate) => void;
}

/**
 * A dropdown menu component that provides project-level operations
 * like saving the current state to a file or loading a previously saved project.
 * Uses the useLoadProject hook to handle file selection, validation, and parsing.
 *
 * @param props - Component props containing save and load handlers
 * @returns Rendered Menu component with project operation options
 *
 * @example
 * ```tsx
 * <ProjectFileMenu
 *   onSave={() => handleProjectSave()}
 *   onLoad={(data) => handleProjectLoad(data)}
 * />
 * ```
 */
export const ProjectFileMenu: React.FC<ProjectFileMenuProps> = ({ onSave, onLoad }) => {
    const { isLoading, triggerFileSelection, FileInputComponent } = useLoadProject(onLoad);

    /**
     * Initiates the project save process by calling the onSave callback.
     * The actual save implementation is handled by the parent component.
     */
    const handleSaveClick = () => {
        onSave();
    };

    /**
     * Triggers the file selection dialog for loading a project file.
     * Uses the useLoadProject hook to handle file validation and parsing.
     */
    const handleLoadClick = () => {
        triggerFileSelection();
    };

    return (
        <>
            {/* Hidden file input for opening project files */}
            <FileInputComponent />

            {/* Project menu dropdown */}
            <Menu shadow="md" width={200}>
                <Menu.Target>
                    <Tooltip label={'Load or save the whole project'} arrowSize={4} withArrow position="top">
                        <Button variant="light" flex={1} size="xs" rightSection={<FaProjectDiagram size={remToPx(1.2)} />}>
                            Project
                        </Button>
                    </Tooltip>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Label>Project</Menu.Label>
                    <Menu.Item leftSection={<IoIosSave size={remToPx(1.2)} />} onClick={handleSaveClick}>
                        Save as
                    </Menu.Item>
                    <Menu.Item leftSection={<LuFileJson2 size={remToPx(1.2)} />} onClick={handleLoadClick}>
                        {isLoading ? 'Loading...' : 'Open project'}
                    </Menu.Item>
                </Menu.Dropdown>
            </Menu>
        </>
    );
};
