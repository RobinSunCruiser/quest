/**
 * Creates a custom fetch function that incorporates abort signal support.
 * This allows requests to be cancelled when needed.
 *
 * @private
 * @param signal - Optional abort signal to cancel requests
 * @returns A fetch function with the specified signal attached
 */
export const createCustomFetch = (
  signal?: AbortSignal,
  apiKey?: string
): ((input: URL | RequestInfo, init?: RequestInit) => Promise<Response>) => {
  return async (input, init = {}) => {
    let initHeaders: HeadersInit = {};

    // Check if headers already exist and convert to a plain object if needed
    if (init.headers) {
      if (init.headers instanceof Headers) {
        // Convert Headers instance to plain object
        initHeaders = Object.fromEntries(Array.from(init.headers.entries()));
      } else if (Array.isArray(init.headers)) {
        // Convert header entries array to plain object
        initHeaders = Object.fromEntries(init.headers);
      } else {
        // Use headers object directly
        initHeaders = init.headers as Record<string, string>;
      }
    }
    // Prepare headers with content-type
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...initHeaders,
    };

    // Add Authorization header if API key is provided
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    // Merge custom options with provided ones, prioritizing the abort signal
    const response = await fetch(input, {
      ...init,
      signal,
      headers,
    });

    // Throw meaningful errors for non-200 responses
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorText}`
      );
    }

    return response;
  };
};
