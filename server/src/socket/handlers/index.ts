/**
 * @module Socket.Handlers
 *
 * This module serves as the central export point for all socket event handlers
 * used throughout the application. These handlers manage bi-directional
 * communication between clients and the server for various features:
 *
 * - LLM interaction: Forwarding requests to language models and listing available models
 * - System management: Adapter reinitialization and configuration
 * - Model evaluation: Comparing outputs across different models using various similarity metrics
 *
 * Each handler implements the necessary logic to process incoming socket events,
 * perform requested operations, and send appropriate responses back to clients.
 */

// LLM interaction handlers
export { forwardToLLMAdapter, listLLMs, abortLLMRequest } from "./llmHander";

// Adapter management handlers
export { reinitAdapters } from "./adapterHandler";

// Model evaluation handlers
export { evaluate } from "./evalHandler";

// RAG (Retrieval Augmented Generation) handlers
export { handleEmbedRequest, handleQueryRequest } from "./ragHandler";
