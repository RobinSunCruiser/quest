/**
 * @module Interfaces.IModelMetadata
 *
 * This module defines the interface and validation schema for model metadata.
 * It provides a flexible structure for storing detailed model characteristics
 * with known optional fields and support for additional dynamic properties.
 */

// External dependencies
import { z } from "zod";

/**
 * Interface representing metadata about a language model.
 * Standard fields are always present (null if not available).
 * Uses null instead of undefined for JSON serialization compatibility.
 * Additional dynamic properties can be added to capture provider-specific or model-specific details.
 */
export interface IModelMetadata {
  /** Model family or architecture (e.g., "llama", "mistral", "gpt") */
  family: string | null;

  /** Parameter count/size (e.g., "7B", "13B", "70B") */
  parameterSize: string | null;

  /** Quantization method (e.g., "Q4_K_M", "Q5_K_S", "fp16") */
  quantization: string | null;

  /** Context window length in tokens (e.g., 4096, 8192, 32768) */
  contextLength: number | null;

  /** Tokenizer GGML model identifier */
  tokenizerGgmlModel: string | null;

  /** Prompt template format (e.g., "chatml", "alpaca", "vicuna") */
  template: string | null;

  /** Dynamic key-value pairs for additional metadata */
  [key: string]: any;
}

/**
 * Zod schema for validating model metadata objects.
 * Ensures predefined properties conform to expected types while
 * allowing additional dynamic properties.
 * All standard fields accept null values for JSON serialization compatibility.
 */
export const ModelMetadataSchema = z
  .object({
    family: z.string().nullable().optional(),
    parameterSize: z.string().nullable().optional(),
    quantization: z.string().nullable().optional(),
    contextLength: z.number().nullable().optional(),
    tokenizerGgmlModel: z.string().nullable().optional(),
    template: z.string().nullable().optional(),
  })
  .passthrough(); // Allow additional properties

/**
 * Creates a complete IModelMetadata object with all standard fields initialized.
 * Standard fields default to null if not provided (for JSON serialization compatibility).
 * Preserves any additional dynamic properties.
 *
 * @param partial - Partial metadata object with some or all fields
 * @returns Complete IModelMetadata object with all standard fields present
 */
export function createModelMetadata(
  partial: Partial<IModelMetadata> = {}
): IModelMetadata {
  return {
    family: partial.family ?? null,
    parameterSize: partial.parameterSize ?? null,
    quantization: partial.quantization ?? null,
    contextLength: partial.contextLength ?? null,
    tokenizerGgmlModel: partial.tokenizerGgmlModel ?? null,
    template: partial.template ?? null,
    ...partial, // Preserve any additional dynamic properties
  };
}
