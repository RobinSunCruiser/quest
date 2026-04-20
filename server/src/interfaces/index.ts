/**
 * @module Interfaces
 *
 * This module serves as a central export point for all interface definitions
 * used throughout the application. These interfaces define the shape of data
 * structures, configuration objects, and message formats that enable type-safe
 * interactions between different components of the system.
 *
 * The interfaces are organized into the following categories:
 * - Message interfaces (chat role messages, evaluations)
 * - Configuration interfaces (adapters, embeddings)
 * - Model interfaces (model information)
 * - State interfaces (project state, chat history)
 * - User interfaces (authentication and roles)
 */

// Chat and message interfaces
export * from "./IChatRoleMessage";
export * from "./IChatHistoryState";
export * from "./IMessageEvaluation";

// Configuration interfaces
export * from "./IAdapterConfig";
export * from "./IEmbeddingConfig";

// Model interfaces
export * from "./IModelInfo";
export * from "./IModelMetadata";
export * from "./IModelOptions";
export * from "./IModelTemplate";

// State management interfaces
export * from "./IProjectSavestate";

// User and authentication interfaces
export * from "./IUser";
