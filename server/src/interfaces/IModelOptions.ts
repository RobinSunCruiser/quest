/**
 * @Module Interfaces.IModelOptions
 *
 * This module defines the interface and validation schema for model settings.
 * It provides a standardized structure for configuring various options
 * related to language model interactions.
 */

import { z } from "zod";

/**
 * Interface representing configuration options for language model inference.
 * These options control various aspects of text generation behavior including
 * randomness, response format, and token generation penalties.
 */
export interface IModelOptions {
  /**
   * Controls whether model responses are streamed token-by-token or returned as a complete response.
   * - true: Tokens are sent incrementally as they're generated
   * - false: The complete response is returned only after completion
   */
  stream: boolean;

  /**
   * Controls randomness in the output (typically 0.0 to 1.0, but some models allow up to 2.0).
   * - Higher values (e.g., 0.8) produce more random, creative outputs
   * - Lower values (e.g., 0.2) make output more focused and deterministic
   * - 0.0 means deterministic (always select the highest probability token)
   */
  temperature?: number;

  /**
   * An alternative to temperature for controlling randomness (0.0 to 1.0).
   * Limits token selection to the top percentage of probability mass.
   * - 0.1 means only consider tokens comprising the top 10% probability mass
   * - Higher values (e.g., 0.9) allow more diverse outputs
   * - Lower values (e.g., 0.3) create more focused outputs
   */
  top_p?: number;

  /**
   * Sets a specific random seed for deterministic sampling.
   * Using the same seed with identical inputs produces the same output,
   * enabling reproducible results.
   */
  seed?: number;

  /**
   * Reduces repetition by penalizing tokens that have already appeared (-2.0 to 2.0).
   * - Positive values decrease the likelihood of repeating any token that has appeared
   * - Higher positive values enforce stronger penalties
   * - Negative values can increase repetition
   */
  presence_penalty?: number;

  /**
   * Reduces repetition by penalizing tokens based on their frequency (-2.0 to 2.0).
   * - Positive values decrease the likelihood of tokens proportional to their frequency
   * - Higher positive values enforce stronger penalties against common tokens
   * - Negative values can increase repetition of frequent tokens
   */
  frequency_penalty?: number;
}

/**
 * Zod schema for validating model options objects.
 */
export const ModelOptionsSchema = z.object({
  stream: z.boolean().optional(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  seed: z.number().optional(),
  presence_penalty: z.number().optional(),
  frequency_penalty: z.number().optional(),
});
