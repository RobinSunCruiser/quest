/**
 * @fileoverview Custom React hook for managing RAG (Retrieval Augmented Generation) operations.
 * Provides document management, RAG query functionality, and configuration handling.
 *
 * @module Hooks.RAG
 */

import { useState, useCallback } from 'react';
import { ragService, type IRAGConfig } from '@/services';
import { showNotification } from '@/utils';
import { IDocumentChunk } from '@root/server/src/socket/apiObjects';

/**
 * Custom hook for managing RAG operations with state management and error handling.
 * Provides document upload, deletion, querying, and configuration management.
 *
 * @returns Hook interface with RAG state and operations
 *
 * @example
 * ```tsx
 * const {
 *   documents,
 *   loading,
 *   uploadDocument,
 *   deleteDocument,
 *   queryDocuments,
 *   updateConfig,
 *   config
 * } = useRAG();
 *
 * const handleFileUpload = async (file: File) => {
 *   try {
 *     const docId = await uploadDocument(file);
 *     console.log('Uploaded document:', docId);
 *   } catch (error) {
 *     console.error('Upload failed:', error);
 *   }
 * };
 * ```
 */
export const useRAG = () => {
  /** Loading state for async operations */
  const [loading, setLoading] = useState(false);

  /** List of uploaded documents */
  const [documents, setDocuments] = useState<
    Array<{ id: string; name: string; chunkCount: number }>
  >(ragService.listDocuments());

  /** Current RAG configuration */
  const [config, setConfig] = useState<IRAGConfig>(ragService.getConfig());

  /**
   * Uploads a PDF document, processes it, and generates embeddings.
   * Updates the documents list on success.
   *
   * @param file - The PDF file to upload
   * @returns Promise resolving to the document ID
   * @throws {Error} When upload or processing fails
   */
  const uploadDocument = useCallback(async (file: File): Promise<string> => {
    if (loading) {
      throw new Error('Another operation is in progress');
    }

    setLoading(true);

    try {
      const documentId = await ragService.uploadDocument(file);

      // Update documents list
      setDocuments(ragService.listDocuments());

      showNotification({
        title: 'Document Uploaded',
        message: `"${file.name}" has been processed and indexed.`,
        type: 'success',
        autoClose: 3000,
      });

      return documentId;
    } catch (error: any) {
      const errorMessage = error?.message || 'An unknown error occurred';

      showNotification({
        title: 'Upload Failed',
        message: errorMessage,
        type: 'error',
        autoClose: 5000,
      });

      throw error;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  /**
   * Deletes a document from the RAG system.
   * Updates the documents list on success.
   *
   * @param documentId - The ID of the document to delete
   */
  const deleteDocument = useCallback((documentId: string): void => {
    try {
      const docs = ragService.listDocuments();
      const doc = docs.find((d) => d.id === documentId);

      ragService.deleteDocument(documentId);

      // Update documents list
      setDocuments(ragService.listDocuments());

      showNotification({
        title: 'Document Deleted',
        message: doc ? `"${doc.name}" has been removed.` : 'Document removed.',
        type: 'info',
        autoClose: 2000,
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'An unknown error occurred';

      showNotification({
        title: 'Delete Failed',
        message: errorMessage,
        type: 'error',
        autoClose: 3000,
      });

      throw error;
    }
  }, []);

  /**
   * Queries all documents for relevant chunks based on the query text.
   *
   * @param query - The query text
   * @param topK - Optional number of top results to return
   * @returns Promise resolving to array of relevant chunks with similarity scores
   */
  const queryDocuments = useCallback(
    async (
      query: string,
      topK?: number
    ): Promise<Array<{ chunk: IDocumentChunk; score: number }>> => {
      if (!query || query.trim().length === 0) {
        return [];
      }

      if (documents.length === 0) {
        console.warn('No documents available for RAG query');
        return [];
      }

      try {
        const results = await ragService.query(query, topK);
        return results;
      } catch (error: any) {
        const errorMessage = error?.message || 'An unknown error occurred';

        showNotification({
          title: 'Query Failed',
          message: errorMessage,
          type: 'error',
          autoClose: 3000,
        });

        throw error;
      }
    },
    [documents]
  );

  /**
   * Updates the RAG configuration.
   *
   * @param newConfig - Partial configuration to update
   */
  const updateConfig = useCallback((newConfig: Partial<IRAGConfig>): void => {
    ragService.updateConfig(newConfig);
    setConfig(ragService.getConfig());

    showNotification({
      title: 'RAG Configuration Updated',
      message: 'Settings have been updated.',
      type: 'info',
      autoClose: 2000,
    });
  }, []);

  /**
   * Refreshes the documents list from the service.
   * Useful for syncing state after external changes.
   */
  const refreshDocuments = useCallback((): void => {
    setDocuments(ragService.listDocuments());
  }, []);

  return {
    /** List of uploaded documents */
    documents,
    /** Loading state for async operations */
    loading,
    /** Current RAG configuration */
    config,
    /** Uploads and processes a PDF document */
    uploadDocument,
    /** Deletes a document */
    deleteDocument,
    /** Queries documents for relevant chunks */
    queryDocuments,
    /** Updates RAG configuration */
    updateConfig,
    /** Refreshes the documents list */
    refreshDocuments,
  };
};
