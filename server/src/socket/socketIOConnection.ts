/**
 * @module Socket.SocketIOConnection
 *
 * This module provides a Socket.IO implementation of the abstract Connection class.
 * It handles the communication between Socket.IO clients and the server,
 * including authentication, message processing, and connection lifecycle management.
 *
 * The SocketIOConnection wraps a Socket.IO socket and implements the Connection
 * interface to provide a consistent API for the application.
 */

// External dependencies
import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { compareSync } from "bcrypt-ts";

// Internal dependencies
import { Connection } from "./abstractConnection";
import log from "../logger";
import {
  AuthMessage,
  AuthResponseMessage,
  CONNECTION_TYPES,
  EVENTS,
  SocketMessage,
} from "./apiObjects";
import { JWT_SECRET } from "../server";
import { userManager } from "../utils";

/**
 * FormattedError interface for standardized error handling
 */
interface FormattedError {
  /** Error type or classification */
  name: string;
  /** Human-readable error description */
  message: string;
  /** Optional stack trace for debugging */
  stack?: string;
}

/**
 * Formats various error types into a consistent FormattedError structure
 */
function formatError(error: unknown): FormattedError {
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message || "Unknown error occurred",
      stack: error.stack,
    };
  }
  
  if (typeof error === "string") {
    return {
      name: "Error",
      message: error,
    };
  }
  
  return {
    name: "Error", 
    message: String(error),
  };
}

/**
 * Socket.IO implementation of the Connection abstract class.
 *
 * Provides a wrapper around Socket.IO's socket instance, implementing
 * authentication, message handling, and connection management for the
 * WebSocket communication layer.
 */
export class SocketIOConnection extends Connection {
  /** The underlying Socket.IO socket instance */
  private readonly _socket: Socket;

  /**
   * Indicates whether the underlying socket connection is active.
   */
  get connected(): boolean {
    return this._socket && this._socket.connected;
  }

  /**
   * Creates a new Socket.IO connection.
   *
   * Initializes the connection with the client's IP address and sets up
   * event handlers for incoming messages and disconnection events.
   *
   * @param socket - The Socket.IO socket instance to wrap
   * @param type - The type of connection being established
   */
  constructor(socket: Socket, type: CONNECTION_TYPES) {
    super(type);
    this._socket = socket;

    // Configure silent events to reduce debug log noise
    this.silentEvents = [
      EVENTS.LLM_CHAT_STREAM_CHUNK_RESPONSE
    ];

    // Extract client IP address from socket handshake
    let address: string = "";
    if (socket.handshake && socket.handshake.address) {
      const match = socket.handshake.address.match(
        "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b"
      );
      if (match) address = match.toString();
      else address = socket.handshake.address;
    }
    this.address = address;

    // Set up event handlers
    socket.onAny((_eventName: string, message: any) => this.received(message));
    socket.on("disconnect", () => {
      this.dispose();
    });

    log.info(`Connected from ${this.address}`, this.readableID);
  }

  /**
   * Handles authentication requests from clients.
   *
   * Called for incoming messages when the connection is not yet authenticated.
   * Supports both username/password authentication and JWT token verification.
   *
   * @param message - The incoming message to authenticate
   */
  protected authenticate(message: SocketMessage): void {
    
    // Prepare authentication response
    const authResponse: AuthResponseMessage = {
      event: EVENTS.AUTH_RESPONSE,
      version: "0.1.0",
      data: {
        success: false,
      },
    };

    // Verify the message is an authentication request
    if (message.event !== EVENTS.AUTH) {
      this.authenticated = false;
      this.emit(authResponse);
      log.info(`Authentication failed for ${this.address}`, this.readableID);
      return;
    }

    const authData = (message as AuthMessage).data;

    try {
      
      // Check if this is username/password authentication
      if (authData.username && authData.password) {
        
        // Validate username/password credentials
        const user = userManager.getUser(authData.username);
        if (!user || !compareSync(authData.password, user.password)) {
          this.authenticated = false;
          this.emit(authResponse);
          log.info(`Authentication failed for ${this.address}`, this.readableID);
          return;
        }

        // Generate JWT token for successful login with 7-day expiration
        const token = jwt.sign(
          { username: authData.username, role: user.role },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        // Set successful authentication
        this.authenticated = true;
        authResponse.data.success = true;
        authResponse.data.token = token;

        log.info(
          `Authentication was successful for ${this.address}`,
          this.readableID
        );

      } else if (authData.token) {
        
        // Verify JWT token
        jwt.verify(authData.token, JWT_SECRET);
        this.authenticated = true;
        authResponse.data.success = true;

        log.info(
          `Authentication was successful for ${this.address}`,
          this.readableID
        );

      } else {

        // No valid authentication data provided
        this.authenticated = false;
        this.emit(authResponse);
        log.info(`Authentication failed for ${this.address}`, this.readableID);
        return;

      }
    } catch (error) {
      // Handle authentication failure
      this.authenticated = false;
      authResponse.data.success = false;
      log.info(`Authentication failed for ${this.address}: ${error instanceof Error ? error.message : String(error)}`, this.readableID);
      authResponse.error = formatError(error);
      
    } finally {
      // Always send authentication response
      this.emit(authResponse);
    }
  }

  /**
   * Processes authenticated messages.
   *
   * Called for incoming messages when the connection is authenticated.
   * Routes the message to the appropriate handler based on event type.
   *
   * @param message - The incoming authenticated message to process
   */
  async process(message: SocketMessage) {
    await this.handle(message);
  }

  /**
   * Sends a message to the client.
   *
   * Transmits the message through the Socket.IO connection using the
   * event name specified in the message. Automatically formats any
   * Error objects in the error field to FormattedError for client compatibility.
   *
   * @param message - The message to send to the client
   */
  public send(message: SocketMessage) {
    // Auto-format error field if it's an Error object
    if (message.error && typeof message.error === 'object' && 'name' in message.error && 'message' in message.error) {
      // It's an Error object, format it
      if (message.error instanceof Error) {
        message.error = formatError(message.error);
      }
      // If it's already a FormattedError object, leave it as is
    } else if (typeof message.error === 'string') {
      // It's a string, format it
      message.error = formatError(message.error);
    }
    
    this._socket.emit(message.event, message);
  }

  /**
   * Cleans up resources when the connection is terminated.
   *
   * Disconnects the underlying Socket.IO connection and logs the event.
   */
  public dispose() {
    log.info(`Disconnected`, this.readableID);
    try {
      this._socket.disconnect();
    } catch (error) {
      // Silent fail if already disconnected
      log.debug(`Error during disconnect: ${String(error)}`, this.readableID);
    }
  }
}
