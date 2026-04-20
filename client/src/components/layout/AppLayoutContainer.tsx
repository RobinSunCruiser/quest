/**
 * @fileoverview Main application layout container that orchestrates service integrations and layout state management.
 * Coordinates between header, sidebar, and main content areas with responsive sidebar toggle functionality.
 * @module Components.Layout.AppLayoutContainer
 */
import { AppLayoutView } from './AppLayoutView';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { MainContent } from '../main/MainContent';
import { useLLMServiceIntegration, useModelServiceIntegration, useBatchModelManager } from '@/hooks';
import { useEffect, useState } from 'react';
import { ICustomMessage } from '@root/server/src/interfaces';
import { useMediaQuery } from '@mantine/hooks';

/**
 * Props for the AppLayoutContainer component.
 */
interface AppLayoutContainerProps {}

/**
 * Main application layout container that manages global service integrations and layout state.
 *
 * Initializes LLM and model service integrations on mount, manages sidebar visibility state,
 * and coordinates layout interactions between header, sidebar, and main content areas.
 *
 * @returns Complete application layout with integrated services and responsive sidebar
 */
export const AppLayoutContainer: React.FC<AppLayoutContainerProps> = () => {
    // Initialize service integrations for LLM and model data
    useLLMServiceIntegration();
    useModelServiceIntegration();

    // Initialize automatic batch model management
    useBatchModelManager();

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const isSmallScreen = useMediaQuery('(max-width: 1200px)');

    const [customMessageDirectCompareHandler, setCustomMessageDirectCompareHandler] = useState<((messages: ICustomMessage[]) => void) | null>(null);

    /**
     * Toggles sidebar visibility state.
     */
    const toggleSidebar = () => {
        setIsSidebarOpen((prev) => {
            return !prev;
        });
    };

    /**
     *
     */
    useEffect(() => {
        if (isSmallScreen) {
            setIsSidebarOpen(false);
        } else {
            setIsSidebarOpen(true);
        }
    }, [isSmallScreen]);

    /**
     * Handler that receives the actual implementation from MainContent
     */
    const handleCustomMessageDirectCompare = (handler: (messages: ICustomMessage[]) => void) => {
        setCustomMessageDirectCompareHandler(() => handler);
    };

    /**
     * Handler that gets called by the ControlMenu
     */
    const onCustomMessageDirectCompare = (messages: ICustomMessage[]) => {
        if (customMessageDirectCompareHandler) {
            customMessageDirectCompareHandler(messages);
        }
    };

    return (
        <AppLayoutView
            isSidebarOpen={isSidebarOpen}
            headerContent={<Header />}
            mainContent={
                <MainContent
                    isSidebarOpen={isSidebarOpen}
                    isSmallScreen={isSmallScreen}
                    onToggleSidebar={toggleSidebar}
                    onCustomMessageDirectCompare={handleCustomMessageDirectCompare}
                />
            }
            asideContent={<Sidebar onCustomMessageDirectCompare={onCustomMessageDirectCompare} />}
        />
    );
};
