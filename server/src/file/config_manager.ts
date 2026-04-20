/**
 * @module File.ConfigManager
 *
 * This module provides configuration management for the application.
 * It handles loading, parsing, and accessing configuration values from
 * a JSON configuration file with support for nested property paths
 * and default values.
 *
 * The module exports a singleton Config instance that should be used
 * throughout the application for consistent configuration access.
 */

// External dependencies
import path from "path";
import fs from "fs";

// Internal dependencies
import log from "../logger";

// Type declaration for pkg binary detection
declare const process: NodeJS.Process & { pkg?: any };

/**
 * Configuration manager that provides access to application settings.
 * Loads configuration from a JSON file and provides methods for retrieving values.
 */
export class Config {
  /** Name of the configuration file */
  private readonly CONFIG_FILE_NAME = "config.json";

  /** Parsed configuration object */
  private configObj: any;

  /**
   * Creates a new Config instance and loads the configuration file.
   */
  constructor() {
    this.readConfig(process.pkg !== undefined
      ? path.join(path.dirname(process.execPath), this.CONFIG_FILE_NAME)
      : path.join(__dirname, this.CONFIG_FILE_NAME));
  }

  /**
   * Retrieves a configuration value by its key path.
   * Supports dot notation for accessing nested properties.
   *
   * @param keys - Key path in dot notation (e.g., "LLMAdapters.openai.baseUrl")
   * @param defaultValue - Optional fallback value if the key doesn't exist
   * @returns The configuration value or the default value
   * @throws Error if the key doesn't exist and no default value is provided
   */
  public get<T>(keys: string, defaultValue: T | undefined = undefined): T {
    // Ensure configuration is loaded
    if (!this.configObj) {
      throw `Tried to read config key ${keys} but config is null! Shutting down ..`;
    }

    // Navigate through the object using the key path
    const keyPath = keys.split(".");
    let val = this.configObj;
    keyPath.forEach((key) => {
      if (val !== undefined && key in val) {
        val = val[key];
      } else {
        val = undefined;
      }
    });

    // Return the found value or handle missing keys
    if (val !== undefined) {
      log.debug(keys + " = " + val, "Config");
      return val;
    } else if (defaultValue !== undefined) {
      log.warn(
        keys + "' not found in config. Using default :'" + defaultValue + "'",
        "Config"
      );
      return defaultValue;
    } else {
      log.error(
        "Required '" + keys + "' not found in config! Shutting down ..",
        "Config"
      );
      process.exit(1);
    }
  }

  /**
   * Loads and parses the configuration from a JSON file.
   *
   * @param configPath - Path to the configuration file
   * @throws Error if the file cannot be read or parsed
   */
  public readConfig(configPath: string): void {
    try {
      this.configObj = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (e: any) {
      log.error("Could not find config! " + e.toString());
      throw "Could not find config! " + e.toString();
    }
  }
}

/**
 * Singleton instance of the Config class.
 * Use this throughout the application for consistent configuration access.
 */
const config = new Config();
export default config;
