/**
 * @module Socket.Handlers.EvalHandler
 *
 * This module provides handlers for evaluating and comparing responses from
 * multiple language models. It calculates various similarity metrics including:
 * - Cosine similarity between embeddings
 * - Levenshtein edit distance
 * - Jaccard similarity
 *
 * The module also supports extracting and comparing "thinking blocks" from model
 * responses to analyze reasoning differences between models.
 */

import { distance } from "fastest-levenshtein";
import { dot, sqrt, round } from "mathjs";

import { Connection } from "../abstractConnection";
import { EVENTS, LLMEvalMessage, LLMEvalResponseMessage } from "../apiObjects";
import { llmAdapterManager } from "../../adapters";
import config from "../../file/config_manager";
import {
  checkForThinkingBlock,
  removeThinkingBlock,
} from "../../utils/strings";
import {
  IEmbeddingConfig,
  IModelCosine,
  IModelEmbedding,
} from "../../interfaces";
import log from "../../logger";

const DEFAULT_EMBEDDINGS_CONFIG = {
  embedding_1: {
    adapter: "local",
    model: "bge-m3",
  },
};

/**
 * Evaluates similarity between multiple model responses.
 * Calculates various similarity metrics and sends results back through the connection.
 */
export const evaluate = async (
  connection: Connection,
  message: LLMEvalMessage
) => {
  const responseMessage: LLMEvalResponseMessage = {
    event: EVENTS.LLM_EVAL_RESPONSE,
    version: "0.1.0",
    data: {
      evaluation: {
        models: [],
        cosines: [],
        levenshtein: [],
        levenshteinNormalized: [],
        jaccard: [],
      },
    },
    payload: {
      requestID: message.payload.requestID,
    },
  };

  try {
    const models = message.data.chatModels;
    if (!models) throw new Error("Chat models are required for evaluation");

    // Handle thinking blocks if requested
    if (message.data.options.removeThinkingBlock) {
      const modelsWithThinking = models
        .filter((model) => checkForThinkingBlock(model.message))
        .map((model) => ({
          ...model,
          modelID: `${model.modelID}+think`,
        }));

      models.forEach((model) => {
        model.message = removeThinkingBlock(model.message);
      });

      models.push(...modelsWithThinking);
    }

    if (models.length < 2) {
      throw new Error("At least two models are required for evaluation");
    }

    log.debug(`Evaluating ${models.length} models with options`, "evalHandler");

    // Generate embeddings
    const embeddings = await getEmbeddings(
      models.map((model) => model.message),
      1200000
    );

    log.debug("finished embedding generation", "evalHandler");

    // Initialize metric arrays
    const levenshteinArray: number[][] = [];
    const jaccardArray: number[][] = [];
    const cosines: IModelCosine[] = embeddings.map((embedding) => ({
      embeddingModel: embedding.embeddingModel,
      cosine: [],
    }));

    // Calculate all similarity metrics
    for (let i = 0; i < models.length; i++) {
      levenshteinArray[i] = [];
      jaccardArray[i] = [];
      cosines.forEach((cosine) => (cosine.cosine[i] = []));

      for (let j = 0; j < models.length; j++) {
        const modelA = models[i];
        const modelB = models[j];

        if (!modelA.message || !modelB.message) {
          throw new Error("Models must have a message");
        }

        // Calculate text-based metrics
        levenshteinArray[i][j] = levenshtein(modelA.message, modelB.message);
        jaccardArray[i][j] = jaccard(modelA.message, modelB.message);

        // Calculate cosine similarity for each embedding model
        embeddings.forEach((embedding, k) => {
          cosines[k].cosine[i][j] = cosineSimilarity(
            embedding.embeddings[i],
            embedding.embeddings[j]
          );
        });
      }
    }

    // Calculate normalized Levenshtein (matrix-wide: 1 - distance / maxDistance)
    const maxLevenshtein = Math.max(...levenshteinArray.flat());
    const levenshteinNormalizedArray: number[][] = levenshteinArray.map(row =>
      row.map(value => round(1 - value / maxLevenshtein, 3))
    );

    responseMessage.data.evaluation = {
      models,
      cosines,
      levenshtein: levenshteinArray,
      levenshteinNormalized: levenshteinNormalizedArray,
      jaccard: jaccardArray,
    };
  } catch (error: any) {
    log.error(`Error evaluating models: ${String(error)}`, "evalHandler");
    responseMessage.error = error;

    if (error.name !== "AbortError") {
      llmAdapterManager.reinitAdapters();
    }
  } finally {
    connection?.emit(responseMessage);
  }
};

/**
 * Generates embeddings for a list of text messages using configured embedding models.
 */
const getEmbeddings = async (
  messages: string[],
  timeout: number
): Promise<IModelEmbedding[]> => {
  const embeddingsConfig: IEmbeddingConfig = config.get(
    "Embeddings",
    DEFAULT_EMBEDDINGS_CONFIG
  );

  const embeddingsList: IModelEmbedding[] = [];

  for (const embeddingID in embeddingsConfig) {
    const config = embeddingsConfig[embeddingID];
    const adapter = llmAdapterManager.getAdapter(config.adapter);

    if (!adapter) {
      throw new Error(`Adapter '${config.adapter}' not found`);
    }

    const embeddings = await adapter.getEmbeddings(
      config.model,
      messages,
      timeout
    );

    log.debug(
      `Got ${embeddings.length} embeddings from adapter ${config.adapter}`,
      "evalHandler"
    );

    embeddingsList.push({
      embeddingModel: {
        embeddingID,
        modelID: `${config.adapter}-${config.model}`,
      },
      embeddings,
    });
  }

  return embeddingsList;
};

/**
 * Calculates the magnitude (Euclidean norm) of a vector.
 */
const magnitude = (a: number[]): number => {
  const result = sqrt(dot(a, a));
  return typeof result === "number" ? result : result.re;
};

/**
 * Calculates cosine similarity between two vectors.
 */
const cosineSimilarity = (a: number[], b: number[]): number => {
  return round(dot(a, b) / magnitude(a) / magnitude(b), 3);
};

/**
 * Calculates Levenshtein distance between two strings.
 */
const levenshtein = (a: string, b: string): number => {
  return distance(a, b);
};

/**
 * Calculates Jaccard similarity between two strings.
 */
const jaccard = (a: string, b: string): number => {
  const set1 = new Set(preprocess(a));
  const set2 = new Set(preprocess(b));

  const intersection = new Set([...set1].filter((x) => set2.has(x))).size;
  const union = new Set([...set1, ...set2]).size;

  return round(intersection / union, 3);
};

/**
 * Preprocesses text for similarity calculation.
 */
const preprocess = (text: string): string[] => {
  return text.match(/\p{L}+/gu)?.map((word) => word.toLowerCase()) || [];
};

export default evaluate;
