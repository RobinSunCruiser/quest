/**
 * @module Utils/Files
 *
 * Provides utility functions for file operations in the browser environment.
 * This module includes functions for generating downloadable files from string content,
 * which is useful for exporting data from the application to the user's device.
 */

/**
 * Downloads a file with the specified content, filename, and MIME type.
 * This function creates a temporary Blob and URL, attaches it to a dynamically created
 * anchor element, triggers a download, and cleans up the resources afterward.
 *
 * @param content - The string content to be included in the downloaded file.
 * @param filename - The name of the file to be downloaded, including the extension.
 * @param type - The MIME type of the file which determines how browsers handle the content.
 *
 * @returns {void} This function doesn't return a value but triggers a file download in the browser.
 *
 * @example
 * // Download a plain text file
 * downloadFile('Hello, world!', 'welcome.txt', 'text/plain');
 *
 * @example
 * // Download a JSON file
 * const jsonData = {
 *   name: 'John Doe',
 *   age: 30,
 *   email: 'john@example.com'
 * };
 * downloadFile(JSON.stringify(jsonData, null, 2), 'user-data.json', 'application/json');
 *
 * @example
 * // Download a CSV file
 * const csvContent = 'Name,Age,Email\nJohn Doe,30,john@example.com';
 * downloadFile(csvContent, 'users.csv', 'text/csv');
 *
 * @example
 * // Download HTML content
 * const htmlContent = '<html><body><h1>Hello World</h1></body></html>';
 * downloadFile(htmlContent, 'page.html', 'text/html');
 */
export const downloadFile = (content: string, filename: string, type: string) => {
    // Create a Blob with the content and specified MIME type
    const blob = new Blob([content], { type });

    // Create a temporary URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create an anchor element to trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    // Add to the DOM and trigger download
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Joins multiple path segments into a single path string.
 * This function ensures that there are no leading or trailing slashes
 * in the final path and that the segments are properly concatenated.
 *
 * @param {...string} parts - The path segments to join.
 * @returns {string} The joined path string.
 *
 * @example
 * // Join multiple path segments
 * const fullPath = joinPaths('folder', 'subfolder', 'file.txt');
 * console.log(fullPath); // Output: "folder/subfolder/file.txt"
 */
export const joinPaths = (...parts: string[]): string => {
    return parts
        .map((part) => part.replace(/^\/+|\/+$/g, '')) // trim slashes
        .filter(Boolean)
        .join('/');
};
