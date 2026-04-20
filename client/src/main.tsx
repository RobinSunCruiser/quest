/**
 * @module App/EntryPoint
 *
 * Application entry point that bootstraps the React application.
 * This file configures the rendering environment, sets up global providers and services,
 * and mounts the root application component to the DOM.
 *
 * Key responsibilities:
 * - Sets up React 18's concurrent rendering with createRoot
 * - Initializes Mantine UI framework with theme settings
 * - Establishes the provider hierarchy for global state and notifications
 */

// React rendering imports
import { createRoot } from 'react-dom/client';
import App from '@/App';

// Global state management
import { GlobalStateProvider } from '@/services/globalStateContext';

/**
 * Mantine UI framework stylesheets
 * These imports provide the base styles for Mantine components:
 * - core: Basic component styles
 * - notifications: Toast notification system
 */
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

// Custom application styles
import './main.css';

// Mantine UI components and theme configuration
import { createTheme, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';


/**
 * Create custom Mantine theme with application-specific settings
 * - cursorType: 'pointer' makes interactive elements display a pointer cursor
 *
 * Additional theme customizations can be added here for colors, spacing, typography, etc.
 */
const theme = createTheme({ cursorType: 'pointer' });

/**
 * Render the application with React 18's concurrent rendering
 *
 * Provider hierarchy (outermost to innermost):
 * 1. MantineProvider - UI component theming and styling
 * 2. Notifications - Global toast notification system
 * 3. GlobalStateProvider - Application-wide state management
 * 4. App - Main application component
 *
 * This structure ensures that all components within the App have access to
 * the global state, notifications system, and theme settings.
 */
createRoot(document.getElementById('root')!).render(
    <MantineProvider theme={theme} forceColorScheme="light">
        <Notifications />
        <GlobalStateProvider>
            <App />
        </GlobalStateProvider>
    </MantineProvider>
);
