/**
 * @module Socket.APIObjects
 *
 * This module defines the message formats and event types used for socket communication
 * between clients and the server. It provides a standardized structure for all messages
 * exchanged through the WebSocket protocol.
 *
 * The module includes:
 * - Event name constants
 * - Connection type definitions
 * - Message interface definitions for various API operations
 * - Specialized error types for socket communication
 */

//=============================================================================
// IMPORTS
//=============================================================================

// Internal dependencies
import {
  IChatRoleMessage,
  IMessageEvaluation,
  IModelMessage,
  IModelInfo,
  IModelOptions,
} from "../interfaces";

//=============================================================================
// BASIC TYPES AND ENUMS
//=============================================================================

/**
 * Definition of different client connection types
 */
export enum CONNECTION_TYPES {
  /** Standard chat client connection */
  CHAT = "CHAT",
}

/**
 * Contains all supported event names for socket communication
 */
export enum EVENTS {
  // Connection events
  /** Connection established event */
  CONNECT = "CONNECT",
  /** Connection terminated event */
  DISCONNECT = "DISCONNECT",
  /** Connection error event */
  CONNECT_ERROR = "CONNECT_ERROR",

  // LLM interaction events
  /** Client request to send a message to an LLM */
  LLM_CHAT_REQUEST = "LLM_CHAT_REQUEST",
  /** Client request to cancel an ongoing LLM request */
  LLM_CHAT_ABORT = "LLM_CHAT_ABORT",
  /** Server response containing LLM generated content */
  LLM_CHAT_RESPONSE = "LLM_CHAT_RESPONSE",
  /** Server response with a chunk of LLM generated content */
  LLM_CHAT_STREAM_CHUNK_RESPONSE = "LLM_CHAT_STREAM_CHUNK_RESPONSE",
  /** Client request for available LLM models */
  LLM_LIST_REQUEST = "LLM_LIST_REQUEST",
  /** Server response with updated model list */
  LLM_LIST_UPDATE = "LLM_LIST_UPDATE",

  // Authentication events
  /** Client authentication request */
  AUTH = "AUTH",
  /** Server authentication response */
  AUTH_RESPONSE = "AUTH_RESPONSE",

  // LLM evaluation events
  /** Client request to evaluate multiple LLM responses */
  LLM_EVAL_REQUEST = "LLM_EVAL_REQUEST",
  /** Server response with evaluation results */
  LLM_EVAL_RESPONSE = "LLM_EVAL_RESPONSE",
  /** Client request to abort an ongoing evaluation */
  LLM_EVAL_ABORT = "LLM_EVAL_ABORT",

  // System management events
  /** Client request to reinitialize LLM adapters */
  RELOAD_ADAPTERS_REQUEST = "RELOAD_ADAPTERS_REQUEST",
  /** Server response after adapter reinitialization */
  RELOAD_ADAPTERS_RESPONSE = "RELOAD_ADAPTERS_RESPONSE",

  // RAG (Retrieval Augmented Generation) events
  /** Client request to generate embeddings for document chunks */
  RAG_EMBED_REQUEST = "RAG_EMBED_REQUEST",
  /** Server response with generated embeddings */
  RAG_EMBED_RESPONSE = "RAG_EMBED_RESPONSE",
  /** Client request to query documents for relevant chunks */
  RAG_QUERY_REQUEST = "RAG_QUERY_REQUEST",
  /** Server response with retrieved document chunks */
  RAG_QUERY_RESPONSE = "RAG_QUERY_RESPONSE",
}

//=============================================================================
// BASE MESSAGE INTERFACE
//=============================================================================

/**
 * Base interface for all socket communication messages
 *
 * Defines the common structure that all socket messages must follow,
 * including event type, protocol version, and optional data fields.
 */
export interface SocketMessage {
  /** Event type identifier */
  event: EVENTS;

  /** Protocol version string */
  version: string;

  /** Optional payload data specific to the event */
  data?: unknown;

  /** Optional response data */
  response?: unknown;

