/**
 * @module Adapters.OpenAIAdapter
 *
 * This module provides integration with the OpenAI API for accessing
 * cloud-hosted language models. It implements the abstract LLMAdapter interface
 * for standardized communication with OpenAI's models.
 *
 * Features include:
 * - Chat completions and streaming chat completions with cancellation support
 * - Embeddings generation
 * - Model discovery
 * - Availability checks with proper timeout handling
 * - Request queuing for concurrency control
 * - Automatic API key loading from environment variables
 */

// External dependencies
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Internal dependencies
import {
  IChatRoleMessage,
  IModelMetadata,
  IModelOptions,
  createModelMetadata,
} from "../interfaces";
import { LLMAdapter } from "./abstractLLMAdapter";
import log from "../logger";
import { KeyManager, metadataService } from "../utils";

// Constants
const DEFAULT_OPENAI_BASEURL: string = "https://api.openai.com/v1";

/**
 * Adapter for OpenAI-powered cloud language models.
 *
 * @class OpenAIAdapter
 * @extends LLMAdapter
 */
export class OpenAIAdapter extends LLMAdapter {
  /** OpenAI client instance */
  private openAI: OpenAI;

  /**
   * Creates a new OpenAIAdapter instance.
   *
   * @param adapterID - Identifier for the adapter instance
   * @param baseUrl - The base URL of the OpenAI API
   * @param apiKey - Optional API key for authentication (falls back to OPENAI_API_KEY env variable)
   * @param maxConcurrentRequests - Maximum number of concurrent requests (0 for unlimited)
   * @throws Error if no API key is found
   */
  constructor(
    adapterID: string,
    baseUrl: string = DEFAULT_OPENAI_BASEURL,
    apiKey?: string,
    maxConcurrentRequests: number = 1
  ) {
    // Resolve and validate the API
    const resolvedKey = KeyManager.resolveApiKey(
      adapterID,
      apiKey,
      "OPENAI_API_KEY"
    );

    // Validate the resolved API key
    const validatedKey = KeyManager.validateKeyOrThrow(
      adapterID,
      resolvedKey,
      "OPENAI_API_KEY"
    );
    super(adapterID, baseUrl, "openai", validatedKey, maxConcurrentRequests);
    this.apiKey = validatedKey;
    this.openAI = new OpenAI({ apiKey: validatedKey, baseURL: baseUrl });
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
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () =>
          controller.abort(new Error(`Request timed out after ${timeout}ms`)),
        timeout
      );

