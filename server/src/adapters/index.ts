/**
 * @module Adapters
 *
 * This module exports LLM (Large Language Model) adapters that provide a consistent
 * interface to different AI/LLM providers. Each adapter implements the LLMAdapter
 * abstract class and handles provider-specific API interactions while maintaining
 * a common interface for client code.
 *
 * Available adapters:
 * - OllamaAdapter: For Ollama-powered local LLMs
 * - OpenAIAdapter: For OpenAI API-based models
 *
 * The module also exports the llmAdapterManager singleton which provides:
 * - Centralized management of multiple adapters
 * - Request handling and routing
 * - Graceful error handling
 * - Request abortion capabilities
 */

export { LLMAdapter } from "./abstractLLMAdapter";
export { RequestQueue } from "./RequestQueue";
export { OllamaAdapter } from "./OllamaAdapter";
export { OpenAIAdapter } from "./OpenAIAdapter";
export { PerplexityAIAdapter } from "./PerplexityAIAdapter";
export { AnthropicAdapter } from "./AnthropicAdapter";
export { default as llmAdapterManager } from "./LLMAdapterManager";
