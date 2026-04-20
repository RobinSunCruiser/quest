/**
 * @module Adapters.LLMAdapterManager
 *
 * This module provides a centralized management system for LLM adapters in the application.
 * It handles adapter initialization, request tracking, model discovery, and error handling.
 * The manager operates as a singleton to ensure consistent access across the application.
 */

// Internal dependencies
import config from "../file/config_manager";
import {
  IAdapterConfig,
  IModelInfo,
  createModelMetadata,
} from "../interfaces";
import log from "../logger";
import {
  OllamaAdapter,
  OpenAIAdapter,
  LLMAdapter,
  PerplexityAIAdapter,
  AnthropicAdapter,
} from "../adapters";

/**
 * Default configuration for LLM adapters
 * Used when no configuration is found in the config manager
 */
const DEFAULT_LLMADAPTER_CONFIG = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    provider: "openai",
    modelFilter: [],
    apiKey: "",
    maxConcurrentRequests: 0,
  },
  ollama: {
    baseUrl: "http://0.0.0.0:11434",
    provider: "ollama",
    modelFilter: [],
    maxConcurrentRequests: 0,
  },
};

/**
 * Factory function type for creating LLM adapter instances
 */
type AdapterFactory = (
  adapterID: string,
  baseUrl: string,
  apiKey: string,
  maxConcurrentRequests: number
) => LLMAdapter;

/**
 * Registry of adapter factories by provider name
 * This eliminates the need for a large switch statement
 */
const ADAPTER_FACTORIES: Record<string, AdapterFactory> = {
  ollama: (id, baseUrl, apiKey, maxRequests) => 
    new OllamaAdapter(id, baseUrl, apiKey, maxRequests),
  openai: (id, baseUrl, apiKey, maxRequests) => 
    new OpenAIAdapter(id, baseUrl, apiKey, maxRequests),
  perplexityai: (id, baseUrl, apiKey, maxRequests) => 
    new PerplexityAIAdapter(id, baseUrl, apiKey, maxRequests),
  anthropic: (id, baseUrl, apiKey, maxRequests) => 
    new AnthropicAdapter(id, baseUrl, apiKey, maxRequests),
};

/**
 * LLMAdapterManager class
 *
 * A central manager for all LLM adapters in the application. This class handles:
 * - Adapter initialization and lifecycle management
 * - Request tracking and abortion capabilities
 * - Model discovery and filtering
 * - Configuration loading and validation
 *
 * The manager ensures graceful handling of adapter failures and provides
 * methods to track, abort, and manage ongoing requests to LLM providers.
 */
export class LLMAdapterManager {
  /** Map of adapter IDs to adapter instances */
  private adapterPool: Map<string, LLMAdapter> = new Map<string, LLMAdapter>();

  /** Map of request IDs to their abort controllers and associated adapters */
  private activeRequests: Map<string, [AbortController, LLMAdapter]> =
    new Map();

  /** Set of pending aborts for requests not yet tracked */
  private pendingAborts: Map<string, NodeJS.Timeout> = new Map();

  /** Cache for model metadata to avoid repeated fetching */
  private metadataCache: Map<string, IModelInfo["metadata"]> = new Map();

  /**
   * Creates a new LLMAdapterManager and initializes adapters from configuration.
   */
  constructor() {
    this.initAdapters();
  }

  /**
   * Tracks a new request with its abort controller and adapter.
   * If the request is in pending aborts, it will be immediately aborted.
   *
   * @param requestID - Unique identifier for the request
   * @param controller - AbortController used to cancel the request
   * @param adapter - LLM adapter handling the request
   * @returns Promise that resolves when tracking is complete
   */
  async trackRequest(
    requestID: string,
    controller: AbortController,
    adapter: LLMAdapter
  ): Promise<void> {
    // Check if this request is pending abortion
    if (this.pendingAborts.has(requestID)) {
      // Clear the timeout
      clearTimeout(this.pendingAborts.get(requestID)!);
      this.pendingAborts.delete(requestID);

      // Abort immediately
      log.debug(
        `Request ${requestID} aborted immediately upon tracking`,
        "LLMAdapterManager"
      );
      controller.abort();
      adapter.getRequestQueue().abort(requestID);
      return;
    }

    // Otherwise track normally
    this.activeRequests.set(requestID, [controller, adapter]);
  }

