/**
 * @module Adapters.RequestQueue
 *
 * This module provides a queue implementation for managing asynchronous requests
 * with concurrency control. It allows limiting the number of concurrent operations
 * and provides abort functionality for cancelling pending requests.
 *
 * The RequestQueue is used by LLM adapters to control the flow of requests to
 * external APIs, preventing overloading while maintaining responsiveness.
 */

/**
 * Queue system for managing concurrent asynchronous requests.
 *
 * Provides mechanisms to:
 * - Limit the number of concurrent operations
 * - Queue requests that exceed the concurrency limit
 * - Abort specific requests by ID
 * - Wait for completion of all queued tasks
 */
export class RequestQueue {
  /** Number of requests currently being processed */
  private concurrentRequests = 0;

  /** Maximum number of requests that can run concurrently (0 means unlimited) */
  private maxConcurrent = 0;

  /** Internal queue of pending requests */
  private queue: Array<{
    task: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    aborted?: boolean;
    id: string;
  }> = [];

  /**
   * Creates a new RequestQueue with specified concurrency limit.
   *
   * @param maxConcurrent - Maximum number of requests to process simultaneously (0 = unlimited)
   */
  constructor(maxConcurrent: number = 0) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Adds a new task to the queue and executes it when capacity is available.
   *
   * @param task - Async function to execute
   * @param requestId - Unique identifier for the request (used for aborting)
   * @returns Promise that resolves with the task's result or rejects if aborted
   */
  async add<T>(task: () => Promise<T>, requestId: string): Promise<T> {
    // Execute immediately if under concurrency limit or if no limit is set
    if (
      this.maxConcurrent === 0 ||
      this.concurrentRequests < this.maxConcurrent
    ) {
      return this.executeTask({
        task,
        resolve: () => {},
        reject: () => {},
        id: requestId,
      });
    }

    // Otherwise queue the task
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject, id: requestId });
    });
  }

  /**
   * Aborts a pending request by its ID.
   * If the request is in the queue, it's removed and rejected.
   * If already executing, it can't be aborted from here.
   *
   * @param requestId - Unique identifier of the request to abort
   */
  abort(requestId: string) {
    // Find the request in the queue
    const index = this.queue.findIndex((item) => item.id === requestId);
    if (index >= 0) {
      // Mark as aborted, reject the promise, and remove from queue
      const task = this.queue[index];
      task.aborted = true;
      task.reject(new Error("Request aborted"));
      this.queue.splice(index, 1);
    }
  }

  /**
   * Executes a queued task and manages concurrency counting.
   *
   * @private
   * @param queueItem - Object containing the task and associated callbacks
   * @returns Promise resolving with the task result
   */
  private async executeTask<T>(queueItem: {
    task: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (error: any) => void;
    id: string;
    aborted?: boolean;
  }): Promise<T> {
    // Increase the count of concurrent requests
    this.concurrentRequests++;

    try {
      // Check if the task was aborted before execution
      if (queueItem.aborted) {
        throw new Error("Request aborted");
      }

      // Execute the task and return its result
      const result = await queueItem.task();
      return result;
    } finally {
      // Always decrease the counter and check for next tasks
      this.concurrentRequests--;
      this.processNextTask();
    }
  }

  /**
   * Processes the next task in the queue if capacity is available.
   *
   * @private
   */
  private async processNextTask() {
    // Check if there are queued tasks and capacity is available
    if (
      this.queue.length > 0 &&
      (this.maxConcurrent === 0 || this.concurrentRequests < this.maxConcurrent)
    ) {
      // Get the next task from the queue
      const next = this.queue.shift();

      // Execute if not already aborted
      if (next && !next.aborted) {
        try {
          const result = await this.executeTask(next);
          next.resolve(result);
        } catch (error) {
          next.reject(error);
        }
      }
    }
  }

  /**
   * Waits for all queued requests to complete.
   *
   * @returns Promise that resolves when all requests are processed
   * @throws Error if any queued request fails
   */
  async waitForCompletion(): Promise<void> {
    if (this.queue.length > 0) {
      try {
        // Wait for all queued items to complete
        await Promise.all(Array.from(this.queue.values()));
      } catch (error) {
        throw new Error(`Failed to wait for request completion: ${error}`);
      }
    }
  }
}
