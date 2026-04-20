/**
 * @module Services.RAGService
 *
 * This module provides RAG (Retrieval Augmented Generation) functionality for the application.
 * It handles:
 * - PDF document parsing and text extraction
 * - Document chunking with configurable size and overlap
 * - Embedding generation via server-side adapters
 * - Vector similarity search for retrieval
 * - In-memory document and embedding storage
 */

import { v4 as uuidv4 } from 'uuid';
import { EVENTS, IDocumentChunk, RAGEmbedMessage, RAGEmbedResponseMessage, RAGQueryMessage, RAGQueryResponseMessage } from '@root/server/src/socket/apiObjects';
import { socketService } from '@/services';
import * as pdfjsLib from 'pdfjs-dist';
import nunjucks from 'nunjucks';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

// Configure Nunjucks environment
const nunjucksEnv = new nunjucks.Environment(null, { autoescape: false });

/**
 * Interface for a stored document with its chunks and embeddings
 */
export interface IStoredDocument {
    /** Unique identifier for the document */
    id: string;
    /** Original filename */
    name: string;
    /** Document chunks */
    chunks: IDocumentChunk[];
    /** Embeddings for each chunk */
    embeddings: number[][];
}

/**
 * Configuration for RAG operations
 */
export interface IRAGConfig {
    /** Size of each text chunk in characters */
    chunkSize: number;
    /** Overlap between chunks in characters */
    chunkOverlap: number;
    /** Number of top results to retrieve */
    topK: number;
    /** Whether RAG is enabled */
    enabled: boolean;
    /** Nunjucks template for RAG prompt augmentation (has standard format as default, can be customized or cleared) */
    promptTemplate: string;
}

/**
 * Enriched RAG result with document metadata
 */
export interface IEnrichedRAGResult {
    /** The document chunk */
    chunk: IDocumentChunk;
    /** Similarity score */
    score: number;
    /** Name of the source document */
    documentName: string;
    /** Page number (for PDFs, undefined for TXT files) */
    pageNumber?: number;
    /** Document type */
    documentType: 'pdf' | 'txt';
}

/**
 * Service class for managing RAG operations.
 * Handles document processing, embedding generation, and retrieval.
 */
export class RAGService {
    /** In-memory storage for documents */
    private documents: Map<string, IStoredDocument> = new Map();

    /** Default RAG configuration */
    private config: IRAGConfig = {
        chunkSize: 1000,
        chunkOverlap: 200,
        topK: 3,
        enabled: true,
        promptTemplate: `Retrieved context from uploaded documents:

{% for result in results %}
{{ result.chunk.text }}{% if not loop.last %}

---

{% endif %}
{% endfor %}

User Message:
{{ query }}`,
    };

    /**
     * Uploads and processes a document (PDF or TXT).
     * Extracts text, chunks it, generates embeddings, and stores in memory.
     *
     * @param file - The PDF or TXT file to upload
     * @returns Promise resolving to the document ID
     */
    async uploadDocument(file: File): Promise<string> {
        if (file.type !== 'application/pdf' && file.type !== 'text/plain') {
            throw new Error('Only PDF and TXT files are supported');
        }

        try {
            // Extract text and page data based on file type
            let text: string;
            let pageData: Array<{ pageNum: number; text: string }> | undefined;

            if (file.type === 'application/pdf') {
                const pdfPages = await this.extractTextFromPDF(file);
                pageData = pdfPages;
                // Concatenate all pages with '\n\n' separator for chunking
                text = pdfPages.map(p => p.text).join('\n\n');
            } else {
                text = await this.extractTextFromTXT(file);
                pageData = undefined; // TXT files don't have pages
            }

            if (!text || text.trim().length === 0) {
                throw new Error('No text content found in document');
            }

            // Generate document ID
            const documentId = uuidv4();

            // Chunk the text with page data (if PDF)
            const chunks = this.chunkText(text, documentId, pageData);

            if (chunks.length === 0) {
                throw new Error('Failed to create chunks from document');
            }

            // Generate embeddings for chunks
            const embeddings = await this.generateEmbeddings(chunks);

            // Store the document with type information
            const document: IStoredDocument = {
                id: documentId,
                name: file.name,
                chunks,
                embeddings,
            };

            this.documents.set(documentId, document);

            return documentId;
        } catch (error) {
            console.error('Error uploading document:', error);
            throw error;
        }
    }

    /**
     * Deletes a document from storage.
     *
     * @param documentId - The ID of the document to delete
     */
    deleteDocument(documentId: string): void {
        if (!this.documents.has(documentId)) {
            throw new Error(`Document with ID ${documentId} not found`);
        }

        this.documents.delete(documentId);
    }

    /**
     * Lists all uploaded documents.
     *
     * @returns Array of document metadata
     */
    listDocuments(): Array<{ id: string; name: string; chunkCount: number }> {
        return Array.from(this.documents.values()).map((doc) => ({
            id: doc.id,
            name: doc.name,
            chunkCount: doc.chunks.length,
        }));
    }

