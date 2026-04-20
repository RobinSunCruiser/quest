/**
 * @fileoverview Entry point for the CustomMessageEditor component module.
 * Provides both simplified and advanced usage patterns through selective exports.
 * @module Components.Sidebar.CustomMessageEditor
 */

// Main export - simplified API for standard usage
export { CustomMessageEditorContainer as CustomMessageEditor } from './CustomMessageEditorContainer';

// Advanced exports for component composition and testing
export { CustomMessageEditorContainer, type CustomMessageEditorContainerProps } from './CustomMessageEditorContainer';
export { CustomMessageEditorView, type CustomMessageEditorViewProps } from './CustomMessageEditorView';

// Convenience re-export of related types
export type { ICustomMessage } from '@root/server/src/interfaces';
