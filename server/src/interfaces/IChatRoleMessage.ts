/**
 * @module Interfaces.IChatRoleMessage
 *
 * This module defines the interface and validation schema for chat role messages.
 * These messages represent individual entries in a conversation between the user
 * and an AI assistant, with role designation and content.
 */

// External dependencies
import { z } from "zod";

/**
 * Interface representing a single message in a chat conversation.
 *
 * Each message has a role (e.g., "user", "assistant", "system"),
 * content text, and an optional source identifier.
 */
export interface IChatRoleMessage {
  /** Role identifier for the message sender (e.g., "user", "assistant", "system") */
  role: string;

  /** The actual text content of the message */
  content: string;

  /** Optional identifier for the message source (e.g., model name) */
  source?: string;

  /** Optional RAG context (the actual prompt sent to LLM, for UI display) */
  ragContext?: string;

  /** Optional RAG metadata (document sources, pages, similarities, for UI display) */
  ragMetadata?: string;

  /** Optional performance metrics for token generation */
  performanceMetrics?: {
    /** Tokens generated per second */
    tokensPerSecond: number;
    /** Total tokens in the response */
    totalTokens: number;
    /** Total time spent generating (ms) */
    totalTimeMs: number;
    /** Time to first token (ms) */
    timeToFirstToken?: number;
  };
}

/**
 * Zod schema for validating chat role message objects.
 * Ensures all properties conform to expected types.
 */
export const ChatRoleMessageSchema = z.object({
  role: z.string(),
  content: z.string(),
  source: z.string().optional(),
  ragContext: z.string().optional(),
  ragMetadata: z.string().optional(),
});
