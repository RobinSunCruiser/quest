/**
 * @module Adapters.OllamaAdapter
 *
 * This module provides integration with Ollama, a local LLM runtime.
 * It implements the abstract LLMAdapter interface for standardized
 * communication with locally-hosted language models through the Ollama API.
 *
 * Features include:
 * - Chat completions and streaming chat completions with cancellation support
 * - Embeddings generation
 * - Model discovery
 * - Availability checks with proper timeout handling
 * - Request queuing for concurrency control
 */

// External dependencies
import { Ollama } from "ollama";

// Internal dependencies
import {
  IChatRoleMessage,
  IModelMetadata,
  IModelOptions,
  createModelMetadata,
} from "../interfaces";
import { LLMAdapter } from "./abstractLLMAdapter";
import log from "../logger";
import { createCustomFetch, KeyManager } from "../utils";

// Constants
const DEFAULT_OLLAMA_BASEURL: string = "http://0.0.0.0:11434";

/**
 * Adapter for Ollama-powered local language models.
 *
 * @class OllamaAdapter
 * @extends LLMAdapter
 */
export class OllamaAdapter extends LLMAdapter {
  /**
   * Creates a new OllamaAdapter instance.
   *
   * @param adapterID - Identifier for the adapter instance
   * @param baseUrl - The base URL of the Ollama API
   * @param apiKey - Optional API key for authenticated Ollama deployments (falls back to {ADAPTER_ID}_API_KEY env variable)
   * @param maxConcurrentRequests - Maximum number of concurrent requests (0 for unlimited)
   */
  constructor(
    adapterID: string,
    baseUrl: string = DEFAULT_OLLAMA_BASEURL,
    apiKey?: string,
    maxConcurrentRequests: number = 1
  ) {
    // Resolve API key (optional for Ollama - no validation error if not found)
    // Use adapter-specific environment variable (e.g., LOCAL_API_KEY, GRAY_API_KEY, LUEBECK_API_KEY)
    const envVarName = `${adapterID.toUpperCase()}_API_KEY`;
    const resolvedKey = KeyManager.resolveApiKey(adapterID, apiKey, envVarName);

    super(
      adapterID,
      baseUrl,
      "ollama",
      resolvedKey ?? undefined,
      maxConcurrentRequests
    );
  }

  /**
   * Creates an Ollama client instance with abort signal support.
   *
   * @private
   * @param signal - Optional abort signal to cancel requests
   * @returns An Ollama client instance with signal support
   */
  private _createOllamaWithSignal(signal?: AbortSignal): Ollama {
    const config: any = {
      host: this.baseUrl,
      fetch: createCustomFetch(signal),
    };

    // Add Authorization header if API key is provided
    if (this.apiKey) {
      config.headers = {
        Authorization: `Bearer ${this.apiKey}`,
      };
    }

    return new Ollama(config);
  }

