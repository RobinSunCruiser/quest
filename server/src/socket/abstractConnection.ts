/**
 * @module Socket.AbstractConnection
 *
 * This module provides the abstract base class for all socket connections in the application.
 * It implements a consistent interface for bidirectional communication, authentication,
 * event handling, and message processing.
 *
 * Concrete implementations should extend this class to provide specific connection behavior
 * for different transport protocols (WebSocket, Socket.io, etc.).
 */

// External dependencies
import { EventEmitter } from "events";

// Internal dependencies
import log from "../logger";
import { CONNECTION_TYPES, EVENTS, SocketMessage } from "./apiObjects";

/**
 * Abstract base class for client and server connections.
 *
 * This class provides:
 * - Event-based message handling
 * - Authentication state management
 * - Standard logging for communication events
 * - Consistent interface for message processing
 *
 * To implement a concrete connection:
 * 1. Extend this class
 * 2. Implement abstract methods (connect, authenticate, process, send)
 * 3. Update connection and authentication flags as appropriate
 * 4. Attach received() method to transport's message event
 */
export abstract class Connection {
  /** Human-readable name for this connection */
  private _name: string | null = null;

  /** Connection address (IP, hostname, etc.) */
  private _address: string | null = null;

  /** Connection type/classification */
  private _type: CONNECTION_TYPES;

  /** Whether this connection has been authenticated */
  private _authenticated = false;

  /** Events that should not produce log output to reduce noise */
  protected silentEvents: string[] = [];

  /** Map of event names to handler functions */
  private readonly handler: {
    [event: string]: (connection: Connection, message: SocketMessage) => void;
  } = {};

  /** EventEmitter for connection events */
  public readonly eventEmitter: EventEmitter = new EventEmitter();

  /**
   * Creates a new connection with the specified type.
   *
   * @param type - Classification of this connection
   */
  protected constructor(type: CONNECTION_TYPES) {
    this._type = type;
  }

  /**
   * Sets a human-readable name for this connection.
   */
  protected set name(name: string | null) {
    this._name = name;
  }

  /**
   * Gets the human-readable name for this connection.
   */
  public get name() {
    return this._name;
  }

  /**
   * Sets the address for this connection.
   */
  protected set address(address: string | null) {
    this._address = address;
  }

  /**
   * Gets the address for this connection.
   */
  public get address() {
    return this._address;
  }

  /**
   * Sets the connection type.
   *
   * @throws Error if type is invalid
   */
  protected set type(type: CONNECTION_TYPES) {
    if (!Object.values(CONNECTION_TYPES).includes(type)) {
      throw `Invalid client Type ${type}`;
    }
    this._type = type;
  }

  /**
   * Gets the connection type.
   */
  public get type() {
    return this._type;
  }

  /**
   * Sets the connection status.
   * Must be implemented by concrete classes.
   */
  protected abstract set connected(status: boolean);

  /**
   * Gets the connection status.
   * Must be implemented by concrete classes.
   */
  public abstract get connected();

  /**
   * Sets the authentication status.
   */
  protected set authenticated(status: boolean) {
    this._authenticated = status;
  }

  /**
   * Gets the authentication status.
   */
  protected get authenticated() {
    return this._authenticated;
  }

  /**
   * Gets a human-readable identifier for logs and user interfaces.
   */
  public get readableID(): string {
    return this.name || this.type || "Unidentified Connection";
  }

  /**
   * Registers a handler function for a specific event.
   *
   * @param eventName - Name of the event to handle
   * @param callback - Function to call when event is received
   */
  public on<T extends SocketMessage>(
    eventName: string,
    callback: (connection: Connection, message: T) => void
  ): void {
    this.handler[eventName] = callback as (
      connection: Connection,
      message: SocketMessage
    ) => void;
  }

  /**
   * Processes an incoming socket message.
   *
   * @param message - The message received from the client
   */
  public received(message: SocketMessage): void {
    if (!message || !message.event) {
      log.warn(
        `Received invalid message: ${JSON.stringify(message)}`,
        this.readableID
      );
      return;
    }
    try {
      if (!this.authenticated) {

        // Special handling for AUTH events - directly call authenticate
        if (message.event === EVENTS.AUTH) {
          this.authenticate(message);
          return;
        }

        // For non-AUTH events when not authenticated
        log.warn(`Unauthenticated request: ${message.event}`, this.readableID);
        // Intentionally not authenticating here to prevent auth bypass
        return;
      }

      if (message.event === EVENTS.AUTH) {
        this.authenticate(message);
        return;
      }

      this.process(message);

    } catch (error) {
      if (error instanceof Error) {
        log.error(
          `Error processing message: ${error.message}`,
          this.readableID
        );
      } else {
        log.error("An unknown error occurred", this.readableID);
      }
    }

    // Check if authenticated or if this is an AUTH request
  }

  /**
   * Handles authentication for incoming messages.
   * Implement to process authentication requests and update this.authenticated status.
   *
   * @param message - Message to authenticate
   */
  protected abstract authenticate(message: SocketMessage): void;

  /**
   * Processes messages after authentication is successful.
   * Implement to parse messages and call this.handle() for registered events.
   *
   * @param message - Message to process
   */
  protected abstract process(message: SocketMessage): void;

  /**
   * Routes a message to the appropriate registered handler.
   *
   * @param message - Message to route
   */
  protected async handle(message: SocketMessage) {
    const silent = message.event && this.silentEvents.includes(message.event);

    try {
      if (!silent) {
        log.debug(
          `Received '${message.event}' from [${this.readableID}]`,
          "Connection"
        );
      }

      if ("string" === typeof message) {
        throw `Invalid message format! Message is typeof string`;
      }

      if (!message.event) {
        throw `Invalid message format! EventName is undefined`;
      }

      if (!this.authenticated) {
        throw `Error handling ${message.event}! Connection not authenticated!`;
      }

      if (message.error) {
        throw `Error ${message.error} received in ${message.event}.`;
      }

      if (!this.handler[message.event]) {
        throw `Connection has no 'on' EventHandler for ${message.event}!`;
      }

      this.handler[message.event](this, message);
    } catch (e: any) {
      log.error(
        `Could not handle ${
          message.event ? message.event : "event"
        }. ${e.toString()}`,
        "Connection"
      );
    }
  }

  /**
   * Sends a message through this connection.
   * Validates message format and delegates to send implementation.
   *
   * @param message - Message to send
   */
  public async emit(message: SocketMessage) {
    try {
      if (message.error) {
        log.error(
          `Sending error ${message.event} to [${this.readableID}]`,
          "Connection"
        );
      } else if (!this.silentEvents.includes(message.event)) {
        log.debug(
          `Sending '${message.event}' to [${this.readableID}]`,
          "Connection"
        );
      }

      this.send(message);
    } catch (e: any) {
      log.error(
        `Could not emit ${
          message ? "'" + message.event + "'" : "message"
        } to [${this.readableID}]. ` + e.toString(),
        "Connection"
      );
    }
  }

  /**
   * Sends a message using the transport-specific mechanism.
   * Must be implemented by concrete classes.
   *
   * @param message - Message to send
   */
  protected abstract send(message: SocketMessage): void;

  /**
   * Disposes this connection, releasing resources.
   * Must be implemented by concrete classes.
   */
  public abstract dispose(): void;
}
