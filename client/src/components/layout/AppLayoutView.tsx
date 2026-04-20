/**
 * @fileoverview Application layout view component that renders the main shell structure using Mantine's AppShell.
 * Provides header, main content, and collapsible sidebar areas with responsive behavior.
 * @module Components.Layout.AppLayoutView
 */
import { AppShell } from '@mantine/core';

/**
 * Props for the AppLayoutView component.
 *
 * @param isSidebarOpen - Controls visibility of the sidebar across all breakpoints
 * @param headerContent - Content to render in the header area
 * @param mainContent - Content to render in the main content area
 * @param asideContent - Content to render in the sidebar/aside area
 */
interface AppLayoutViewProps {
    isSidebarOpen: boolean;
    headerContent?: React.ReactNode;
    mainContent?: React.ReactNode;
    asideContent?: React.ReactNode;
}

/**
 * Presentational layout component that structures the application shell using Mantine's AppShell.
 *
 * Defines a fixed header (75px height), collapsible sidebar (35rem width), and flexible main content area.
 * Sidebar collapse state is controlled externally via the isSidebarOpen prop.
 *
 * @param props - Layout configuration and content nodes
 * @returns Structured application shell with header, main, and aside sections
 */
export const AppLayoutView: React.FC<AppLayoutViewProps> = ({ isSidebarOpen, headerContent, mainContent, asideContent }) => {
    return (
        <AppShell
            header={{ height: 75 }}
            aside={{
                width: '35rem',
                breakpoint: '',
                collapsed: { desktop: !isSidebarOpen, mobile: !isSidebarOpen },
            }}
            padding="0"
        >
            {/* Application header with logos and information */}
            <AppShell.Header p={'0.5rem'}>{headerContent}</AppShell.Header>

            {/* Main content area with chat interface */}
            <AppShell.Main>{mainContent}</AppShell.Main>

            {/* Side panel with controls and settings */}
            <AppShell.Aside>{asideContent}</AppShell.Aside>
        </AppShell>
    );
};
