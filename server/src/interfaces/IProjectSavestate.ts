/**
 * @module Interfaces.IProjectSavestate
 *
 * This module defines interfaces and validation schemas for project save states.
 * It provides structures for storing and validating multi-model conversations,
 * custom messages, and project configuration options.
 */

// External dependencies
import { z } from "zod";

// Internal dependencies
import { IChatRoleMessage, ChatRoleMessageSchema } from "./IChatRoleMessage";
import { IModelInfo, ModelInfoSchema } from "./IModelInfo";
import { IModelOptions, ModelOptionsSchema } from "./IModelOptions";
import { IMessageEvaluation } from "./IMessageEvaluation";

/**
 * Interface representing a custom message template.
 * Custom messages allow users to save and reuse message templates.
 */
export interface ICustomMessage {
  /** Display name for this message template */
  label: string;

  /** Content of the message template */
  message: string;

  /** Indicates if this template has been used in the project */
  used: boolean;

  /** Indicates if this template has been modified from its original state */
  edited: boolean;
}

/**
 * Zod schema for validating custom message objects.
 */
export const CustomMessageSchema = z.object({
  label: z.string(),
  message: z.string(),
  used: z.boolean(),
  edited: z.boolean(),
});

/**
 * Interface representing project-wide configuration options.
 * These settings apply to all models in the project.
 * Made optional for backwards compatibility with legacy project files.
 */
export interface IProjectOptions {
  /** Maximum time (in ms) to wait for model responses */
  timeout?: number;

  /** Whether to render messages with Markdown formatting */
  markdown?: boolean;

  /** System prompt to use for all conversations */
  systemPrompt?: string;

  /** Whether to extract and display thinking blocks from model responses */
  parseThinkingBlock?: boolean;

  /** Whether to show consensus scores in chat messages */
  showConsensusScores?: boolean;

  /** Threshold for μ (upper triangular mean) - above this is considered good consensus */
  consensusMuThreshold?: number;

  /** Threshold for σ (standard deviation) - below this is considered good consensus */
  consensusSigmaThreshold?: number;

  /** Number of batch runs for each selected model (1 = no batching) */
  batchSize?: number;

  /** Optional model settings */
  modelOptions?: IModelOptions;
}

/**
 * Zod schema for validating project options objects with backwards compatibility.
 * Makes most fields optional to handle legacy project files gracefully.
 */
export const ProjectOptionsSchema = z.object({
  timeout: z.number().optional(),
  markdown: z.boolean().optional(),
  systemPrompt: z.string().optional(),
  parseThinkingBlock: z.boolean().optional(),
  showConsensusScores: z.boolean().optional(),
  consensusMuThreshold: z.number().min(0).max(1).optional(),
  consensusSigmaThreshold: z.number().min(0).max(1).optional(),
  batchSize: z.number().min(1).optional(),
  modelOptions: ModelOptionsSchema.optional(),
});

/**
 * Interface representing the complete state of a project.
 * Contains all model conversations, custom messages, project options, and evaluation data.
 * Made optional for backwards compatibility with legacy project files.
 */
export interface IProjectSavestate {
  /** Array of model-specific conversations and settings */
  models?: {
    /** Unique identifier for this model instance */
    modelID: string;

    /** Detailed information about the model */
    modelInfo?: IModelInfo;

    /** Message history for this model */
    messages?: IChatRoleMessage[];
  }[];

  /** Collection of custom message templates */
  customMessages?: ICustomMessage[];

  /** Project-wide configuration options */
  options?: IProjectOptions;

  /** Evaluation data indexed by message position */
  evaluations?: {
    /** Message index (or -1 for custom message comparisons) */
    messageIndex: number;

    /** Complete evaluation results including all similarity metrics */
    evaluation: IMessageEvaluation;

    /** Client-computed consensus metrics and MDS coordinates */
    analysis?: {
      /** 2D MDS coordinates for visualization */
      mdsCoordinates?: number[][];

      /** Consensus mu (upper triangular mean) */
      consensusMu?: number;

      /** Consensus sigma (standard deviation) */
      consensusSigma?: number;

      /** Additional client-computed metadata */
      [key: string]: any;
    };
  }[];
}

/**
 * Zod schema for validating complete project save state objects with backwards compatibility.
 * Makes fields optional to handle various legacy project file formats gracefully.
 */
export const ProjectSavestateSchema = z.object({
  models: z.array(
    z.object({
      modelID: z.string(),
      modelInfo: ModelInfoSchema.optional(),
      messages: z.array(ChatRoleMessageSchema).optional(),
      temperature: z.number().optional(),
      top_p: z.number().optional(),
      seed: z.number().optional(),
      presence_penalty: z.number().optional(),
      frequency_penalty: z.number().optional(),
    })
  ).optional(),
  customMessages: z.array(CustomMessageSchema).optional(),
  options: ProjectOptionsSchema.optional(),
  evaluations: z.array(
    z.object({
      messageIndex: z.number(),
      evaluation: z.any(), // IMessageEvaluation - using any for flexibility
      clientData: z.record(z.any()).optional(),
    })
  ).optional(),
});
