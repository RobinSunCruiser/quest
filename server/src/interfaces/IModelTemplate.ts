/**
 * @module Interfaces.IModelTemplate
 *
 * Defines the structure for model metadata templates.
 * Templates provide static metadata for models that don't expose
 * detailed specifications through their APIs.
 */

/**
 * Model metadata template interface
 * Contains static metadata for a specific model or model family
 */
export interface IModelTemplate {
    /**
     * Model identifier or pattern (supports wildcards)
     * Examples: "gpt-4", "gpt-4*", "claude-3-opus-*"
     */
    modelPattern: string;

    /**
     * Model family name (e.g., "gpt-4", "claude-3", "llama")
     */
    family?: string;

    /**
     * Context window size in tokens
     */
    contextWindow?: number;

    /**
     * Maximum output tokens
     */
    maxOutputTokens?: number;

    /**
     * Training data cutoff date (ISO 8601 format)
     */
    trainingCutoff?: string;

    /**
     * Model type (e.g., "chat", "completion", "embedding")
     */
    modelType?: string;

    /**
     * Additional metadata fields
     */
    [key: string]: any;
}

/**
 * Template collection for a provider
 * Groups templates by provider name
 */
export interface IProviderTemplates {
    /**
     * Provider identifier (e.g., "openai", "anthropic", "ollama")
     */
    provider: string;

    /**
     * Template version for tracking updates
     */
    version: string;

    /**
     * Last update date (ISO 8601 format)
     */
    lastUpdated: string;

    /**
     * Array of model templates
     */
    templates: IModelTemplate[];
}
