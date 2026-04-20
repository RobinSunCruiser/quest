/**
 * @module Adapters.PerplexityAIAdapter
 *
 * This module provides integration with the Perplexity AI API for accessing
 * cloud-hosted language models. It implements the abstract LLMAdapter interface
 * for standardized communication with Perplexity AI's models.
 *
 * Note: As of March 2024, Perplexity AI may not have a dedicated models endpoint.
 * This implementation uses a placeholder approach for listing available models.
 * Also, Perplexity AI does not support embeddings as of March 2024. *
 */

// Internal dependencies
import {
  IChatRoleMessage,
  IModelMetadata,
  IModelOptions,
  createModelMetadata,
} from "../interfaces";
import { LLMAdapter } from "./abstractLLMAdapter";
import log from "../logger";
import { createCustomFetch, KeyManager, metadataService } from "../utils";

// Constants
const DEFAULT_PERPLEXITYAI_BASEURL: string = "https://api.perplexity.ai";

/**
 * Adapter for Perplexity AI cloud language models.
 *
 * @class PerplexityAIAdapter
 * @extends LLMAdapter
 */
export class PerplexityAIAdapter extends LLMAdapter {
  /**
   * Creates a new PerplexityAIAdapter instance.
   *
   * @param adapterID - Identifier for the adapter instance
   * @param baseUrl - The base URL of the Perplexity API
   * @param apiKey - API key required for Perplexity AI
   * @param maxConcurrentRequests - Maximum number of concurrent requests (0 for unlimited)
   */
  constructor(
    adapterID: string,
    baseUrl: string = DEFAULT_PERPLEXITYAI_BASEURL,
    apiKey?: string,
    maxConcurrentRequests: number = 1
  ) {
    // Resolve and validate the API
    const resolvedKey = KeyManager.resolveApiKey(
      adapterID,
      apiKey,
      "PERPLEXITYAI_API_KEY"
    );

    // Validate the resolved API key
    const validatedKey = KeyManager.validateKeyOrThrow(
      adapterID,
      resolvedKey,
      "PERPLEXITYAI_API_KEY"
    );

    super(
      adapterID,
      baseUrl,
      "perplexityai",
      validatedKey,
      maxConcurrentRequests
    );

    this.apiKey = validatedKey;
  }

  /**
   * Lists all available models from the Perplexity AI API.
   *
   * Note: As of March 2024, Perplexity may not have a dedicated models endpoint.
   *
   * @returns Array of model names available on the Perplexity server
   * @throws Error if the request fails, times out, or returns invalid data
   */
  async listModels(): Promise<string[]> {
    try {
      // Perplexity doesn't have a dedicated models endpoint, so we'll return the supported models
      // These could be updated based on Perplexity's documentation
      return [
        "sonar",
        "sonar-pro",
        "sonar-deep-research",
        "sonar-reasoning",
        "sonar-reasoning-pro",
      ];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      log.error(
        `Failed to get models from Perplexity AI: ${errorMessage}`,
        "PerplexityAIAdapter"
      );
      throw new Error(`Server/PerplexityAIAdapter: ${errorMessage}`);
    }
  }

