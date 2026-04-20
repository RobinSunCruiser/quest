/**
 * @module Server
 *
 * This module provides the main server application entry point.
 * It sets up the Express web server, Socket.IO for real-time communication,
 * authentication endpoints, and static file serving.
 *
 * The server initializes all required services including:
 * - HTTP server for REST endpoints
 * - WebSocket server for bidirectional communication
 * - Authentication handlers for user verification
 * - LLM adapter management for model interaction
 */

// External dependencies
import express from "express";
import http from "http";
import { Server } from "socket.io";
import "dotenv/config";
import path from "path";
import crypto from "crypto";

// Internal dependencies
import log from "./logger";
import config from "./file/config_manager";
import { SocketIOConnection } from "./socket/socketIOConnection";
import { SocketAPIHandler } from "./socket/apiHandler";
import { CONNECTION_TYPES } from "./socket/apiObjects";
import llmAdapterManager from "./adapters/LLMAdapterManager";
import { metadataService } from "./utils";

// Type declaration for pkg binary detection
declare const process: NodeJS.Process & { pkg?: any };

//=============================================================================
// CONSTANTS & CONFIGURATION
//=============================================================================

// JWT Secret Resolution (Hybrid Approach)
// Priority: 1. Environment variable, 2. Config file, 3. Generated (with warning)
export const JWT_SECRET =
  process.env.JWT_SECRET ||
  config.get("Server.JWTSecret", "") ||
  (() => {
    log.warn(
      "JWT_SECRET not configured in environment or config file. " +
      "Generating temporary secret - all tokens will be invalid on server restart. " +
      "For production: Set JWT_SECRET environment variable or Server.JWTSecret in config.json",
      "Server"
    );
    return crypto.randomBytes(64).toString("hex");
  })();

// Configure logging
log.setLevel(config.get("Log.Level", "debug"));
log.setLogFile(process.pkg !== undefined
  ? path.join(path.dirname(process.execPath), "server.log")
  : path.join(__dirname, "server.log"));

// Initialize LLM adapters (initialization happens in the import)
llmAdapterManager;

// Initialize MetadataService in the background
metadataService.initialize().catch((error) => {
  log.error(`Failed to initialize MetadataService: ${error}`, "Server");
});

//=============================================================================
// SERVER INITIALIZATION
//=============================================================================

// Create Express application and HTTP server
const app = express();
const server = http.createServer(app);

// Create Socket.IO server instance
const ioServer = new Server(server);

//=============================================================================
// SOCKET.IO CONNECTION HANDLING
//=============================================================================

// Handle new client connections
ioServer.on("connection", (socket) => {
  // Create a connection wrapper for this socket
  const connection = new SocketIOConnection(socket, CONNECTION_TYPES.CHAT);

  // Register API handlers for this connection
  new SocketAPIHandler(connection);

});

//=============================================================================
// EXPRESS ROUTES AND MIDDLEWARE
//=============================================================================

// Serve static frontend files
const staticFilesPath = path.join(__dirname, "client");
app.use(express.static(staticFilesPath));

// Redirect all other routes to the main application
app.get("*", function (_req, res) {
  res.redirect("/");
});

//=============================================================================
// SERVER STARTUP
//=============================================================================

// Check if we're running in production mode
const isProduction = process.env.NODE_ENV === "production";

// Determine port from environment variables or configuration
const PORT = isProduction
  ? config.get("Server.Port", 3000)
  : process.env.PORT || config.get("Server.Port", 3000);

// Start the server
server.listen(PORT, () => {
  log.info(`Running on http://localhost:${PORT}`, "Server");
});

log.debug(`Static Path: ${staticFilesPath}`, "Server");
