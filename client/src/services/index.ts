/**
 * @module Services
 *
 * This barrel file provides a centralized export point for all service modules in the application.
 * It simplifies imports by allowing consumers to import multiple services from a single path
 * rather than having to import each service from its individual file.
 *
 * Services exported:
 * - Socket communication services (socketService, SocketService, EventEmitter)
 * - Language model services (llmService, LLMService, LLMSession)
 * - Global state management (GlobalStateProvider and related utilities)
 */

export { default as socketService, SocketService, EventEmitter } from './socketService';
export { default as llmService, LLMService, LLMSession } from './LLMService';
export { default as authService, AuthService, type AuthState } from './authService';
export { ragService, RAGService, type IRAGConfig, type IStoredDocument } from './ragService';
export * from './globalStateContext.tsx';