  /**
   * Checks if the Perplexity AI API is available and responding.
   *
   * @returns True if the API is available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Use a short timeout for availability checks to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        // Make a simple request to check if the API is responsive
        const response = await createCustomFetch(
          controller.signal,
          this.apiKey
        )(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          body: JSON.stringify({
            model: "sonar",
            messages: [{ role: "user", content: "test" }],
            max_tokens: 1,
          }),
        });

        // If we get here without an error, the API is available
        return response.ok;
      } finally {
        // Clean up the timeout
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      log.debug(
        `Perplexity AI API not available: ${errorMessage}`,
        "PerplexityAIAdapter"
      );
      return false;
    }
  }

  /**
   * Generates embeddings for the provided texts using the specified model.
   *
   * Note: As of March 2024, Perplexity may not have an embeddings endpoint.
   * This implementation uses a placeholder approach.
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
      // Set up timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        // Perplexity doesn't have a dedicated embeddings API as of March 2024
        // This is a placeholder implementation
        throw new Error("Embeddings are not supported by Perplexity AI API");
      } finally {
        // Clean up timeout
        if (timeoutId) clearTimeout(timeoutId);
      }
    } catch (error) {
      // Handle abort errors differently from other errors
      if (error instanceof Error && error.name === "AbortError") {
        log.debug(
          `Embedding request aborted in Perplexity AI API: ${error}`,
          "PerplexityAIAdapter"
        );
        throw error;
      } else {
        log.error(
          `Error fetching embeddings from Perplexity AI API: ${error}`,
          "PerplexityAIAdapter"
        );
        throw new Error(`Server/PerplexityAIAdapter Error: ${String(error)}`);
      }
    }
  }

  /**
   * Forwards a chat request to the Perplexity AI API with optional streaming support.
   *
   * @param model - The model to use for completion
   * @param messages - Array of messages forming the conversation
   * @param options - Model options for the request
   * @param signal - Signal for cancelling the request
   * @param requestID - Unique identifier for tracking this request
   * @param onChunk - Optional callback for streaming chunks. If provided, enables streaming mode.
   * @returns The model's response text
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
   * Handles non-streaming Perplexity AI API requests.
   */
  private async handleNonStreamingRequest(
    model: string,
    messages: IChatRoleMessage[],
    options: Omit<IModelOptions, "stream">,
    signal: AbortSignal
  ): Promise<string> {
    const payload = {
      model: model,
      messages: messages,
      stream: false,
      ...options,
    };

    const response = await createCustomFetch(signal, this.apiKey)(
      `${this.baseUrl}/chat/completions`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (
      !data ||
      !data.choices ||
      !data.choices[0] ||
      !data.choices[0].message
    ) {
      throw new Error("Invalid response format from Perplexity AI API");
    }

    const messageObj = data.choices[0].message;
    const content = (messageObj.content || "").trim();
    const reasoningContent = messageObj.reasoning_content;

    if (reasoningContent && reasoningContent.trim()) {
      return `<think>\n${reasoningContent.trim()}\n</think>\n${content}`;
    }

    return content;
  }

  /**
   * Handles streaming Perplexity AI API requests using fetch for SSE processing.
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
      signal: signal,
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

    const textDecoder = new TextDecoder();
    let buffer = "";
    let emittedThinkOpen = false;
    let emittedThinkClose = false;

    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += textDecoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine.startsWith("data: ")) {
          const data = trimmedLine.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsedData = JSON.parse(data);
            const delta = parsedData.choices?.[0]?.delta;
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
              onChunk(content);
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
              throw error;
            }
            log.debug(
              `Error parsing JSON response: ${error}`,
              "PerplexityAIAdapter"
            );
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
    if (error instanceof Error && error.name === "AbortError") {
      log.debug(
        `Request aborted in Perplexity AI API: ${error}`,
        "PerplexityAIAdapter"
      );
      throw error;
    } else {
      log.error(
        `Error communicating with Perplexity AI API: ${error}`,
        "PerplexityAIAdapter"
      );
      throw new Error(`Server/PerplexityAIAdapter Error: ${String(error)}`);
    }
  }

  /**
   * Gets detailed metadata for a specific Perplexity AI model.
   * Uses the MetadataService to fetch metadata from LiteLLM database.
   *
   * @param modelName - The name of the model to get details for
   * @returns Object containing model metadata (context window, pricing, capabilities)
   */
  async getModelDetails(modelName: string): Promise<IModelMetadata> {
    // PerplexityAI API does not provide detailed metadata via API
    // Use MetadataService to fetch from LiteLLM database
    return metadataService.getModelMetadata("perplexityai", modelName);
  }
}

export default PerplexityAIAdapter;
