/**
 * @module Utils.MetadataService
 *
 * Service for fetching and caching model metadata from the LiteLLM database.
 * Provides dynamic model information (context windows, pricing, capabilities)
 * for providers that don't expose this through their APIs.
 */

import { IModelMetadata, createModelMetadata } from "../interfaces";
import log from "../logger";

// LiteLLM database URL
const LITELLM_DATABASE_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

// Cache TTL: 24 hours
const CACHE_TTL = 24 * 60 * 60 * 1000;

// Refresh interval: Check every hour if cache needs refresh
const REFRESH_INTERVAL = 60 * 60 * 1000;

interface LiteLLMModelData {
  max_tokens?: number;
  max_input_tokens?: number;
  max_output_tokens?: number;
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  litellm_provider?: string;
  mode?: string;
  supports_function_calling?: boolean;
  supports_vision?: boolean;
  supports_prompt_caching?: boolean;
  supports_system_messages?: boolean;
  [key: string]: any;
}

/**
 * Service for managing dynamic model metadata from external sources.
 */
class MetadataService {
  private litellmData: Record<string, LiteLLMModelData> | null = null;
  private lastFetchTime: Date | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isFetching = false;

  /**
   * Initializes the metadata service and starts background refresh.
   */
  async initialize(): Promise<void> {
    log.info("Initializing MetadataService...", "MetadataService");

    // Initial fetch
    await this.fetchLiteLLMDatabase();

    // Set up periodic refresh
    this.startBackgroundRefresh();

    log.info("MetadataService initialized successfully", "MetadataService");
  }

  /**
   * Fetches the LiteLLM model database from GitHub.
   * Implements caching and graceful error handling.
   */
  private async fetchLiteLLMDatabase(): Promise<void> {
    // Prevent concurrent fetches
    if (this.isFetching) {
      log.debug("Fetch already in progress, skipping", "MetadataService");
      return;
    }

    // Check if cache is still valid
    if (this.isCacheValid()) {
      log.debug("Cache is still valid, skipping fetch", "MetadataService");
      return;
    }

    this.isFetching = true;

    try {
      log.info("Fetching LiteLLM model database...", "MetadataService");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(LITELLM_DATABASE_URL, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Validate that we got a proper object
        if (!data || typeof data !== "object") {
          throw new Error("Invalid data format received from LiteLLM database");
        }

        this.litellmData = data;
        this.lastFetchTime = new Date();

        const modelCount = Object.keys(data).length;
        log.info(
          `Successfully fetched metadata for ${modelCount} models from LiteLLM`,
          "MetadataService"
        );
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (error instanceof Error && error.name === "AbortError") {
        log.warn(
          "Timeout while fetching LiteLLM database, using cached data",
          "MetadataService"
        );
      } else {
        log.warn(
          `Failed to fetch LiteLLM database: ${errorMessage}. Using cached data if available.`,
          "MetadataService"
        );
      }

      // If we have no cached data at all, log a more serious warning
      if (!this.litellmData) {
        log.warn(
          "No cached metadata available. Models will return empty metadata.",
          "MetadataService"
        );
      }
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Checks if the current cache is still valid based on TTL.
   */
  private isCacheValid(): boolean {
    if (!this.lastFetchTime || !this.litellmData) {
      return false;
    }

    const now = new Date();
    const timeSinceLastFetch = now.getTime() - this.lastFetchTime.getTime();
    return timeSinceLastFetch < CACHE_TTL;
  }

  /**
   * Starts a background timer to periodically refresh the metadata.
   */
  private startBackgroundRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      log.debug("Running periodic metadata refresh check", "MetadataService");
      await this.fetchLiteLLMDatabase();
    }, REFRESH_INTERVAL);

    // Prevent the timer from keeping the process alive
    if (this.refreshTimer.unref) {
      this.refreshTimer.unref();
    }
  }

