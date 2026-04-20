/**
 * @module Interfaces.IChatHistoryState
 *
 * This module defines the interface and validation schema for chat history state.
 * It represents the complete state of a chat conversation including messages,
 * system prompt, model information, and generation parameters.
 */

// External dependencies
import { z } from "zod";

// Internal dependencies - Import directly from source files to avoid circular dependencies
import { IChatRoleMessage, ChatRoleMessageSchema } from "./IChatRoleMessage";
import { IModelInfo, ModelInfoSchema } from "./IModelInfo";

/**
 * Interface representing the complete state of a chat conversation.
 * Used for persistence, restoration, and state management of chat sessions.
 */
export interface IChatHistoryState {
  /** Array of messages in the conversation history */
  messages: IChatRoleMessage[];

  /** Optional system prompt that sets context for the conversation */
  systemPrompt?: string;

  /** Optional model information for the conversation */
  modelInfo?: IModelInfo;

  /** Optional temperature parameter controlling randomness (0.0-1.0) */
  temperature?: number;

  /** Optional top_p parameter controlling diversity (0.0-1.0) */
  top_p?: number;
}

/**
 * Zod schema for validating chat history state objects.
 * Ensures all properties conform to expected types and formats.
 */
export const ChatHistoryStateSchema = z.object({
  messages: z.array(ChatRoleMessageSchema),
  systemPrompt: z.string().optional(),
  modelInfo: ModelInfoSchema.optional(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
});