  /**
   * Aborts an ongoing request by its ID.
   * If the request is not yet tracked, adds it to pending aborts with a timeout.
   *
   * @param requestID - Unique identifier for the request to abort
   * @returns Promise that resolves when the abort is processed
   */
  async abortRequest(requestID: string): Promise<void> {
    // Case 1: Request is active and can be aborted immediately
    if (this.activeRequests.has(requestID)) {
      const [controller, adapter] = this.activeRequests.get(requestID) as [
        AbortController,
        LLMAdapter
      ];

      adapter.getRequestQueue().abort(requestID);
      controller.abort();
      this.activeRequests.delete(requestID);
      log.debug(
        `Request ${requestID} aborted successfully`,
        "LLMAdapterManager"
      );
      return;
    }

    // Case 2: Request is not yet tracked, add to pending aborts
    if (!this.pendingAborts.has(requestID)) {
      log.debug(
        `Request ${requestID} not yet tracked, adding to pending aborts`,
        "LLMAdapterManager"
      );

      // Set a timeout to clean up this pending abort after 5 seconds
      const timeoutId = setTimeout(() => {
        if (this.pendingAborts.has(requestID)) {
          log.debug(
            `Cleaning up stale pending abort for ${requestID}`,
            "LLMAdapterManager"
          );
          this.pendingAborts.delete(requestID);
        }
      }, 5000);

      this.pendingAborts.set(requestID, timeoutId);
    } else {
      log.debug(
        `Request ${requestID} already in pending aborts`,
        "LLMAdapterManager"
      );
    }
  }

  /**
   * Removes tracking for a completed or failed request.
   *
   * @param requestID - Unique identifier for the request to untrack
   */
  async untrackRequest(requestID: string): Promise<void> {
    if (this.activeRequests.has(requestID)) {
      this.activeRequests.delete(requestID);
    }

    // Also clean up any pending aborts for this request
    if (this.pendingAborts.has(requestID)) {
      clearTimeout(this.pendingAborts.get(requestID)!);
      this.pendingAborts.delete(requestID);
    }
  }

  /**
   * Initializes all adapters from configuration.
   * This method loads configuration, creates adapter instances,
   * checks their availability, and stores them in the adapter pool.
   *
   * @throws Error if all adapters fail to initialize
   */
  async initAdapters(): Promise<void> {
    const newAdapterPool = new Map<string, LLMAdapter>();

    try {
      const adapters = config.get(
        "LLMAdapters",
        DEFAULT_LLMADAPTER_CONFIG
      ) as Record<string, IAdapterConfig>;

      log.debug(
        `Initializing adapters: ${JSON.stringify(adapters)}`,
        "LLMAdapterManager"
      );

      // First initialize new adapters without replacing the old ones
      for (const adapterID in adapters) {
        const adapterConfig = adapters[adapterID];
        let adapterInstance: LLMAdapter | null = null;

        try {
          const { provider, baseUrl, apiKey = "", maxConcurrentRequests = 1 } = adapterConfig;
          
          // Use factory pattern instead of switch statement
          const factory = ADAPTER_FACTORIES[provider];
          if (!factory) {
            throw new Error(`Unknown provider: ${provider}`);
          }

          const adapter = factory(adapterID, baseUrl, apiKey, maxConcurrentRequests);
          
          if (await adapter.isAvailable()) {
            adapterInstance = adapter;
            newAdapterPool.set(adapterID, adapterInstance);
          } else {
            throw new Error(`Adapter not available`);
          }
        } catch (error) {
          log.warn(
            `Could not initialize 'adapter:${adapterID}' on '${adapterConfig.provider}'. ${error}`,
            "LLMAdapterManager"
          );
        }
      }
      // Validate availability of new adapters
      for (const [adapterID, adapter] of newAdapterPool.entries()) {
        const available = await adapter.isAvailable();
        if (!available) {
          newAdapterPool.delete(adapterID);
        }
      }

      // Wait for active requests to complete on existing adapters
      if (this.adapterPool.size > 0) {
        const pendingRequests = Array.from(this.activeRequests.values()).map(
          async ([_, adapter]) => {
            try {
              await adapter.getRequestQueue().waitForCompletion();
            } catch (error) {
              log.warn(
                `Error waiting for request completion: ${error}`,
                "LLMAdapterManager"
              );
            }
          }
        );
        await Promise.all(pendingRequests);
      }

      this.adapterPool = newAdapterPool;
    } catch (error) {
      log.error(`Error initializing adapters: ${error}`, "LLMAdapterManager");
    }
  }