    /**
     * Queries all documents for relevant chunks with enriched metadata.
     *
     * @param query - The query text
     * @param topK - Number of top results to return (optional, uses config default)
     * @returns Promise resolving to array of enriched results with document names, types, and page numbers
     */
    async query(query: string, topK?: number): Promise<Array<IEnrichedRAGResult>> {
        if (!this.config.enabled) {
            return [];
        }

        if (this.documents.size === 0) {
            console.warn('No documents available for RAG query');
            return [];
        }

        // Collect all chunks and embeddings from all documents
        const allChunks: IDocumentChunk[] = [];
        const allEmbeddings: number[][] = [];

        for (const doc of this.documents.values()) {
            allChunks.push(...doc.chunks);
            allEmbeddings.push(...doc.embeddings);
        }

        if (allChunks.length === 0) {
            return [];
        }

        return new Promise((resolve, reject) => {
            try {
                const requestID = uuidv4();
                const message: RAGQueryMessage = {
                    event: EVENTS.RAG_QUERY_REQUEST,
                    version: '0.1.0',
                    data: {
                        query,
                        chunkEmbeddings: allEmbeddings,
                        chunks: allChunks,
                        topK: topK || this.config.topK,
                    },
                    payload: {
                        requestID,
                    },
                };

                // Set up timeout
                const timer = setTimeout(() => {
                    socketService.off(EVENTS.RAG_QUERY_RESPONSE, responseHandler);
                    reject(new Error('RAG query timed out'));
                }, 120000);

                // Handler for the response
                const responseHandler = (response: RAGQueryResponseMessage) => {
                    // Check if this response matches our request
                    if (response.payload?.requestID !== requestID) {
                        return;
                    }

                    clearTimeout(timer);
                    socketService.off(EVENTS.RAG_QUERY_RESPONSE, responseHandler);

                    if (response.error) {
                        reject(new Error(`RAG query failed: ${JSON.stringify(response.error)}`));
                        return;
                    }

                    // Enrich results with document metadata
                    const enrichedResults: IEnrichedRAGResult[] = response.data.results.map(result => {
                        const doc = this.documents.get(result.chunk.documentId);
                        return {
                            chunk: result.chunk,
                            score: result.score,
                            documentName: doc?.name || 'Unknown Document',
                            pageNumber: result.chunk.metadata?.page,
                            documentType: doc?.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt',
                        };
                    });

                    resolve(enrichedResults);
                };

                // Listen for the response
                socketService.on(EVENTS.RAG_QUERY_RESPONSE, responseHandler);

                // Send the request
                socketService.send(message);
            } catch (error) {
                console.error('Error querying documents:', error);
                reject(error);
            }
        });
    }

    /**
     * Updates the RAG configuration.
     *
     * @param config - Partial configuration to update
     */
    updateConfig(config: Partial<IRAGConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Gets the current RAG configuration.
     *
     * @returns Current configuration
     */
    getConfig(): IRAGConfig {
        return { ...this.config };
    }

    /**
     * Gets the default prompt template.
     * Used for resetting custom templates back to default.
     */
    getDefaultPromptTemplate(): string {
        return `Retrieved context from uploaded documents:

{% for result in results %}
{{ result.chunk.text }}{% if not loop.last %}

---

{% endif %}
{% endfor %}

User Message:
{{ query }}`;
    }

    /**
     * Renders the RAG context from retrieved chunks.
     * Supports Nunjucks templates for customization.
     * Generates two separate outputs:
     * 1. promptForLLM: The actual prompt sent to the LLM (uses Nunjucks template)
     * 2. ragMetadata: Separate metadata summary (document sources, pages, similarities)
     *
     * @param query - The user's query text
     * @param results - Enriched results with document metadata
     * @returns Object with promptForLLM (LLM prompt) and ragMetadata (source summary)
     */
    renderPrompt(query: string, results: Array<IEnrichedRAGResult>): { promptForLLM: string; ragMetadata: string } {
        // === Build LLM prompt (uses template if provided, otherwise standard format) ===
        let promptForLLM: string;

        if (this.config.promptTemplate && this.config.promptTemplate.trim().length > 0) {
            // Use custom Nunjucks template
            try {
                promptForLLM = nunjucksEnv.renderString(this.config.promptTemplate, {
                    query,
                    results,
                });
            } catch (error) {
                console.error('Error rendering custom template, falling back to standard format:', error);
                // Fallback to standard format
                const llmContext = results.map((result) => result.chunk.text).join('\n\n---\n\n');
                promptForLLM = `Retrieved context from uploaded documents:\n\n${llmContext}\n\nUser Message:\n${query}`;
            }
        } else {
            // Use standard format (clean, no metadata)
            const llmContext = results
                .map((result) => result.chunk.text)
                .join('\n\n---\n\n');
            promptForLLM = `Retrieved context from uploaded documents:\n\n${llmContext}\n\nUser Message:\n${query}`;
        }

        // === Build metadata section separately ===
        const metadataLines = results.map((result, index) => {
            const source = result.documentName;
            const page = result.pageNumber ? `, Page ${result.pageNumber}` : '';
            const similarity = result.score.toFixed(3);
            return `[${index + 1}] ${source}${page} - Similarity: ${similarity}`;
        });

        // Build unique document list
        const uniqueDocs = new Map<string, string>();
        results.forEach(result => {
            uniqueDocs.set(result.chunk.documentId, result.documentName);
        });
        const docList = Array.from(uniqueDocs.values()).join(', ');

        const ragMetadata = `Source Documents:\n${metadataLines.join('\n')}\n\nDocuments used: ${docList}`;

        return {
            promptForLLM,
            ragMetadata
        };
    }

    /**
     * Extracts text content from a TXT file.
     *
     * @param file - The TXT file to process
     * @returns Promise resolving to extracted text
     * @private
     */
    private async extractTextFromTXT(file: File): Promise<string> {
        return await file.text();
    }

    /**
     * Extracts text content from a PDF file using pdfjs-dist with page tracking.
     * Returns an array of page objects containing page number and text.
     *
     * @param file - The PDF file to process
     * @returns Promise resolving to array of pages with text and page numbers
     * @private
     */
    private async extractTextFromPDF(file: File): Promise<Array<{ pageNum: number; text: string }>> {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        const pages: Array<{ pageNum: number; text: string }> = [];

        // Extract text from each page with page number
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => ('str' in item ? item.str : ''))
                .join(' ');
            pages.push({ pageNum, text: pageText });
        }

