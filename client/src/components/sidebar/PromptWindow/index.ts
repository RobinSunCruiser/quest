/**
 * @fileoverview Entry point for the PromptWindow component module.
 * Provides both standard and advanced usage patterns through selective exports.
 * @module Components.Sidebar.PromptWindow
 */

// Main prompt window component - this is what most consumers should use
export { PromptWindowContainer as PromptWindow } from './PromptWindowContainer';

// View component for advanced usage or custom container implementations
export { PromptWindowView } from './PromptWindowView';