  /**
   * Reinitializes all adapters while preserving active requests.
   * This is useful for hot-reloading adapter configurations.
   *
   * @throws Error if no new adapters could be initialized
   */
  async reinitAdapters(): Promise<void> {
    log.debug("Reinitializing adapters...", "LLMAdapterManager");

    try {
      // Keep a backup of the old pool in case initialization fails
      const oldAdapterPool = new Map(this.adapterPool);

      // Clear metadata cache on reinit since models may have changed
      this.metadataCache.clear();

      await this.initAdapters();

      // Verify new adapter pool is valid
      if (this.adapterPool.size === 0) {
        log.error(
          "No adapters were initialized, reverting to old adapter pool",
          "LLMAdapterManager"
        );
        this.adapterPool = oldAdapterPool;
        throw new Error("Failed to initialize any adapters");
      }

      log.debug("Adapters reinitialized.", "LLMAdapterManager");

    } catch (error) {
      log.error(
        `Failed to reinitialize adapters: ${error}`,
        "LLMAdapterManager"
      );
      throw error;
    }
  }

  /**
   * Gets an adapter instance by its name.
   *
   * @param name - The adapter ID/name to retrieve
   * @returns The adapter instance or null if not found
   */
  getAdapter(name: string): LLMAdapter | null {
    if (!this.adapterPool.has(name)) {
      log.error(`Adapter ${name} not found`, "LLMAdapterManager");
      return null;
    }
    const adapter = this.adapterPool.get(name) as LLMAdapter;
    return adapter;
  }

  /**
   * Gets the complete pool of available adapters.
   *
   * @returns A map of adapter IDs to their instances
   */
  getAdapterPool(): Map<string, LLMAdapter> {
    return this.adapterPool;
  }

  /**
   * Retrieves all available models across all initialized adapters.
   * Applies model filtering based on adapter configurations.
   *
   * @param includeMetadata - Whether to fetch detailed metadata for each model (default: true)
   * @returns Array of model information objects
   */
  async getAvailableModels(includeMetadata: boolean = true): Promise<IModelInfo[]> {
    const models: IModelInfo[] = [];
    const adapters = config.get(
      "LLMAdapters",
      DEFAULT_LLMADAPTER_CONFIG
    ) as Record<string, IAdapterConfig>;

    for (const [adapterID, adapter] of this.adapterPool.entries()) {
      const modelNames = await adapter.listModels();

      const filteredModels =
        adapters[adapterID].modelFilter.length > 0
          ? modelNames.filter((model) =>
              adapters[adapterID].modelFilter.some((pattern) => {
                try {
                  const regex = new RegExp(pattern);
                  return regex.test(model);
                } catch (error) {
                  log.warn(
                    `Invalid regex pattern: ${pattern}`,
                    "LLMAdapterManager"
                  );
                  return false;
                }
              })
            )
          : modelNames;

      // Fetch metadata for all models in parallel if requested
      const modelInfoPromises = filteredModels.map(async (modelName) => {
        let metadata = createModelMetadata({}); // Default empty metadata with all standard fields
        let metadataLoading = false;

        // Optionally fetch detailed metadata
        if (includeMetadata) {
          const cacheKey = `${adapterID}-${modelName}`;

          // Check cache first
          if (this.metadataCache.has(cacheKey)) {
            metadata = this.metadataCache.get(cacheKey)!;
            metadataLoading = false;
          } else {
            // Fetch and cache metadata
            try {
              metadata = await adapter.getModelDetails(modelName);
              this.metadataCache.set(cacheKey, metadata);
              metadataLoading = false;
            } catch (error) {
              log.warn(
                `Failed to fetch metadata for model ${modelName}: ${error}`,
                "LLMAdapterManager"
              );
              // Use default empty metadata if fetching fails
              metadataLoading = false;
            }
          }
        } else {
          // Metadata not requested, indicate it's in loading state
          metadataLoading = true;
        }

        const modelInfo: IModelInfo = {
          id: `${adapterID}-${modelName}`,
          model: modelName,
          baseUrl: adapter.getBaseUrl(),
          provider: adapter.getProvider(),
          adapterID: adapterID,
          metadata: metadata,
          metadataLoading: metadataLoading,
        };

        return modelInfo;
      });

      // Wait for all metadata fetches to complete for this adapter
      const adapterModels = await Promise.all(modelInfoPromises);
      models.push(...adapterModels);
    }
    return models;
  }
}

/**
 * Singleton instance of LLMAdapterManager
 * Use this instance throughout the application to access LLM functionality
 */
const llmAdapterManager = new LLMAdapterManager();
export default llmAdapterManager;
