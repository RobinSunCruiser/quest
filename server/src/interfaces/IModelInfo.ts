/**
 * @module Interfaces.IModelInfo
 *
 * This module defines the interface and validation schema for model information.
 * It provides a standardized structure for identifying and accessing language models
 * across different providers and adapters in the system.
 */

// External dependencies
import { z } from "zod";
import { IModelMetadata } from "./IModelMetadata";

/**
 * Interface representing information about a language model.
 * Contains all necessary details to identify and use a specific model
 * through its corresponding adapter.
 */
export interface IModelInfo {
  /** Unique identifier for the model in the format "adapterID-modelName" */
  id: string;

  /** Native name of the model as provided by its service */
  model: string;

  /** Base URL of the API endpoint for this model */
  baseUrl: string;

  /** Provider identifier (e.g., "openai", "ollama") */
  provider: string;

  /** ID of the adapter responsible for communicating with this model */
  adapterID: string;

  /** Metadata containing model-specific details (standard fields always present, may be null) */
  metadata: IModelMetadata;

  /** Indicates whether metadata is still being loaded. True = loading, false = loaded */
  metadataLoading: boolean;
}

/**
 * Zod schema for validating model information objects.
 * Ensures all properties conform to expected types.
 * Makes metadata and metadataLoading optional for backward compatibility with old saved files.
 */
export const ModelInfoSchema = z.object({
  id: z.string(),
  model: z.string(),
  baseUrl: z.string(),
  provider: z.string(),
  adapterID: z.string(),
  metadata: z.record(z.any()).optional(),
  metadataLoading: z.boolean().optional(),
});