  /** Optional error information if the request failed */
  error?: unknown;

  /** Optional metadata for request tracking */
  payload?: unknown;
}

//=============================================================================
// AUTHENTICATION MESSAGES
//=============================================================================

/**
 * Authentication request message
 */
export interface AuthMessage extends SocketMessage {
  event: EVENTS.AUTH;
  version: "0.1.0";
  data: {
    /** Authentication token (for token-based auth) */
    token?: string;
    /** Username (for credential-based auth) */
    username?: string;
    /** Password (for credential-based auth) */
    password?: string;
  };
}

/**
 * Authentication response message
 */
export interface AuthResponseMessage extends SocketMessage {
  event: EVENTS.AUTH_RESPONSE;
  version: "0.1.0";
  data: {
    /** Whether authentication was successful */
    success: boolean;
    /** Authentication token (returned on successful credential-based auth) */
    token?: string;
  };
}

//=============================================================================
// LLM INTERACTION MESSAGES
//=============================================================================

/**
 * LLM chat request message
 */
export interface LLMChatMessage extends SocketMessage {
  event: EVENTS.LLM_CHAT_REQUEST;
  version: "0.1.0";
  data: {
    /** ID of the model to query */
    modelID: string;

    /** Array of messages in the conversation */
    messages: IChatRoleMessage[];

    /** Configuration options for the model */
    modelOptions: IModelOptions;
  };
  payload: {
    /** Unique identifier for this request */
    requestID: string;

    /** Identifier for the conversation this request belongs to */
    conversationID: string;
  };
}

/**
 * Message to abort an ongoing LLM chat request
 */
export interface LLMChatAbortMessage extends SocketMessage {
  event: EVENTS.LLM_CHAT_ABORT;
  version: "0.1.0";
  payload: {
    /** ID of the request to abort */
    requestID: string;
  };
}

/**
 * LLM chat response message
 */
export interface LLMChatResponse extends SocketMessage {
  event: EVENTS.LLM_CHAT_RESPONSE;
  version: "0.1.0";
  data: {
    /** Generated message text from the LLM */
    message: string;
  };
  payload: {
    /** ID of the request being responded to */
    requestID: string;

    /** ID of the conversation this response belongs to */
    conversationID: string;
  };
}

/**
 * LLM chat stream chunk response message
 */
export interface LLMChatStreamChunkResponse extends SocketMessage {
  event: EVENTS.LLM_CHAT_STREAM_CHUNK_RESPONSE;
  version: "0.1.0";
  data: {
    /** Chunk of generated message text from the LLM */
    chunk: string;
  };
  payload: {
    /** ID of the request being responded to */
    requestID: string;
    /** ID of the conversation this response belongs to */
    conversationID: string;
  };
}

/**
 * Request for list of available LLM models
 */
export interface LLMListMessage extends SocketMessage {
  event: EVENTS.LLM_LIST_REQUEST;
  version: "0.1.0";
  payload: {
    /** Unique identifier for this request */
    requestID: string;
  };
}

/**
 * Response with list of available LLM models
 */
export interface LLMListUpdateMessage extends SocketMessage {
  event: EVENTS.LLM_LIST_UPDATE;
  version: "0.1.0";
  data: {
    /** Array of available model information */
    models: IModelInfo[];
  };
  payload?: {
    /** Optional ID of the request being responded to */
    requestID: string;
  };
}

//=============================================================================
// EVALUATION MESSAGES
//=============================================================================

/**
 * Options for LLM evaluation
 */
export interface EvaluationOptions {
  /** Whether to separate thinking blocks from responses */
  removeThinkingBlock: boolean;
}

/**
 * Request for evaluation of multiple LLM responses
 */
export interface LLMEvalMessage extends SocketMessage {
  event: EVENTS.LLM_EVAL_REQUEST;
  version: "0.1.0";
  data: {
    /** Array of model responses to evaluate */
    chatModels: IModelMessage[];

    /** Configuration options for the evaluation */
    options: EvaluationOptions;
  };
  payload: {
    /** Unique identifier for this request */
    requestID: string;
  };
}

