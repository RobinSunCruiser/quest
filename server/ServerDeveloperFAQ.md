# QUEST Server - Developer FAQ

## Table of Contents

- General Setup
- Architecture
- Configuration System
- Adapters
- Authentication
- Socket Communication
- Request Handling
- Evaluation System
- Logging
- Deployment
- Advanced Customization

## General Setup

### How do I set up the development environment?

Clone the repository, run `cd quest/server`, create a `.env` file from `.env.example`, install dependencies with `npm install`, and start the server with `npm run dev`.

### What are the minimum Node.js requirements?

Node.js version 18.0 or higher and npm version 8.0 or higher.

### How do I build the server for production?

Run `npm run build` to create the production bundle using webpack, then use `npm run start` to run the compiled version.

## Architecture

### What is the overall architecture of the server?

The server follows a modular design with adapters for different LLM providers, socket handlers for client communication, and a configuration system. Everything is organized around the main server class that initializes components and manages their lifecycle.

### How are the key components connected?

- **Server**: Main entry point that initializes Express and Socket.IO
- **LLMAdapterManager**: Creates and manages adapter instances
- **SocketAPIHandler**: Routes socket events to appropriate handlers
- **Authentication**: Validates user JWT tokens and manages sessions

### Where is the main entry point?

The application starts at `src/server.ts`, which loads the configuration, sets up the Express server, initializes Socket.IO, and registers the API handlers.

## Configuration System

### Where is the configuration stored?

The primary configuration file is config.json, with some settings optionally passed via environment variables.

### How do I change the server port?

For development:

- Set the `PORT` environment variable in your `.env` file.
- Make sure to also update the client configuration to match the server port in `client/.env`.

For production:

- In the config.json file, modify the `Server.Port` value:

```json
   "Server": {
     "Port": 3000
   }
```

### How do I change the log level?

In the config.json file, modify the `Log.Level` value:

```json
"Log": {
  "Level": "info"
}
```

Valid levels are: trace, debug, info, warn, error.

## Adapters

### How do I add a new LLM adapter?

1. Create a new class in `src/adapters/` that extends `LLMAdapter`
2. Implement required methods (forwardRequest, listModels, isAvailable)
3. Register the adapter in `LLMAdapterManager.ts`
4. Add configuration in config.json under `LLMAdapters`

### How do I modify an existing adapter?

Locate the adapter file in `src/adapters/` (e.g., `OllamaAdapter.ts`, `OpenAIAdapter.ts`) and modify the implementation. Be sure to maintain the interface contract from `LLMAdapter`.

### How do I filter which models are available from an adapter?

In the config.json file, add regex patterns to the `modelFilter` array for the adapter:

```json
"openai": {
  "modelFilter": ["^gpt-3\\.5.*", "^gpt-4.*"]
}
```

## Authentication

### How do I add a new user?

1. Generate a password hash using `node hash.js mySecurePassword`
2. Add the user to config.json under the `Authentication` section:

```json
"Authentication": {
  "newuser": {
    "role": "user",
    "secret": "$2b$10$GENERATED_HASH_HERE"
  }
}
```

3. Restart the server

### How does the JWT authentication work?

1. Client sends login credentials to the server
2. Server validates against stored hash in config.json
3. If valid, a JWT token is generated and sent back
4. Client includes the JWT in each subsequent request
5. Server verifies the JWT on each authenticated route

### How do I modify the JWT settings?

JWT settings are hardcoded in the authentication handler. To modify them, edit `src/socket/handlers/authHandler.ts` where the JWT is generated.

## Socket Communication

### How do socket events work?

The server uses Socket.IO for real-time communication. Events are defined in `src/socket/apiObjects.ts` and handled by functions in `src/socket/handlers/`.

### How do I add a new socket event?

1. Add a new event name to the `EVENTS` enum in `apiObjects.ts`
2. Create a handler function in an appropriate file in `src/socket/handlers/`
3. Register the event in the `SocketAPIHandler` constructor in `apiHandler.ts`

### How do I modify a socket handler?

Each handler is a function that takes a connection and a message. Find the handler in `src/socket/handlers/` and modify its implementation.

## Request Handling

### How does the request queue work?

Each adapter has a request queue that manages concurrent requests. The queue is based on the `ConcurrencyManager` class and controls how many requests can be processed simultaneously based on the `maxConcurrentRequests` setting.

### How are requests aborted/cancelled?

The server uses AbortController to cancel pending requests. When a client sends an abort event, the associated AbortSignal is triggered, which propagates to the adapter.

### How do I modify request timeouts?

Timeouts are set in the adapter implementation. Look for timeout values in adapter files like `OllamaAdapter.ts` or `OpenAIAdapter.ts` and adjust the values as needed.

## Evaluation System

### How does the evaluation system work?

The evaluation system analyzes model responses based on various metrics. The implementation is in `src/socket/handlers/evaluationHandler.ts`.

### How do I add a new evaluation metric?

1. Add the metric calculation in `evaluationHandler.ts`
2. Update the `IEvaluationResult` interface in `src/interfaces/index.ts`
3. Make sure the client is updated to display the new metric

### Where are the evaluation algorithms defined?

The algorithms are in `src/socket/handlers/evaluationHandler.ts` and use libraries like `fastest-levenshtein` and `mathjs` for calculations.

## Logging

### How does the logging system work?

The server uses loglevel for logging with a custom formatter. The log level is set in the configuration file.

### Where should I add logs?

Add logs in strategic places to help with debugging:

- Info logs for application flow
- Debug logs for detailed information
- Error logs for failure conditions

### How do I customize the log format?

The log format is defined in `src/logger.ts`. Modify the formatter function to change the output format.

## Deployment

### How do I deploy the server?

1. Run `npm run build` to create the production bundle
2. Copy the `dist` directory and package.json to your server
3. Run `npm install --production` to install dependencies
4. Start the server with `node dist/server.bundle.js`

### How do I use Docker for deployment?

Use the provided Dockerfile and docker-compose.yml files. Build the image with `docker build -t quest-server .` and run it with `docker-compose up`.

### How do I set up environment-specific configurations?

Use different `.env` files for different environments or use environment variables directly in your deployment platform.

## Advanced Customization

### How do I implement streaming responses?

Modify the adapter's `forwardRequest` method to use streaming mode and emit partial results through the socket connection as they arrive.

### How do I add custom middleware to the Express server?

Edit `src/server.ts` to add custom middleware before the route definitions.

### How do I add a custom API endpoint?

Add a new route in `src/server.ts` using the Express router syntax:

```typescript
app.get("/api/custom", (req, res) => {
  res.json({ message: "Custom endpoint" });
});
```

### How can I extend the request queue functionality?

The request queue is implemented in `src/adapters/LLMAdapter.ts`. You can modify the `ConcurrencyManager` class to add features like priority queuing or request batching.
