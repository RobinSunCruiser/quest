/**
 * @fileoverview Barrel exports for all custom React hooks used throughout the QUEST application.
 * Provides centralized access to hooks that manage authentication, chat operations, model integrations,
 * evaluation systems, and persistent state management.
 *
 * @module Hooks
 * @see {@link https://react.dev/reference/react#custom-hooks} React Custom Hooks Documentation
 */

// Integration hooks for external service connections
export { useLLMServiceIntegration, useModelServiceIntegration, useBatchModelManager } from './integrations';

// Core application functionality hooks
export { useAuthentication } from './useAuthentication';
export { useAutomaticConsensus } from './useAutomaticConsensus';
export { useChatOperations } from './useChatOperations';
export { useControlMenu } from './useControlMenu';
export { useEvaluation } from './useEvaluation';

// Project and state management hooks
export { useLoadProject } from './useLoadProject';
export { useSaveProject } from './useSaveProject';

// Chat interaction and backend communication hooks
export { usePromptSubmit } from './usePromptSubmit';
export { useReloadBackend } from './useReloadBackend';
export { useSocketCheck } from './useSocketCheck';

// Utility hooks
export { usePersistedState, usePersistedStateWrite, loadPersistedValue, savePersistedValue, clearPersistedValue } from './usePersistedState';

/**
 * Hook categories overview:
 *
 * Integration Hooks:
 * - useLLMServiceIntegration: Manages connections to language model services
 * - useModelServiceIntegration: Handles model adapter integrations
 *
 * Core Application Hooks:
 * - useAuthentication: JWT-based authentication with the QUEST server
 * - useAutomaticConsensus: Automatic consensus detection and custom message tracking
 * - useChatOperations: Chat history management and message operations
 * - useControlMenu: Model synchronization and chat control functionality
 * - useEvaluation: Multi-metric response evaluation (cosine, Levenshtein, Jaccard)
 *
 * State Management Hooks:
 * - useLoadProject: Project import functionality with validation
 * - useSaveProject: Project export with complete application state
 *
 * Communication Hooks:
 * - usePromptSubmit: Message submission to multiple language models
 * - useReloadBackend: Dynamic adapter reinitialization
 * - useSocketCheck: Real-time WebSocket connection monitoring
 */
