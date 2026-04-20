/**
 * @module Socket.Handlers.AdapterHandler
 *
 * This module provides handler functions for adapter-related socket events.
 * It enables remote reinitialization of LLM adapters through socket connections,
 * allowing clients to trigger adapter reloads without restarting the server.
 *
 * The handlers ensure proper request-response flow with error handling
 * for adapter reinitialization operations.
 */

// Internal dependencies
import { llmAdapterManager } from "../../adapters";
import { Connection } from "../abstractConnection";
import {
  EVENTS,
  LLMEvalMessage,
  AdapterReloadResponseMessage,
  LLMChatMessage,
} from "../apiObjects";
import { listLLMs } from "./llmHander";

/**
 * Handles requests to reinitialize all LLM adapters.
 * Attempts to reload all adapters and responds with success or error information.
 *
 * @param connection - The socket connection that sent the reload request
 * @param message - The original request message containing request ID
 */
export const reinitAdapters = async (
  connection: Connection,
  message: LLMEvalMessage
) => {
  // Prepare the response message with the same request ID
  const responseMessage: AdapterReloadResponseMessage = {
    event: EVENTS.RELOAD_ADAPTERS_RESPONSE,
    version: "0.1.0",
    payload: {
      requestID: message.payload.requestID,
    },
  };

  try {
    // Attempt to reinitialize all adapters
    await llmAdapterManager.reinitAdapters();
    await listLLMs(connection, {} as LLMChatMessage)
  } catch (error) {
    // If reinitialization fails, format the error for client-side consumption
    responseMessage.error = error;
  } finally {
    // Always send a response, whether successful or not
    if (connection) {
      connection.emit(responseMessage);
    }
  }
};