  /**
   * Stops the background refresh timer.
   * Should be called when shutting down the service.
   */
  shutdown(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    log.info("MetadataService shut down", "MetadataService");
  }

  /**
   * Maps LiteLLM model data to IModelMetadata interface.
   * Only maps the standard IModelMetadata fields explicitly.
   * All other fields are passed through as dynamic properties.
   */
  private mapLiteLLMToMetadata(
    litellmData: LiteLLMModelData
  ): Partial<IModelMetadata> {
    const metadata: Partial<IModelMetadata> = {};

    // Standard IModelMetadata fields
    const standardFields = [
      "family",
      "parameterSize",
      "quantization",
      "contextLength",
      "tokenizerGgmlModel",
      "template",
    ];

    // Map context window (prefer max_input_tokens, fallback to max_tokens)
    if (litellmData.max_input_tokens !== undefined) {
      metadata.contextLength = litellmData.max_input_tokens;
    } else if (litellmData.max_tokens !== undefined) {
      metadata.contextLength = litellmData.max_tokens;
    }

    // Map any existing standard fields from LiteLLM data
    for (const field of standardFields) {
      if (field !== "contextLength" && litellmData[field] !== undefined) {
        (metadata as any)[field] = litellmData[field];
      }
    }

    // Add all other fields as dynamic properties (not in standard fields)
    for (const [key, value] of Object.entries(litellmData)) {
      if (!standardFields.includes(key) && key !== "max_input_tokens" && key !== "max_tokens") {
        (metadata as any)[key] = value;
      }
    }

    return metadata;
  }

  /**
   * Gets metadata for a specific model.
   * Searches the LiteLLM database for matching model names.
   *
   * @param provider - Provider name (openai, anthropic, perplexityai) - used for logging
   * @param modelName - Full model name to lookup
   * @returns Model metadata with all available fields
   */
  getModelMetadata(provider: string, modelName: string): IModelMetadata {
    // If no data available, return empty metadata
    if (!this.litellmData) {
      log.debug(
        `No metadata available for ${provider}:${modelName}`,
        "MetadataService"
      );
      return createModelMetadata({});
    }

    // Try exact match first
    if (this.litellmData[modelName]) {
      log.debug(
        `Found exact metadata match for ${provider}:${modelName}`,
        "MetadataService"
      );
      const mappedData = this.mapLiteLLMToMetadata(this.litellmData[modelName]);
      return createModelMetadata(mappedData);
    }

    // Try partial matches (for models with version suffixes)
    // Example: "gpt-4-turbo" matches "gpt-4-turbo-2024-04-09"
    for (const [litellmModelName, modelData] of Object.entries(
      this.litellmData
    )) {
      if (
        litellmModelName.startsWith(modelName) ||
        modelName.startsWith(litellmModelName)
      ) {
        log.debug(
          `Found partial metadata match for ${provider}:${modelName} -> ${litellmModelName}`,
          "MetadataService"
        );
        const mappedData = this.mapLiteLLMToMetadata(modelData);
        return createModelMetadata(mappedData);
      }
    }

    // No match found
    log.debug(
      `No metadata match found for ${provider}:${modelName}`,
      "MetadataService"
    );
    return createModelMetadata({});
  }

  /**
   * Forces an immediate refresh of the metadata database.
   * Useful for manual updates or testing.
   */
  async forceRefresh(): Promise<void> {
    log.info("Forcing metadata refresh...", "MetadataService");
    this.lastFetchTime = null; // Invalidate cache
    await this.fetchLiteLLMDatabase();
  }

  /**
   * Gets the current cache status for diagnostics.
   */
  getCacheStatus(): {
    isValid: boolean;
    lastFetch: Date | null;
    modelCount: number;
  } {
    return {
      isValid: this.isCacheValid(),
      lastFetch: this.lastFetchTime,
      modelCount: this.litellmData ? Object.keys(this.litellmData).length : 0,
    };
  }
}

// Export singleton instance
export const metadataService = new MetadataService();
