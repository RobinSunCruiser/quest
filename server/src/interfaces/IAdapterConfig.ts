/**
 * @module Interfaces.IAdapterConfig
 *
 * This module defines the interface for LLM adapter configurations.
 * It specifies the common configuration properties required by all
 * language model adapters in the system.
 */

/**
 * Interface representing configuration for an LLM adapter.
 *
 * Each adapter requires specific configuration options to connect
 * to its respective LLM service provider. This interface standardizes
 * these configuration requirements across different adapter implementations.
 */
export interface IAdapterConfig {
  /** Base URL for the LLM provider's API endpoint */
  baseUrl: string;

  /** Provider identifier (e.g., "openai", "ollama") */
  provider: string;

  /**
   * Array of regex patterns to filter available models
   * Only models matching at least one pattern will be included
   */
  modelFilter: string[];

  /** Maximum number of concurrent requests (0 or undefined for unlimited) */
  maxConcurrentRequests?: number;

  /** Optional API key for authenticated services */
  apiKey?: string;
}
