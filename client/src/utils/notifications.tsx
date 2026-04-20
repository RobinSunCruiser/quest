/**
 * @module Utils/Notifications
 *
 * A utility module that provides a standardized interface for displaying notifications in the application.
 * Built on top of the Mantine notifications system, this module offers:
 *
 * - Type-safe notification functions with consistent styling
 * - Support for success, error, warning, and info notification types
 * - Loading notifications with transition states
 * - Automatic or manual notification dismissal
 * - Unique notification IDs for targeting specific notifications
 *
 * This abstraction ensures consistent notification appearance and behavior
 * throughout the application while simplifying the API for common use cases.
 */

// External dependencies
import { notifications } from '@mantine/notifications';
import { FaCheck, FaInfo } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';

// Internal dependencies
import { remToPx } from './styling';

/**
 * Interface for defining the options available when showing a notification.
 */
export interface NotificationOptions {
    /**
     * The title of the notification. Displayed in bold at the top.
     */
    title: string;

    /**
     * The message content of the notification. Displayed below the title.
     * Can be a string or an object (which will be JSON stringified).
     */
    message: string | object;

    /**
     * The type of the notification, which affects its appearance.
     * - 'success': Green notification with checkmark icon
     * - 'error': Red notification with X icon
     * - 'warning': Orange notification with info icon
     * - 'info': Blue notification with info icon
     */
    type: 'success' | 'error' | 'warning' | 'info';

    /**
     * An optional ID to uniquely identify the notification.
     * Useful for updating or closing specific notifications later.
     */
    id?: string;

    /**
     * Determines if the notification should automatically close.
     * - `false`: Notification stays open until manually closed (default)
     * - `true`: Notification closes after the default timeout (typically 4000ms)
     * - `number`: Notification closes after the specified number of milliseconds
     */
    autoClose?: boolean | number;

    /**
     * Optional custom icon to display in the notification.
     * If provided, overrides the default icon for the notification type.
     * Can be any React element (e.g., <MdContentCopy />, <FaDownload />).
     */
    icon?: React.ReactNode;

    /**
     * Optional custom color for the notification.
     * If provided, overrides the default color for the notification type.
     * Can be any Mantine color or CSS color value.
     */
    color?: string;

    /**
     * Optional position for the notification on the screen.
     * Defaults to the global notification position.
     */
    position?: 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center';

    /**
     * Optional flag to enable/disable the loading state.
     * When true, shows a spinner icon regardless of the icon prop.
     */
    loading?: boolean;

    /**
     * Optional flag to hide the close button.
     * When true, users cannot manually dismiss the notification.
     */
    withCloseButton?: boolean;

    /**
     * Optional border style for the notification.
     * When true, adds a colored left border matching the notification type/color.
     */
    withBorder?: boolean;
}

/**
 * Displays a loading notification with a blue color and spinner icon.
 * Use this for operations that may take some time to complete.
 * The notification will remain visible until updated or closed manually.
 *
 * @param id - A unique identifier for the loading notification (required for later updates)
 * @param title - The title of the loading notification
 * @param message - The message content of the loading notification
 *
 * @example
 * ```tsx
 * // Show a loading notification when starting a file upload
 * const uploadId = 'file-upload-123';
 * showLoadingNotification(
 *   uploadId,
 *   'Uploading File',
 *   'Please wait while your document is being uploaded...'
 * );
 *
 * // Later, update the notification when complete
 * finishLoadingNotification(uploadId, 'Upload Complete', 'Your file has been uploaded successfully.');
 * ```
 */
export const showLoadingNotification = (id: string, title: string, message: string) => {
    notifications.show({
        id,
        title,
        message,
        color: 'blue',
        loading: true,
        autoClose: false,
    });
};

/**
 * Updates an existing notification (identified by ID) to indicate the loading has finished.
 * Converts a loading notification to a success notification with a green checkmark.
 * Use this to transition from a loading state to a completion state.
 *
 * @param id - The unique identifier of the notification to update
 * @param [title] - Optional updated title for the notification
 * @param [message] - Optional updated message for the notification
 *
 * @example
 * ```tsx
 * // First show a loading notification
 * showLoadingNotification('data-import', 'Importing Data', 'Please wait...');
 *
 * // When the operation completes, update the notification
 * finishLoadingNotification(
 *   'data-import',
 *   'Import Successful',
 *   'All data has been imported successfully.'
 * );
 *
 * // You can also keep the original title/message by omitting parameters
 * finishLoadingNotification('data-import');  // Just changes to success state
 * ```
 */
