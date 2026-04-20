/**
 * @module Utils/Styling
 *
 * This module provides utility functions for CSS styling and unit conversion.
 * It helps maintain consistent styling across the application by providing
 * helper functions for common styling tasks such as unit conversion.
 *
 * These utilities are particularly useful when working with layout calculations,
 * dynamic styling, or when integrating with libraries that require specific units.
 */

/**
 * Converts a REM value to its equivalent in pixels based on the current root font size.
 *
 * REM (Root EM) units are relative to the font size of the root element (typically the <html> element).
 * This function calculates the pixel equivalent by multiplying the REM value by the computed
 * font size of the root element.
 *
 * @param rem - The REM value to convert to pixels
 * @returns A string with the equivalent pixel value, including the 'px' unit suffix
 *
 * @example
 * ```typescript
 * // Convert 1.5rem to pixels
 * const buttonPadding = remToPx(1.5);
 * // If root font size is 16px, returns "24px"
 *
 * // Use in dynamic styling
 * element.style.marginTop = remToPx(2);
 *
 * // Use with icon sizing
 * <FaIcon size={remToPx(1.25)} />
 *
 * // Use in calculations where pixel values are needed
 * const pixelValue = parseInt(remToPx(3), 10); // Gets numeric pixel value without "px"
 * ```
 *
 * @note This function accesses the DOM to get the computed root font size,
 * so it should only be called in browser environments after the document has loaded.
 */
export const remToPx = (rem: number) => {
    const value = rem * parseFloat(getComputedStyle(document.documentElement).fontSize);

    return `${value}px`;
};