  /**
   * Lists all available models from the Ollama API.
   *
   * @returns Array of model names available on the Ollama server
   * @throws Error if the request fails, times out, or returns invalid data
   */
  async listModels(): Promise<string[]> {
    try {
      // Create an abort controller for timeout enforcement
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 10 second timeout

      // Create Ollama instance with the abort signal
      const ollama = this._createOllamaWithSignal(controller.signal);

      try {
        // Fetch model list from the Ollama API
        const response = await ollama.list();

        // Validate response structure to ensure it contains models
        if (!response || !Array.isArray(response.models)) {
          throw new Error("Invalid response format from Ollama API");
        }

        // Extract and validate model names from the response
        const modelNames = response.models
          .filter((model: any) => model && typeof model.name === "string")
          .map((model: any) => model.name);

        log.debug(
          `Retrieved ${modelNames.length} models from Ollama API`,
          "OllamaAdapter"
        );
        return modelNames;
      } finally {
        // Always clear the timeout to prevent memory leaks
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Categorize errors for better diagnostics
      if (error instanceof Error && error.name === "AbortError") {
        log.error(
          `Timeout while fetching models from Ollama API`,
          "OllamaAdapter"
        );
        throw new Error(`Server/OllamaAdapter: Request timed out`);
      } else {
        log.error(
          `Failed to fetch models from Ollama API: ${errorMessage}`,
          "OllamaAdapter"
        );
        throw new Error(`Server/OllamaAdapter: ${errorMessage}`);
      }
    }
  }

  /**
   * Checks if the Ollama API is available and responding.
   *
   * @returns True if the API is available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Use a short timeout for availability checks to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      // Create Ollama instance with the abort signal
      const ollama = this._createOllamaWithSignal(controller.signal);

      try {
        // Try listing models as a simple health check
        await ollama.list();
        return true; // If we get here, the API is available
      } finally {
        // Clean up the timeout
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Log availability issues at debug level since they may be expected
      log.debug(`Ollama API not available: ${errorMessage}`, "OllamaAdapter");
      return false;
    }
  }

  /**
   * Generates embeddings for the provided texts using the specified model.
   *
   * @param model - The model to use for generating embeddings
   * @param texts - Array of text strings to embed
   * @param timeout - Maximum time in milliseconds before the request is aborted
   * @returns 2D array of embedding vectors
   * @throws Error if the request fails, times out, or returns invalid data
   */
  async getEmbeddings(
    model: string,
    texts: string[],
    timeout: number
  ): Promise<number[][]> {
    const embeddings: number[][] = [];
    try {
      // Set up timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Create Ollama instance with the abort signal
      const ollama = this._createOllamaWithSignal(controller.signal);

      try {
        // Process each text separately to get embeddings
        for (const text of texts) {
          // Check for abortion before each request to fail fast
          if (controller.signal.aborted) {
            throw new DOMException(
              "TimeoutError",
              `Request timed out after ${timeout} ms`
            );
          }

          // Get embeddings for the current text
          const response = await ollama.embeddings({
            model: model,
            prompt: text,
          });

          // Validate and store the embeddings
          if (response && Array.isArray(response.embedding)) {
            embeddings.push(response.embedding);
          } else {
            throw new Error("Invalid embedding response from Ollama API");
          }
        }

        return embeddings;
      } finally {
        // Clean up timeout
        if (timeoutId) clearTimeout(timeoutId);
      }
    } catch (error) {
      // Handle abort errors differently from other errors
      if (error instanceof Error && error.name === "AbortError") {
        log.debug(
          `Embedding request aborted in Ollama API: ${error}`,
          "OllamaAdapter"
        );
        throw error;
      } else {
        log.error(
          `Error fetching embeddings from Ollama API: ${error}`,
          "OllamaAdapter"
        );
        throw new Error(`Server/OllamaAdapter Error: ${String(error)}`);
      }
    }
  }

  /**
   * Forwards a chat request to the Ollama API with optional streaming support.
   *
   * @param model - The Ollama model identifier to use (e.g., "llama2", "mistral")
   * @param messages - Array of conversation messages with roles and content
   * @param options - Model-specific options for the request
   * @param signal - AbortSignal for cancellation support
   * @param requestID - Unique identifier for tracking this request in the queue
   * @param onChunk - Optional callback for streaming chunks. If provided, enables streaming mode.
   * @returns A Promise resolving to the complete text response from the model
   * @throws Error if the request fails, is aborted, or returns invalid data
   */
  async forwardRequest(
    model: string,
    messages: IChatRoleMessage[],
    options: IModelOptions,
    signal: AbortSignal,
    requestID: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    return this.requestQueue.add(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { stream, ...restOptions } = options;
        const ollama = this._createOllamaWithSignal(signal);

        if (onChunk) {
          return await this.handleStreamingRequest(
            ollama,
            model,
            messages,
            restOptions,
            signal,
            onChunk
          );
        } else {
          return await this.handleNonStreamingRequest(
            ollama,
            model,
            messages,
            restOptions
          );
        }
      } catch (error) {
        return this.handleRequestError(error);
      }
    }, requestID);
  }

  /**
   * Handles non-streaming Ollama API requests.
   */
  private async handleNonStreamingRequest(
    ollama: any,
    model: string,
    messages: IChatRoleMessage[],
    options: Omit<IModelOptions, "stream">
  ): Promise<string> {
    const response = await ollama.chat({
      model: model,
      messages: messages,
      stream: false,
      options: {
        ...options,
      },
    });

    const thinking = response.message.thinking;
    const content = response.message.content.trim();

    if (thinking && thinking.trim()) {
      return `<think>\n${thinking.trim()}\n</think>\n${content}`;
    }
    return content;
  }

  /**
   * Handles streaming Ollama API requests using native streaming capabilities.
   */
  private async handleStreamingRequest(
    ollama: any,
    model: string,
    messages: IChatRoleMessage[],
    options: Omit<IModelOptions, "stream">,
    signal: AbortSignal,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    let fullResponse = "";

    if (signal.aborted) {
      throw new DOMException("Request aborted", "AbortError");
    }

    const response = await ollama.chat({
      model: model,
      messages: messages,
      stream: true,
      options: {
        ...options,
      },
    });

    let emittedThinkOpen = false;
    let emittedThinkClose = false;

    for await (const partialResponse of response) {
      if (signal.aborted) {
        throw new DOMException("Request aborted", "AbortError");
      }

      const thinkingChunk = partialResponse.message.thinking;
      const contentChunk = partialResponse.message.content;

      // Handle thinking chunks
      if (thinkingChunk) {
        if (!emittedThinkOpen) {
          const openTag = "<think>\n";
          onChunk(openTag);
          fullResponse += openTag;
          emittedThinkOpen = true;
        }
        onChunk(thinkingChunk);
        fullResponse += thinkingChunk;
      }

      // Handle content chunks
      if (contentChunk) {
        if (emittedThinkOpen && !emittedThinkClose) {
          const closeTag = "\n</think>\n";
          onChunk(closeTag);
          fullResponse += closeTag;
          emittedThinkClose = true;
        }
        onChunk(contentChunk);
        fullResponse += contentChunk;
      }

      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    // Close thinking tag if opened but no content followed
    if (emittedThinkOpen && !emittedThinkClose) {
      const closeTag = "\n</think>\n";
      onChunk(closeTag);
      fullResponse += closeTag;
    }

    return fullResponse;
  }

  /**
   * Handles request errors with consistent error formatting.
   */
  private handleRequestError(error: unknown): never {
    if (error instanceof Error && error.name === "AbortError") {
      log.debug(`Request aborted in Ollama API: ${error}`, "OllamaAdapter");
      throw error;
    } else {
      log.error(
        `Error communicating with Ollama API: ${error}`,
        "OllamaAdapter"
      );
      throw new Error(`Server/OllamaAdapter Error: ${String(error)}`);
    }
  }

  /**
   * Gets detailed metadata for a specific model from the Ollama API.
   * Uses the /api/show endpoint to retrieve model information including
   * parameter size, quantization level, model family, and context window.
   *
   * Maps the Ollama response to IModelMetadata fields and flattens all remaining
   * properties into the dynamic metadata field.
   *
   * @param modelName - The name of the model to get details for
   * @returns Object containing model metadata conforming to IModelMetadata interface
   */
  async getModelDetails(modelName: string): Promise<IModelMetadata> {
    try {
      // Create an abort controller for timeout enforcement
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      // Create Ollama instance with the abort signal
      const ollama = this._createOllamaWithSignal(controller.signal);

      try {
        // Fetch model details from the Ollama API
        const response = await ollama.show({ model: modelName });

        // Initialize metadata with IModelMetadata structure (all standard fields)
        const partialMetadata: Partial<IModelMetadata> = {};

        // Map to IModelMetadata predefined fields (using camelCase)
        if (response.details) {
          // Map family field
          if (response.details.family) {
            partialMetadata.family = response.details.family;
          }

          // Map parameterSize field
          if (response.details.parameter_size) {
            partialMetadata.parameterSize = response.details.parameter_size;
          }

          // Map quantization field
          if (response.details.quantization_level) {
            partialMetadata.quantization = response.details.quantization_level;
          }

          // Map format field
          if (response.details.format) {
            partialMetadata.format = response.details.format;
          }

          // Map parentModel field
          if (response.details.parent_model) {
            partialMetadata.parentModel = response.details.parent_model;
          }

          // Map families field
          if (response.details.families) {
            partialMetadata.families = response.details.families;
          }

          // Flatten remaining details fields as dynamic metadata
          const knownDetailsFields = [
            "family",
            "parameter_size",
            "quantization_level",
            "format",
            "parent_model",
            "families",
          ];
          for (const [key, value] of Object.entries(response.details)) {
            if (!knownDetailsFields.includes(key)) {
              partialMetadata[key] = value;
            }
          }
        }

        // Map template field
        if (response.template) {
          partialMetadata.template = response.template;
        }

        // Map license field
        if (response.license) {
          partialMetadata.license = response.license;
        }

        // Map system field
        if (response.system) {
          partialMetadata.system = response.system;
        }

        // Extract contextLength from modelfile parameters
        if (response.modelfile) {
          const numCtxMatch = response.modelfile.match(
            /PARAMETER\s+num_ctx\s+(\d+)/i
          );
          if (numCtxMatch) {
            partialMetadata.contextLength = parseInt(numCtxMatch[1], 10);
          }

          // Add full modelfile as dynamic metadata
          partialMetadata.modelfile = response.modelfile;
        }

        // Extract contextLength from parameters string if not found in modelfile
        if (partialMetadata.contextLength === null && response.parameters) {
          const params = response.parameters.split("\n");
          for (const param of params) {
            const match = param.match(/num_ctx\s+(\d+)/);
            if (match) {
              partialMetadata.contextLength = parseInt(match[1], 10);
              break;
            }
          }
          // Add full parameters string as dynamic metadata
          partialMetadata.parameters = response.parameters;
        }

        // Extract tokenizerGgmlModel from model_info if available
        const responseAny = response as any;
        if (responseAny.model_info) {
          const modelInfo = responseAny.model_info;

          // Look for tokenizer-related fields
          if (modelInfo["tokenizer.ggml.model"]) {
            partialMetadata.tokenizerGgmlModel = modelInfo["tokenizer.ggml.model"];
          }

          // Get model family for prefix stripping (lowercase, no special chars)
          const familyPrefix = partialMetadata.family
            ? partialMetadata.family.toLowerCase().replace(/[^a-z0-9]/g, '')
            : null;

          // Flatten all model_info fields as dynamic metadata
          for (const [key, value] of Object.entries(modelInfo)) {
            // Skip if it's the tokenizer field we already mapped
            if (key === "tokenizer.ggml.model") continue;

            // Convert dot notation and underscores to camelCase
            let processedKey = key
              .replace(/\.([a-z])/g, (_, letter) => letter.toUpperCase())
              .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

            // Strip family prefix if present (e.g., "llama.context_length" -> "contextLength")
            if (familyPrefix && processedKey.toLowerCase().startsWith(familyPrefix)) {
              processedKey = processedKey.substring(familyPrefix.length);
              // Ensure first character is lowercase after stripping prefix
              if (processedKey.length > 0) {
                processedKey = processedKey.charAt(0).toLowerCase() + processedKey.slice(1);
              }
            }

            // Map to standard fields if they match known patterns
            const isContextLength = processedKey === 'contextLength' || processedKey === 'context_length' || key.includes('context_length');

            if (isContextLength && (partialMetadata.contextLength === null || partialMetadata.contextLength === undefined)) {
              partialMetadata.contextLength = value as number;
              // Don't add to dynamic metadata if mapped to standard field
            } else if (!isContextLength) {
              // Add as dynamic metadata only if not a context length field
              partialMetadata[processedKey] = value;
            }
          }
        }

        // Extract size and digest
        if (responseAny.size) {
          partialMetadata.sizeBytes = responseAny.size;
        }

        if (responseAny.digest) {
          partialMetadata.digest = responseAny.digest;
        }

        if (responseAny.modified_at) {
          partialMetadata.modifiedAt = responseAny.modified_at;
        }

        // Flatten ALL remaining top-level response fields as dynamic metadata
        // Only skip the fields we've already explicitly processed
        const processedTopLevelFields = [
          "details",
          "template",
          "license",
          "system",
          "modelfile",
          "parameters",
          "model_info",
          "size",
          "digest",
          "modified_at",
        ];

        for (const [key, value] of Object.entries(response)) {
          if (!processedTopLevelFields.includes(key)) {
            partialMetadata[key] = value;
          }
        }

        log.debug(
          `Retrieved and mapped metadata for model ${modelName}`,
          "OllamaAdapter"
        );

        // Create complete metadata with all standard fields
        return createModelMetadata(partialMetadata);
      } finally {
        // Always clear the timeout to prevent memory leaks
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      log.warn(
        `Failed to fetch metadata for model ${modelName}: ${errorMessage}`,
        "OllamaAdapter"
      );

      // Return metadata with all standard fields as undefined on error
      return createModelMetadata({});
    }
  }
}

export default OllamaAdapter;