        return pages;
    }

    /**
     * Chunks text into overlapping segments with optional page tracking.
     *
     * @param text - The text to chunk
     * @param documentId - The document ID for these chunks
     * @param pageData - Optional array of page objects with page numbers and text (for PDFs)
     * @returns Array of document chunks
     * @private
     */
    private chunkText(text: string, documentId: string, pageData?: Array<{ pageNum: number; text: string }>): IDocumentChunk[] {
        const chunks: IDocumentChunk[] = [];
        const { chunkSize, chunkOverlap } = this.config;

        // Build a map of character position to page number if pageData is provided
        let positionToPage: Map<number, number> | undefined;
        if (pageData && pageData.length > 0) {
            positionToPage = new Map();
            let currentPos = 0;
            for (const page of pageData) {
                const pageLength = page.text.length + 2; // +2 for '\n\n' separator
                for (let i = 0; i < pageLength; i++) {
                    positionToPage.set(currentPos + i, page.pageNum);
                }
                currentPos += pageLength;
            }
        }

        let position = 0;
        let chunkIndex = 0;

        while (position < text.length) {
            const chunkText = text.slice(position, position + chunkSize);

            if (chunkText.trim().length > 0) {
                const chunk: IDocumentChunk = {
                    id: uuidv4(),
                    documentId,
                    text: chunkText.trim(),
                    metadata: {
                        position,
                    },
                };

                // Add page number if available (use page of first character in chunk)
                if (positionToPage) {
                    const pageNum = positionToPage.get(position);
                    if (pageNum !== undefined) {
                        chunk.metadata!.page = pageNum;
                    }
                }

                chunks.push(chunk);
            }

            chunkIndex++;
            position += chunkSize - chunkOverlap;
        }

        return chunks;
    }

    /**
     * Generates embeddings for document chunks via the server.
     *
     * @param chunks - The chunks to embed
     * @returns Promise resolving to array of embedding vectors
     * @private
     */
    private async generateEmbeddings(chunks: IDocumentChunk[]): Promise<number[][]> {
        return new Promise((resolve, reject) => {
            try {
                const requestID = uuidv4();
                const message: RAGEmbedMessage = {
                    event: EVENTS.RAG_EMBED_REQUEST,
                    version: '0.1.0',
                    data: {
                        chunks,
                    },
                    payload: {
                        requestID,
                    },
                };

                // Set up timeout
                const timer = setTimeout(() => {
                    socketService.off(EVENTS.RAG_EMBED_RESPONSE, responseHandler);
                    reject(new Error('Embedding generation timed out'));
                }, 180000);

                // Handler for the response
                const responseHandler = (response: RAGEmbedResponseMessage) => {
                    // Check if this response matches our request
                    if (response.payload?.requestID !== requestID) {
                        return;
                    }

                    clearTimeout(timer);
                    socketService.off(EVENTS.RAG_EMBED_RESPONSE, responseHandler);

                    if (response.error) {
                        reject(new Error(`Embedding generation failed: ${JSON.stringify(response.error)}`));
                        return;
                    }

                    resolve(response.data.embeddings);
                };

                // Listen for the response
                socketService.on(EVENTS.RAG_EMBED_RESPONSE, responseHandler);

                // Send the request
                socketService.send(message);
            } catch (error) {
                console.error('Error generating embeddings:', error);
                reject(error);
            }
        });
    }
}

// Export singleton instance
export const ragService = new RAGService();
