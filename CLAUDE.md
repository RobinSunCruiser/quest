# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QUEST (Qualitative Untersuchung und Evaluation von Sprachmodellen Tool) is a full-stack application for testing, comparing, and evaluating language models. It features a React client and Node.js server with Socket.IO for real-time communication.

## Architecture

### Client-Server Communication
- **Frontend**: React TypeScript application using Socket.IO client for real-time communication
- **Backend**: Node.js Express server with Socket.IO for WebSocket handling
- **Authentication**: JWT-based with bcrypt password hashing
- **Real-time**: All LLM interactions stream through WebSocket connections

### LLM Adapter System
The core architecture centers around a pluggable adapter system (`server/src/adapters/`):

- **LLMAdapterManager**: Singleton that manages all adapter instances, handles request tracking/abortion, and provides hot-reloading
- **AbstractLLMAdapter**: Base class defining the contract for all LLM providers
- **Concrete Adapters**: OpenAIAdapter, OllamaAdapter, PerplexityAIAdapter - each implementing provider-specific API calls
- **RequestQueue**: Manages concurrent request limits per adapter to prevent overloading

### State Management
- **Server**: Stateless design with connection tracking via `activeConnections` Map
- **Client**: 
  - Global state via React Context (`globalStateContext.tsx`)
  - Custom hooks for specific operations (`hooks/`)
  - Persisted state for UI preferences (`usePersistedState`)

### Socket Communication Pattern
All client-server communication follows a structured message format defined in `apiObjects.ts`:
- **Connection Flow**: Client connects → Authenticates with JWT → Receives available models → Can send chat requests
- **Message Types**: Strongly typed using interfaces (IModelInfo, IChatRoleMessage, etc.)
- **Error Handling**: Centralized error formatting and propagation

## Development Commands

### Client Development
```bash
cd client
npm install
npm run dev          # Start development server with hot reload
npm run build        # Production build
npm run lint         # ESLint check
npm run test         # Run Vitest tests
```

### Server Development  
```bash
cd server
npm install
npm run dev          # Start with nodemon auto-restart
npm run build        # Webpack production build (bundles + copies client dist)
npm run start        # Run production bundle
npm run lint         # ESLint check
```

### Full Stack Development
1. Start server: `cd server && npm run dev`
2. Start client: `cd client && npm run dev` 
3. Client proxies API calls to server (configured in vite.config.ts)

## Configuration

### Server Configuration
- **Primary**: `server/src/file/config.json` - Contains LLM adapter configurations and server settings
- **Environment**: `.env` files for API keys, JWT secret, and runtime settings
- **Hot Reload**: Use "Reload Backend" button in client UI to reinitialize adapters after config changes

### JWT Secret Configuration
The JWT secret is used for signing and verifying authentication tokens. It uses a 3-tier priority system:

1. **Environment variable** - `JWT_SECRET` in `.env` file (highest priority, **recommended for production**)
2. **Configuration file** - `Server.JWTSecret` in config.json (medium priority)
3. **Auto-generated** - Temporary secret on startup (lowest priority, **development only**)

**Important:** Without a persistent JWT secret, all user tokens become invalid on server restart. Always set `JWT_SECRET` in production.

**Generating a secure JWT secret:**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Using OpenSSL
openssl rand -hex 64
```

**Token Features:**
- Tokens expire after 7 days
- Stored in client localStorage
- Stateless JWT verification (no server-side session storage)

### LLM Adapter Configuration
Each adapter in config.json requires:
```json
{
  "LLMAdapters": {
    "adapter_name": {
      "baseUrl": "https://api.provider.com/v1",
      "provider": "openai|ollama|perplexityai|anthropic", 
      "modelFilter": ["regex_pattern"],
      "apiKey": "optional_key",
      "maxConcurrentRequests": 3
    }
  }
}
```

### API Key Configuration
API keys are resolved using a 3-tier priority system:
1. **Constructor parameter** - Direct parameter passed to adapter constructor (highest priority)
2. **Direct configuration** - `apiKey` field in config.json (medium priority)
3. **Environment variables** - Provider-specific environment variables (lowest priority)

#### Environment Variable Names:
- **OpenAI**: `OPENAI_API_KEY`
- **Anthropic**: `ANTHROPIC_API_KEY` 
- **PerplexityAI**: `PERPLEXITYAI_API_KEY`
- **Ollama**: `{ADAPTER_ID}_API_KEY` (adapter-specific)
  - For adapter "local" → `LOCAL_API_KEY`
  - For any additional adapter ID `foo` → `FOO_API_KEY`

#### Multiple Ollama Instances
Since Ollama adapters can have multiple instances with different configurations, each adapter uses its own environment variable based on the adapter ID:

```bash
# .env file example
JWT_SECRET=your-long-random-secret-minimum-64-characters
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
LOCAL_API_KEY=optional-for-local-ollama

## Key Code Patterns

### Adding New LLM Adapters
1. Extend `AbstractLLMAdapter` in `server/src/adapters/`
2. Implement required methods: `forwardRequest`, `forwardStreamingRequest`, `listModels`, `isAvailable`, `getEmbeddings`
3. Add provider case to `LLMAdapterManager.initAdapters()`
4. Update configuration schema if needed

### Socket Message Handling
- All handlers in `server/src/socket/handlers/` follow pattern: `(connection: Connection, message: SocketMessage) => void`
- Register handlers in `SocketAPIHandler` constructor
- Use strongly typed message interfaces from `apiObjects.ts`

### Client Component Structure
- **Main Layout**: App.tsx orchestrates layout with Mantine AppShell
- **Chat Interface**: `main/ChatWindow.tsx` handles message display and input
- **Settings**: `aside/` components for model selection and configuration
- **Hooks**: Custom hooks encapsulate complex state logic (chat operations, model selection, etc.)

## Build Process

### Production Build
The server build process automatically:
1. Compiles TypeScript server code with Webpack
2. Copies client dist files to server dist/client
3. Copies config.json to dist root
4. Creates single deployable bundle at `server/dist/server.bundle.js`

### Development vs Production
- **Development**: Client and server run separately with proxy
- **Production**: Server serves bundled client files from `/dist/client`

## Testing

### Client Tests
- **Framework**: Vitest with jsdom environment
- **Location**: Tests alongside source files
- **Command**: `npm run test` from client directory

### Integration
- Socket.IO connections tested via manual testing interface
- LLM adapters tested against live provider endpoints
- Authentication flow testable via `/login` and `/verify` endpoints

## Docker Deployment

- **Dockerfile**: Multi-stage build compiling both client and server
- **docker-compose**: Full stack with nginx reverse proxy
- **Configuration**: Volume mount `docker-compose/quest/config.json` for adapter settings

## Common Development Tasks

### Adding New Chat Features
1. Define message interface in `server/src/interfaces/`
2. Add handler in `server/src/socket/handlers/`
3. Register handler in `SocketAPIHandler`
4. Add client-side hook in `client/src/hooks/`
5. Update UI components to use the hook

### Debugging Socket Issues
- Server logs available in `server/src/server.log`
- Client network tab shows Socket.IO messages
- Use `log.debug()` extensively throughout codebase
- Check `activeConnections` Map for connection state

### Performance Tuning
- Adjust `maxConcurrentRequests` per adapter
- Monitor `RequestQueue` behavior for bottlenecks
- Use streaming responses for better UX on slow models
- Implement proper abort handling for cancelled requests

## Code Style Guidelines
- Always prefer async/await over .then() patterns