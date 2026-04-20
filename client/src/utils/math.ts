/**
 * @module Utils/Math
 *
 * This module provides mathematical utility functions used throughout the QUEST platform.
 * It includes methods for number formatting, rounding, and other mathematical operations
 * that help with consistent numerical representations in the UI.
 */

/**
 * Rounds a number to a specified number of decimal places.
 *
 * @param value - The number to round
 * @param decimalPlaces - The number of decimal places to round to
 * @returns The rounded number
 *
 * @example
 * ```typescript
 * // Returns 3.14
 * roundToDecimal(3.14159, 2);
 *
 * // Returns 3
 * roundToDecimal(3.14159, 0);
 * ```
 */
export const roundToDecimal = (value: number, decimalPlaces: number) => {
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(value * factor) / factor;
};