export const finishLoadingNotification = (id: string, title?: string, message?: string) => {
    notifications.update({
        id,
        title,
        message,
        loading: false,
        color: 'green',
        autoClose: false,
        icon: <FaCheck />,
    });
};

/**
 * Displays a notification with the specified options.
 * This is the main notification function supporting multiple types of notifications.
 *
 * @param options - The options for the notification
 * @param options.title - The title of the notification
 * @param options.message - The message content of the notification
 * @param options.type - The type of notification ('success', 'error', 'warning', or 'info')
 * @param [options.id] - An optional ID for identifying the notification later
 * @param [options.autoClose=false] - Whether/how long the notification should auto-close
 * @param [options.icon] - Optional custom icon to override the default type icon
 * @param [options.color] - Optional custom color to override the default type color
 * @param [options.position] - Optional position for the notification on screen
 * @param [options.loading] - Optional flag to show loading spinner
 * @param [options.withCloseButton] - Optional flag to show/hide close button
 * @param [options.withBorder] - Optional flag to add colored left border
 *
 * @example
 * ```tsx
 * // Success notification that auto-closes after 3 seconds
 * showNotification({
 *   title: 'Success',
 *   message: 'Your changes have been saved.',
 *   type: 'success',
 *   autoClose: 3000
 * });
 *
 * // Error notification that stays visible until dismissed
 * showNotification({
 *   title: 'Error',
 *   message: 'Could not connect to server. Please try again.',
 *   type: 'error'
 * });
 *
 * // Custom notification with icon and color
 * showNotification({
 *   title: 'Copied!',
 *   message: 'Text copied to clipboard',
 *   type: 'success',
 *   icon: <MdContentCopy />,
 *   color: 'teal',
 *   autoClose: 2000
 * });
 *
 * // Beautiful notification with border
 * showNotification({
 *   title: 'Download Complete',
 *   message: 'Your file has been downloaded successfully.',
 *   type: 'success',
 *   icon: <FaDownload />,
 *   withBorder: true,
 *   autoClose: 3000
 * });
 * ```
 */
export const showNotification = ({
    title,
    message,
    type,
    id,
    autoClose = false,
    icon,
    color,
    position,
    loading,
    withCloseButton,
    withBorder
}: NotificationOptions) => {
    // Determine default color based on type if not provided
    const defaultColor = type === 'success' ? 'green' : type === 'error' ? 'red' : type === 'warning' ? 'orange' : 'blue';
    const notificationColor = color || defaultColor;

    // Determine default icon based on type if not provided
    const defaultIcon = type === 'success'
        ? <FaCheck />
        : type === 'error'
        ? <MdClose size={remToPx(1.5)} />
        : type === 'warning'
        ? <FaInfo size={remToPx(1)} />
        : <FaInfo />;
    const notificationIcon = icon || defaultIcon;

    // Handle object messages by JSON stringifying them
    const displayMessage = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;

    notifications.show({
        title,
        message: displayMessage,
        color: notificationColor,
        id,
        icon: notificationIcon,
        autoClose,
        position,
        loading,
        withCloseButton,
        withBorder,
    });
};

/**
 * Closes a specific notification by its ID.
 * Use this to programmatically dismiss a notification before its auto-close timer expires.
 *
 * @param id - The unique identifier of the notification to close
 *
 * @example
 * ```tsx
 * // Show a notification with a specific ID
 * showNotification({
 *   id: 'welcome-message',
 *   title: 'Welcome Back',
 *   message: 'You have 3 new messages.',
 *   type: 'info'
 * });
 *
 * // Later, close this specific notification
 * closeNotification('welcome-message');
 * ```
 */
export const closeNotification = (id: string) => {
    notifications.hide(id);
};

/**
 * Clears all notifications currently being displayed.
 * Use this when you want to remove all notifications at once,
 * such as during logout or when navigating to a different section.
 *
 * @example
 * ```tsx
 * // Remove all notifications at once
 * clearNotifications();
 *
 * // Typical usage in a logout function
 * function handleLogout() {
 *   clearNotifications();
 *   // Other logout logic...
 *   navigate('/login');
 * }
 * ```
 */
export const clearNotifications = () => {
    notifications.clean();
};
