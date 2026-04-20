/**
 * @fileoverview Entry point for chat history components, providing a clean import interface.
 * Exports the main container component and individual components for advanced usage.
 * @module Components.Main.ChatHistory
 */

/** Main chat history container component renamed for cleaner consumer imports */
export { ChatHistoryContainer as ChatHistory } from './ChatHistoryContainer';

export type { IChatRoleMessage } from '@root/server/src/interfaces';
