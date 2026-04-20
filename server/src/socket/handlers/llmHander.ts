/**
 * @module Socket.Handlers.LLMHandler
 *
 * This module provides handlers for LLM-related socket events.
 * It implements functions to forward chat requests to language models,
 * list available models, and abort ongoing requests.
 *
 * The handlers manage the communication flow between clients and LLM adapters,
 * including proper error handling and response formatting.
 */

// Internal dependencies
import { IModelInfo } from "../../interfaces";
import log from "../../logger";
import { llmAdapterManager } from "../../adapters";
import { Connection } from "../abstractConnection";
import {
  EVENTS,
  LLMChatAbortMessage,
  LLMChatMessage,
  LLMChatResponse,
  LLMListUpdateMessage,
} from "../apiObjects";

/**
 * Forwards a chat message to the appropriate LLM adapter.
 * Handles model discovery, request routing, error handling,
 * and response delivery.
 *
 * @param connection - Socket connection to send response through
 * @param message - Chat message containing model ID and conversation data
 */
export const forwardToLLMAdapter = async (
  connection: Connection,
  message: LLMChatMessage
) => {
  // Prepare response message structure
  const responseMessage: LLMChatResponse = {
    event: EVENTS.LLM_CHAT_RESPONSE,
    version: "0.1.0",
    data: {
      message: "-- empty --",
    },
    payload: {
      requestID: message.payload.requestID,
      conversationID: message.payload.conversationID,
    },
  };

  // Create abort controller for request cancellation support
  const abortController = new AbortController();

  try {
    const modelInfos: IModelInfo[] =
      await llmAdapterManager.getAvailableModels();
    const modelID = message.data.modelID;
    const model = modelInfos.find((model) => model.id === modelID);

    // Validate model exists
    if (!model) {
      throw new Error(`Model not found: ${modelID}`);
    }

    // Get appropriate adapter for the model
    const adapter = llmAdapterManager.getAdapter(model.adapterID);

    // Validate adapter exists
    if (!adapter) {
      throw new Error(`Adapter not found for model: ${model.id}`);
    }

    // Validate adapter supports chat completions
    if (!adapter.forwardRequest) {
      throw new Error(
        `Model not supported: ${model.provider} for model: ${model.id}`
      );
    }

    // Register request for tracking and potential abortion
    await llmAdapterManager.trackRequest(
      message.payload.requestID,
      abortController,
      adapter
    );

    // Create streaming callback if streaming is enabled
    const onChunk =
      message.data.modelOptions && message.data.modelOptions.stream
        ? (chunk: string) => {
            connection.emit({
              event: EVENTS.LLM_CHAT_STREAM_CHUNK_RESPONSE,
              version: "0.1.0",
              data: {
                chunk: chunk,
              },
              payload: {
                requestID: message.payload.requestID,
                conversationID: message.payload.conversationID,
              },
            });
          }
        : undefined;

    // Prepare messages for the LLM: combine ragContext with content if present
    const messagesForLLM = message.data.messages.map((msg) => {
      // If this is a user message with RAG context, combine them for the LLM
      if (msg.role === "user" && msg.ragContext) {
        return {
          ...msg,
          content: `${msg.ragContext}\n\n${msg.content}`,
          // Don't send ragContext field to the LLM adapter
          ragContext: undefined,
        };
      }
      return msg;
    });

    // Forward request to the adapter (handles both streaming and non-streaming)
    const response: string = await adapter.forwardRequest(
      model.model,
      messagesForLLM,
      message.data.modelOptions,
      abortController.signal,
      message.payload.requestID,
      onChunk
    );

    // Validate response
    if (!response) {
      throw new Error("Empty answer from LLMAdapter");
    }

    // Update response message with LLM output
    responseMessage.data.message = response;
  } catch (error: any) {
    responseMessage.error = error;

    // Do not reinit adapters if the request was just aborted by the client
    if (
      !(
        error.name === "AbortError" || error.message.includes("Request aborted")
      )
    ) {
      try {
        await llmAdapterManager.reinitAdapters();
      } catch (reinitError: any) {
        log.error(
          `Error reinitializing adapters: ${String(reinitError)}`,
          "llmHandler"
        );
      }
      log.debug(error, "llmHandler");
    } else {
      log.error(`Error forwarding request: ${String(error)}`, "llmHandler");
    }
  } finally {
    // Always send response and clean up request tracking
    connection.emit(responseMessage);
    await llmAdapterManager.untrackRequest(message.payload.requestID);
  }
};

/**
 * Aborts an ongoing LLM request.
 *
 * @param connection - Socket connection that sent the abort request
 * @param message - Abort message containing the request ID to cancel
 */
export const abortLLMRequest = async (
  connection: Connection,
  message: LLMChatAbortMessage
) => {
  const requestID = message.payload.requestID;
  try {
    await llmAdapterManager.abortRequest(requestID);
  } catch (error: any) {
    log.error(
      `Error processing abort for ${requestID}: ${error.message}`,
      "llmHandler"
    );
  }
};

/**
 * Lists all available LLM models.
 * Retrieves model information from all initialized adapters
 * and sends the compiled list through the connection.
 *
 * @param connection - Socket connection to send model list through
 * @param message - Optional message containing request ID for correlation
 */
export const listLLMs = async (
  connection: Connection,
  message: LLMChatMessage
) => {
  // Prepare response message structure
  const responseMessage: LLMListUpdateMessage = {
    event: EVENTS.LLM_LIST_UPDATE,
    version: "0.1.0",
    data: {
      models: [],
    },
  };

  // Add request ID for correlation if provided
  if (message && message.payload && message.payload.requestID) {
    responseMessage.payload = {
      requestID: message.payload.requestID,
    };
  }

  try {
    // Retrieve models from all adapters WITHOUT metadata first (fast response)
    const models: IModelInfo[] = await llmAdapterManager.getAvailableModels(
      false
    );
    responseMessage.data.models = models;
  } catch (error) {
    log.error(`Error listing models: ${String(error)}`, "llmHandler");
    responseMessage.error = error;
  } finally {
    // Always send response, even if processing failed
    if (connection) {
      connection.emit(responseMessage);
    }
  }

  // Fetch metadata in background and send update
  // This doesn't block the initial model list
  llmAdapterManager
    .getAvailableModels(true)
    .then((modelsWithMetadata) => {
      if (connection) {
        const updateMessage: LLMListUpdateMessage = {
          event: EVENTS.LLM_LIST_UPDATE,
          version: "0.1.0",
          data: {
            models: modelsWithMetadata,
          },
        };

        if (message && message.payload && message.payload.requestID) {
          updateMessage.payload = {
            requestID: message.payload.requestID,
          };
        }

        connection.emit(updateMessage);
        log.debug("Sent model list with metadata update", "llmHandler");
      }
    })
    .catch((error) => {
      log.error(
        `Error fetching model metadata: ${String(error)}`,
        "llmHandler"
      );
    });
};

export default forwardToLLMAdapter;
