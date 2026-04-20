/**
 * @module Socket.APIHandler
 *
 * This module provides the API handler for socket connections.
 * It serves as a central routing point that maps incoming socket events
 * to their corresponding handler functions.
 *
 * The SocketAPIHandler connects client socket events to server-side functionality
 * by registering appropriate event handlers for each supported operation.
 */

// Internal dependencies
import { EVENTS } from "./apiObjects";
import { Connection } from "./abstractConnection";
import {
  listLLMs,
  evaluate,
  forwardToLLMAdapter,
  reinitAdapters,
  abortLLMRequest,
  handleEmbedRequest,
  handleQueryRequest,
} from "./handlers";

/**
 * Handles API requests by mapping socket events to handler functions.
 *
 * This class serves as the connection point between the socket layer and
 * the application's business logic. It registers event handlers for each
 * supported operation, enabling clients to invoke server functionality
 * through socket events.
 */
export class SocketAPIHandler {
  /**
   * Creates a new API handler instance and registers all event handlers.
   *
   * @param connection - The socket connection to bind handlers to
   */
  constructor(connection: Connection) {
    // Register LLM interaction handlers
    connection.on(EVENTS.LLM_CHAT_ABORT, abortLLMRequest);
    connection.on(EVENTS.LLM_CHAT_REQUEST, forwardToLLMAdapter);
    connection.on(EVENTS.LLM_LIST_REQUEST, listLLMs);

    // Register model evaluation handler
    connection.on(EVENTS.LLM_EVAL_REQUEST, evaluate);

    // Register system management handler
    connection.on(EVENTS.RELOAD_ADAPTERS_REQUEST, reinitAdapters);

    // Register RAG handlers
    connection.on(EVENTS.RAG_EMBED_REQUEST, handleEmbedRequest);
    connection.on(EVENTS.RAG_QUERY_REQUEST, handleQueryRequest);
  }
}