      try {
        // Request embeddings from OpenAI API
        const response = await this.openAI.embeddings.create(
          {
            model: model,
            input: texts,
          },
          { signal: controller.signal }
        );

        // Validate response structure
        if (!response.data || !Array.isArray(response.data)) {
          throw new Error("Invalid response format from OpenAI API");
        }

        // Extract and validate individual embeddings
        const embeddings = response.data.map((item) => {
          if (!item.embedding || !Array.isArray(item.embedding)) {
            throw new Error("Missing or invalid embedding in OpenAI response");
          }
          return item.embedding;
        });

        return embeddings;
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
          `Timeout while fetching embeddings from OpenAI API`,
          "OpenAIAdapter"
        );
        throw new Error(`Server/OpenAIAdapter: Embedding request timed out`);
      } else {
        log.error(
          `Error fetching embeddings with OpenAI API: ${errorMessage}`,
          "OpenAIAdapter"
        );
        throw new Error(`Server/OpenAIAdapter: ${errorMessage}`);
      }
    }
  }

  /**
   * Forwards a chat request to the OpenAI API with optional streaming support.
   *
   * @param model - The OpenAI model identifier to use (e.g., "gpt-4", "gpt-3.5-turbo")
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

        if (onChunk) {
          return await this.handleStreamingRequest(
            model,
            messages,
            restOptions,
            signal,
            onChunk
          );
        } else {
          return await this.handleNonStreamingRequest(
            model,
            messages,
            restOptions,
            signal
          );
        }
      } catch (error) {
        return this.handleRequestError(error);
      }
    }, requestID);
  }

  /**
   * Handles non-streaming OpenAI API requests using the official SDK.
   */
  private async handleNonStreamingRequest(
    model: string,
    messages: IChatRoleMessage[],
    options: Omit<IModelOptions, "stream">,
    signal: AbortSignal
  ): Promise<string> {
    const completion = await this.openAI.chat.completions.create(
      {
        messages: messages as ChatCompletionMessageParam[],
        model: model,
        stream: false,
        ...options,
      },
      { signal }
    );

    const message = completion.choices[0].message;
    const assistantMessage = message.content;
    const reasoningContent = (message as any).reasoning_content;

    if (!assistantMessage && !reasoningContent) {
      throw new Error("Response of assistant is empty");
    }

    const content = (assistantMessage || "").trim();

    if (reasoningContent && reasoningContent.trim()) {
      return `<think>\n${reasoningContent.trim()}\n</think>\n${content}`;
    }

    if (!content) {
      throw new Error("Response of assistant is empty");
    }

    return content;
  }

  /**
   * Handles streaming OpenAI API requests using fetch for proper stream control.
   * Uses raw fetch API instead of OpenAI SDK for better socket.io integration.
   */
  private async handleStreamingRequest(
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

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true,
        ...options,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("ReadableStream not supported in this environment");
    }

    const reader = response.body.getReader();

    if (signal.aborted) {
      reader.cancel();
      throw new DOMException("Request aborted", "AbortError");
    }

    let emittedThinkOpen = false;
    let emittedThinkClose = false;

    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsedData = JSON.parse(data);
            const delta = parsedData.choices[0]?.delta;
            const reasoningContent = delta?.reasoning_content || "";
            const content = delta?.content || "";

            if (signal.aborted) {
              await reader.cancel();
              throw new DOMException("Request aborted", "AbortError");
            }

            // Handle reasoning_content chunks
            if (reasoningContent) {
              if (!emittedThinkOpen) {
                const openTag = "<think>\n";
                onChunk(openTag);
                fullResponse += openTag;
                emittedThinkOpen = true;
              }
              onChunk(reasoningContent);
              fullResponse += reasoningContent;
            }

            // Handle content chunks
            if (content) {
              if (emittedThinkOpen && !emittedThinkClose) {
                const closeTag = "\n</think>\n";
                onChunk(closeTag);
                fullResponse += closeTag;
                emittedThinkClose = true;
              }
              fullResponse += content;
              await new Promise((resolve) => setTimeout(resolve, 10));
              onChunk(content);
            }
          } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
              throw error;
            }
            log.debug(`Error parsing JSON response: ${error}`, "OpenAIAdapter");
          }
        }
      }
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
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      (error instanceof Error && error.name === "AbortError") ||
      errorMessage === "Request was aborted."
    ) {
      log.debug(
        `Request aborted in OpenAI API: ${errorMessage}`,
        "OpenAIAdapter"
      );
      throw new Error(`Server/OpenAIAdapter: Request aborted`);
    } else {
      log.error(
        `Error communicating with OpenAI API: ${errorMessage}`,
        "OpenAIAdapter"
      );
      throw new Error(`Server/OpenAIAdapter: ${errorMessage}`);
    }
  }

  /**
   * Lists all available models from the OpenAI API.
   *
   * @returns Array of model IDs available through the OpenAI API
   * @throws Error if the request fails, times out, or returns invalid data
   */
  async listModels(): Promise<string[]> {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 10 second timeout

      try {
        // Request model list from OpenAI API
        const response = await this.openAI.models.list({
          signal: controller.signal,
        });

        // Extract and validate model IDs
        const models = response.data
          .filter((model) => model && typeof model.id === "string")
          .map((model) => model.id);

        log.debug(
          `Retrieved ${models.length} models from OpenAI API`,
          "OpenAIAdapter"
        );
        return models;
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
          `Timeout while fetching models from OpenAI API`,
          "OpenAIAdapter"
        );
        throw new Error(`Server/OpenAIAdapter: Request timed out`);
      } else {
        log.error(
          `Failed to fetch models from OpenAI API: ${errorMessage}`,
          "OpenAIAdapter"
        );
        throw new Error(`Server/OpenAIAdapter: ${errorMessage}`);
      }
    }
  }

  /**
   * Checks if the OpenAI API is available and responding.
   *
   * @returns True if the API is available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Use a short timeout for availability check
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        // Try listing models as a simple health check
        await this.openAI.models.list({ signal: controller.signal });
        return true;
      } catch {
        return false;
      } finally {
        // Clean up the timeout
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      log.debug(`OpenAI API not available: ${errorMessage}`, "OpenAIAdapter");
      return false;
    }
  }

  /**
   * Gets detailed metadata for a specific OpenAI model.
   * Uses the MetadataService to fetch metadata from LiteLLM database.
   *
   * @param modelName - The name of the model to get details for
   * @returns Object containing model metadata (context window, pricing, capabilities)
   */
  async getModelDetails(modelName: string): Promise<IModelMetadata> {
    // OpenAI API does not provide detailed metadata via API
    // Use MetadataService to fetch from LiteLLM database
    return metadataService.getModelMetadata("openai", modelName);
  }
}

export default OpenAIAdapter;
