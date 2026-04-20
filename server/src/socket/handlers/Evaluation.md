# Understanding Model Response Evaluation in QUEST

The evaluation system in QUEST provides a sophisticated multi-dimensional analysis of similarities between different LLM responses. When you compare model outputs, the system calculates three distinct metrics simultaneously to give you a complete understanding of how responses relate to each other:

## Similarity Metrics

**Cosine Similarity** measures the angular similarity between vector representations of text. The system:

- Generates embeddings for each response using configured embedding models (default: mxbai-embed-large)
- Calculates the dot product of normalized vectors, yielding values from -1 (opposite) to 1 (identical)
- Provides a semantic understanding of how conceptually similar responses are, even when using different words

**Levenshtein Distance** quantifies the textual edit distance between responses:

- Counts the minimum number of single-character operations needed to transform one text into another
- Precisely captures surface-level textual differences
- Higher numbers indicate greater differences between responses

**Jaccard Similarity** compares word-level overlap between responses:

- Preprocesses text by extracting all words and converting to lowercase
- Calculates the size of the intersection divided by the size of the union of word sets
- Produces values from 0 (completely different) to 1 (identical sets of words)

## Advanced Features

The system also supports **Thinking Block Analysis**, which:

- Detects and separates reasoning sections in model responses
- Creates parallel comparisons with and without thinking blocks (+think suffix)
- Allows you to evaluate differences in reasoning processes separately from final answers

## Process Flow

1. Models are validated and thinking blocks are optionally extracted
2. Embeddings are generated for all responses using configured providers
3. Distance matrices are initialized for all metrics
4. Pairwise comparisons are calculated between every model combination
5. Results are assembled into comprehensive evaluation data structures
6. The complete analysis is returned with all metrics for visualization

This multi-metric approach gives you a holistic view of model response similarity, combining lexical, semantic, and structural comparisons into one unified evaluation framework.
