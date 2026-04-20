/**
 * @module Utils
 *
 * This barrel file provides a centralized export point for all utility functions used throughout the application.
 * It simplifies imports by allowing consumers to import multiple utility functions from a single path
 * rather than having to import each function from its individual file.
 *
 * Utilities exported:
 * - Notification functions: For displaying user notifications and alerts
 * - File utilities: Functions for file download and handling
 * - Styling utilities: Helper functions for consistent UI rendering and rem/px conversions
 * - Math utilities: Functions for mathematical operations and calculations
 */

export * from './notifications';
export * from './files';
export * from './styling';
export * from './math';
export * from './evaluationExport';
export * from './consensus';
