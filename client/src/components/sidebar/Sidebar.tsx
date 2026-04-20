/**
 * @fileoverview Main sidebar component for the LLM application interface.
 * Provides the primary navigation and control panel with prompt input, model selection,
 * control menu, and collapsible app settings in a vertical layout.
 * @module Components.Sidebar
 */

import { AppSettings } from '@/components/sidebar/AppSettings';
import { PromptWindow } from '@/components/sidebar/PromptWindow';
import { ControlMenu } from '@/components/sidebar/ControlMenu';
import { ActionIcon, Collapse, Group, ScrollArea, Stack } from '@mantine/core';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { remToPx } from '@/utils';
import { ModelSelectionDrawer } from './ModelSelectionDrawer';
import { useDisclosure } from '@mantine/hooks';
import { ICustomMessage } from '@root/server/src/interfaces';

/**
 * Props for the Sidebar component.
 */
interface SidebarProps {
    onCustomMessageDirectCompare: (messages: ICustomMessage[]) => void;
}

/**
 * Main sidebar component that organizes the application's primary interface elements.
 * Features a three-section layout: fixed prompt input and controls at top, scrollable
 * settings in middle, and toggle button at bottom.
 *
 * The PromptWindow adjusts its height based on whether app settings are expanded,
 * and the ModelSelectionDrawer opens as an overlay when triggered from the control menu.
 *
 * @returns React functional component for the application sidebar
 */
export const Sidebar: React.FC<SidebarProps> = ({ onCustomMessageDirectCompare }) => {
    //TODO move uisettings outside of appsettings
    const { isAppSettingsOpen, toggleAppSettings } = useAppSettingsStore();
    const [isModelSelectionOpen, { open: openModelSelection, close: closeModelSelection }] = useDisclosure();

    return (
        <Stack h={`calc(100vh - var(--app-shell-header-height, 0px))`} gap={'sm'} justify="space-between" p="sm">
            {/* Top section with prompt input */}
            <Stack>
                <ModelSelectionDrawer opened={isModelSelectionOpen} onClose={closeModelSelection} />

                <PromptWindow fullHeight={!isAppSettingsOpen} />

                <ControlMenu onOpenModelSelect={openModelSelection} onCustomMessageDirectCompare={onCustomMessageDirectCompare}></ControlMenu>
            </Stack>

            {/* Middle section with collapsible settings panels */}
            <ScrollArea h={'100%'} type="hover" scrollbars="y" w={'100%'}>
                <Collapse in={isAppSettingsOpen} transitionDuration={200}>
                    <AppSettings />
                </Collapse>
            </ScrollArea>

            {/* Bottom toggle button */}
            <Group justify="center">
                <ActionIcon w={100} onClick={toggleAppSettings}>
                    {isAppSettingsOpen ? <FaChevronDown size={remToPx(1.5)} /> : <FaChevronUp size={remToPx(1.5)} />}
                </ActionIcon>
            </Group>
        </Stack>
    );
};
