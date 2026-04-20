/**
 * @module Utils.KeyManager
 *
 * This module provides centralized API key management for LLM adapters.
 * It handles resolving API keys from multiple sources with a defined priority order
 * and standardized error handling.
 */

//External dependencies
import dotenv from "dotenv";

//Internal dependencies
import config from "../file/config_manager";
import log from "../logger";

/**
 * KeyManager provides centralized handling of API keys and credentials
 * across different adapters in the application.
 *
 * It implements a consistent resolution strategy that checks multiple possible
 * sources for API keys in a defined priority order:
 * 1. Direct constructor parameters (highest priority)
 * 2. Configuration file entries
 * 3. Environment variables (lowest priority)
 */
export class KeyManager {
  /**
   * Resolves API credentials from multiple sources with a defined priority
   *
   * @param adapterName - Name of the adapter in config (e.g., "openai", "ollama")
   * @param directKey - Key directly passed to the function (highest priority)
   * @param envVarName - Environment variable name to check (lowest priority)
   * @returns The API key if found in any location, or null if no valid key exists
   * @example
   * // Get API key for OpenAI adapter
   * const apiKey = KeyManager.resolveApiKey("openai", options.apiKey, "OPENAI_API_KEY");
   */
  static resolveApiKey(
    adapterName: string,
    directKey?: string,
    envVarName?: string
  ): string | null {
    dotenv.config();

    // Check directly provided key
    if (directKey && directKey.trim().length > 0) {
      return directKey;
    }

    // Check config file
    try {
      const configKey = config
        .get(`LLMAdapters.${adapterName}.apiKey`, "")
        .trim();
      if (configKey && configKey.length > 0) {
        return configKey;
      }
    } catch (error) {
      log.debug(`No valid API key for ${adapterName} in config`, "KeyManager");
    }

    // Check environment variable if name is provided
    if (envVarName) {
      const envKey = process.env[envVarName];
      if (envKey && envKey.trim().length > 0) {
        return envKey;
      }
    }

    return null;
  }

  /**
   * Validates that a key exists for a provider and throws a friendly error if not
   *
   * @param providerName - Name of the LLM provider (e.g., "openai", "ollama")
   * @param key - API key to validate, typically from resolveApiKey()
   * @param envVarName - Optional environment variable name for better error messages
   * @returns The validated key unchanged
   * @throws Error with detailed message if key is null or empty
   * @example
   * // Get and validate API key for OpenAI adapter
   * const apiKey = KeyManager.validateKeyOrThrow(
   *   "openai",
   *   KeyManager.resolveApiKey("openai", options.apiKey, "OPENAI_API_KEY"),
   *   "OPENAI_API_KEY"
   * );
   */
  static validateKeyOrThrow(
    providerName: string,
    key: string | null,
    envVarName?: string
  ): string {
    if (!key) {
      const errorLocations = [
        "1. The parameter passed to the adapter constructor",
        `2. The 'apiKey' field in the '${providerName}' section of config.json`,
      ];

      if (envVarName) {
        errorLocations.push(`3. The ${envVarName} environment variable`);
      }

      throw new Error(
        `No API Key found for ${providerName}! We checked:\n${errorLocations.join(
          "\n"
        )}\n\n` +
          "Please provide your API key in at least one of these locations."
      );
    }

    return key;
  }
}
