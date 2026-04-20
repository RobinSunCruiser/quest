/**
 * @module Adapters.AbstractLLMAdapter
 *
 * This module defines the abstract base class for all LLM service adapters.
 * It provides a common interface and shared functionality that all LLM
 * provider implementations must conform to.
 */

import { IChatRoleMessage, IModelOptions, IModelMetadata } from "../interfaces";
import { RequestQueue } from "./RequestQueue";

/**
 * Abstract base class for all LLM (Large Language Model) adapters.
 *
 * This class defines the contract that all LLM provider implementations
 * must follow. It provides common functionality like request queueing and
 * standardized accessor methods, while requiring provider-specific
 * implementations of core LLM operations.
 *
 * @abstract
 */
export abstract class LLMAdapter {
  /** Identifier for the adapter instance */
  protected adapterID: string;

  /** Base URL for the LLM provider's API */
  protected baseUrl: string;

  /** Identifier for the LLM provider (e.g., "openai", "ollama") */
  protected provider: string;

  /** Queue for managing concurrent requests to the LLM provider */
  protected requestQueue: RequestQueue;

  /** Optional API key for authenticated providers */
  protected apiKey?: string;

  /**
   * Creates a new LLM adapter instance.
   *
   * @param adapterID - Identifier for the adapter instance
   * @param baseUrl - The base URL for the LLM provider's API
   * @param provider - Identifier string for the provider (e.g., "openai", "ollama")
   * @param apiKey - Optional API key for authentication with the provider
   * @param maxConcurrentRequests - Optional limit for concurrent requests (0 for unlimited)
   */
  constructor(
    adapterID: string,
    baseUrl: string,
    provider: string,
    apiKey?: string,
    maxConcurrentRequests?: number
  ) {
    this.adapterID = adapterID;
    this.baseUrl = baseUrl;
    this.provider = provider;
    this.apiKey = apiKey;
    this.requestQueue = new RequestQueue(maxConcurrentRequests);
  }

  /**
   * Gets the request queue instance for this adapter.
   *
   * @returns The RequestQueue instance managing concurrent requests
   */
  public getRequestQueue(): RequestQueue {
    return this.requestQueue;
  }

  /**
   * Gets the provider identifier for this adapter.
   *
   * @returns String identifier for the LLM provider
   */
  public getProvider(): string {
    return this.provider;
  }

  /**
   * Gets the base URL for the LLM provider's API.
   *
   * @returns The base URL string
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Forwards a chat request to the LLM provider with optional streaming support.
   *
   * @param model - The model identifier to use for this request
   * @param messages - Array of chat messages to send to the model
   * @param options - Model-specific options for the request (e.g., temperature, max tokens)
   * @param signal - AbortSignal for cancelling the request
   * @param requestID - Unique identifier for tracking the request
   * @param onChunk - Optional callback function to handle streaming chunks. If provided, enables streaming mode.
   * @returns Promise resolving to the model's response text
   * @throws Error if the request fails or is aborted
   */
  abstract forwardRequest(
    model: string,
    messages: IChatRoleMessage[],
    options: IModelOptions,
    signal: AbortSignal,
    requestID: string,
    onChunk?: (chunk: string) => void
  ): Promise<string>;

  /**
   * Gets vector embeddings for the provided texts.
   *
   * @param model - The embedding model identifier to use
   * @param texts - Array of text strings to embed
   * @param timeout - Timeout in milliseconds after which the request will be aborted
   * @returns Promise resolving to a 2D array of embedding vectors
   * @throws Error if the request fails or times out
   */
  abstract getEmbeddings(
    model: string,
    texts: string[],
    timeout: number
  ): Promise<number[][]>;

  /**
   * Lists all available models from the provider.
   *
   * @returns Promise resolving to an array of model identifier strings
   * @throws Error if the request fails or the provider is unavailable
   */
  abstract listModels(): Promise<string[]>;

  /**
   * Checks if the LLM provider is available and responding.
   *
   * @returns Promise resolving to true if the provider is available, false otherwise
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Gets detailed metadata for a specific model.
   *
   * Returns provider-specific information such as context window size, parameter count,
   * quantization level, model family, and other relevant details. The exact fields
   * returned depend on the provider and what information is available.
   *
   * @param modelName - The name of the model to get details for
   * @returns Promise resolving to a record of metadata key-value pairs
   */
  abstract getModelDetails(modelName: string): Promise<IModelMetadata>;
}
