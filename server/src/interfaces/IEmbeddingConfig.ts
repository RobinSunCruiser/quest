/**
 * @module Interfaces.IEmbeddingConfig
 *
 * This module defines the interface for embedding configuration.
 * It specifies the structure for mapping embedding providers to their
 * corresponding adapter and model settings.
 */

/**
 * Interface representing configuration for text embedding services.
 *
 * This interface provides a mapping from named embedding services to their
 * implementation details, including which adapter to use and which model
 * to select for generating embeddings.
 *
 * Used for configuring various embedding providers throughout the application.
 */
export interface IEmbeddingConfig {
  /**
   * Key-value mapping where keys are embedding service identifiers and
   * values define the adapter and model to use for that service
   */
  [key: string]: {
    /** Adapter ID to use for this embedding service */
    adapter: string;

    /** Model ID to use with the selected adapter */
    model: string;
  };
}