/**
 * Response with LLM evaluation results
 */
export interface LLMEvalResponseMessage extends SocketMessage {
  event: EVENTS.LLM_EVAL_RESPONSE;
  version: "0.1.0";
  data: {
    /** Evaluation results for the provided models */
    evaluation: IMessageEvaluation;
  };
  payload: {
    /** ID of the request being responded to */
    requestID: string;
  };
}

/**
 * Message to abort an ongoing evaluation request
 */
export interface LLMEvalAbortMessage extends SocketMessage {
  event: EVENTS.LLM_EVAL_ABORT;
  version: "0.1.0";
  payload: {
    /** ID of the evaluation request to abort */
    requestID: string;
  };
}

//=============================================================================
// ADAPTER MANAGEMENT MESSAGES
//=============================================================================

/**
 * Request to reload/reinitialize LLM adapters
 */
export interface AdapterReloadMessage extends SocketMessage {
  event: EVENTS.RELOAD_ADAPTERS_REQUEST;
  version: "0.1.0";
  payload: {
    /** Unique identifier for this request */
    requestID: string;
  };
}

/**
 * Response after LLM adapter reinitialization
 */
export interface AdapterReloadResponseMessage extends SocketMessage {
  event: EVENTS.RELOAD_ADAPTERS_RESPONSE;
  version: "0.1.0";
  payload: {
    /** ID of the request being responded to */
    requestID: string;
  };
}

//=============================================================================
// RAG MESSAGES
//=============================================================================

/**
 * Document chunk interface for RAG operations
 */
export interface IDocumentChunk {
  /** Unique identifier for the chunk */
  id: string;
  /** Document identifier this chunk belongs to */
  documentId: string;
  /** Text content of the chunk */
  text: string;
  /** Optional metadata about the chunk */
  metadata?: {
    /** Page number or section */
    page?: number;
    /** Character position in original document */
    position?: number;
  };
}

/**
 * Request to generate embeddings for document chunks
 */
export interface RAGEmbedMessage extends SocketMessage {
  event: EVENTS.RAG_EMBED_REQUEST;
  version: "0.1.0";
  data: {
    /** Array of text chunks to embed */
    chunks: IDocumentChunk[];
  };
  payload: {
    /** Unique identifier for this request */
    requestID: string;
  };
}

/**
 * Response with generated embeddings for document chunks
 */
export interface RAGEmbedResponseMessage extends SocketMessage {
  event: EVENTS.RAG_EMBED_RESPONSE;
  version: "0.1.0";
  data: {
    /** Array of embedding vectors corresponding to input chunks */
    embeddings: number[][];
  };
  payload: {
    /** ID of the request being responded to */
    requestID: string;
  };
}

/**
 * Request to query documents for relevant chunks
 */
export interface RAGQueryMessage extends SocketMessage {
  event: EVENTS.RAG_QUERY_REQUEST;
  version: "0.1.0";
  data: {
    /** Query text to search for */
    query: string;
    /** Embeddings of all document chunks */
    chunkEmbeddings: number[][];
    /** Corresponding chunk data */
    chunks: IDocumentChunk[];
    /** Number of top results to return */
    topK: number;
  };
  payload: {
    /** Unique identifier for this request */
    requestID: string;
  };
}

/**
 * Response with retrieved document chunks
 */
export interface RAGQueryResponseMessage extends SocketMessage {
  event: EVENTS.RAG_QUERY_RESPONSE;
  version: "0.1.0";
  data: {
    /** Array of retrieved chunks with similarity scores */
    results: Array<{
      /** The matching chunk */
      chunk: IDocumentChunk;
      /** Cosine similarity score (0-1) */
      score: number;
    }>;
  };
  payload: {
    /** ID of the request being responded to */
    requestID: string;
  };
}

//=============================================================================
// ERROR TYPES
//=============================================================================

/**
 * Custom error class for request timeouts
 */
export class TimeoutError extends Error {
  /**
   * Creates a new timeout error
   */
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}
