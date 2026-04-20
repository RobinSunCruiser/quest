/**
 * @module Socket.Handlers.RAGHandler
 *
 * This module provides handlers for RAG (Retrieval Augmented Generation) operations.
 * It supports:
 * - Generating embeddings for document chunks
 * - Querying documents using cosine similarity search
 */

import { dot, sqrt, round } from "mathjs";

import { Connection } from "../abstractConnection";
import {
  EVENTS,
  RAGEmbedMessage,
  RAGEmbedResponseMessage,
  RAGQueryMessage,
  RAGQueryResponseMessage,
} from "../apiObjects";
import { llmAdapterManager } from "../../adapters";
import config from "../../file/config_manager";
import log from "../../logger";

const DEFAULT_EMBEDDINGS_CONFIG = {
  embedding_1: {
    adapter: "local",
    model: "mxbai-embed-large",
  },
};

/**
 * Handles embedding generation requests for RAG document chunks.
 * Generates embeddings using the configured embedding model.
 */
export const handleEmbedRequest = async (
  connection: Connection,
  message: RAGEmbedMessage
) => {
  const responseMessage: RAGEmbedResponseMessage = {
    event: EVENTS.RAG_EMBED_RESPONSE,
    version: "0.1.0",
    data: {
      embeddings: [],
    },
    payload: {
      requestID: message.payload.requestID,
    },
  };

  try {
    const { chunks } = message.data;

    if (!chunks || chunks.length === 0) {
      throw new Error("No chunks provided for embedding");
    }

    log.debug(
      `Generating embeddings for ${chunks.length} chunks`,
      "ragHandler"
    );

    // Get embedding configuration
    const embeddingsConfig: any = config.get(
      "Embeddings",
      DEFAULT_EMBEDDINGS_CONFIG
    );

    // Use the first configured embedding model
    const firstEmbeddingKey = Object.keys(embeddingsConfig)[0];
    const embeddingConfig = embeddingsConfig[firstEmbeddingKey];

    if (!embeddingConfig) {
      throw new Error("No embedding configuration found");
    }

    const adapter = llmAdapterManager.getAdapter(embeddingConfig.adapter);

    if (!adapter) {
      throw new Error(`Adapter '${embeddingConfig.adapter}' not found`);
    }

    // Extract text from chunks
    const texts = chunks.map((chunk) => chunk.text);

    // Generate embeddings
    const embeddings = await adapter.getEmbeddings(
      embeddingConfig.model,
      texts,
      120000 // 2 minute timeout
    );

    log.debug(
      `Generated ${embeddings.length} embeddings for RAG chunks`,
      "ragHandler"
    );

    responseMessage.data.embeddings = embeddings;
  } catch (error: any) {
    log.error(`Error generating embeddings: ${String(error)}`, "ragHandler");
    responseMessage.error = error;

    if (error.name !== "AbortError") {
      llmAdapterManager.reinitAdapters();
    }
  } finally {
    connection?.emit(responseMessage);
  }
};

/**
 * Handles RAG query requests.
 * Calculates cosine similarity between query and document chunks,
 * returning the top-k most relevant chunks.
 */
export const handleQueryRequest = async (
  connection: Connection,
  message: RAGQueryMessage
) => {
  const responseMessage: RAGQueryResponseMessage = {
    event: EVENTS.RAG_QUERY_RESPONSE,
    version: "0.1.0",
    data: {
      results: [],
    },
    payload: {
      requestID: message.payload.requestID,
    },
  };

  try {
    const { query, chunkEmbeddings, chunks, topK } = message.data;

    if (!query) {
      throw new Error("Query text is required");
    }

    if (!chunks || chunks.length === 0) {
      throw new Error("No chunks provided for querying");
    }

    if (!chunkEmbeddings || chunkEmbeddings.length !== chunks.length) {
      throw new Error("Chunk embeddings must match chunks length");
    }

    log.debug(
      `Querying ${chunks.length} chunks for: "${query.substring(0, 50)}..."`,
      "ragHandler"
    );

    // Get embedding configuration
    const embeddingsConfig: any = config.get(
      "Embeddings",
      DEFAULT_EMBEDDINGS_CONFIG
    );

    // Use the first configured embedding model
    const firstEmbeddingKey = Object.keys(embeddingsConfig)[0];
    const embeddingConfig = embeddingsConfig[firstEmbeddingKey];

    if (!embeddingConfig) {
      throw new Error("No embedding configuration found");
    }

    const adapter = llmAdapterManager.getAdapter(embeddingConfig.adapter);

    if (!adapter) {
      throw new Error(`Adapter '${embeddingConfig.adapter}' not found`);
    }

    // Generate embedding for the query
    const queryEmbeddings = await adapter.getEmbeddings(
      embeddingConfig.model,
      [query],
      120000 // 2 minute timeout
    );

    if (queryEmbeddings.length === 0) {
      throw new Error("Failed to generate query embedding");
    }

    const queryEmbedding = queryEmbeddings[0];

    // Calculate cosine similarity for each chunk
    const similarities = chunkEmbeddings.map((chunkEmbedding, index) => ({
      chunk: chunks[index],
      score: cosineSimilarity(queryEmbedding, chunkEmbedding),
    }));

    // Sort by score (descending) and take top-k
    const results = similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    log.debug(
      `Retrieved ${results.length} chunks with scores: ${results.map((r) => r.score).join(", ")}`,
      "ragHandler"
    );

    responseMessage.data.results = results;
  } catch (error: any) {
    log.error(`Error querying documents: ${String(error)}`, "ragHandler");
    responseMessage.error = error;

    if (error.name !== "AbortError") {
      llmAdapterManager.reinitAdapters();
    }
  } finally {
    connection?.emit(responseMessage);
  }
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
 * Returns a value between -1 and 1, where 1 means identical direction.
 */
const cosineSimilarity = (a: number[], b: number[]): number => {
  return round(dot(a, b) / magnitude(a) / magnitude(b), 3);
};
