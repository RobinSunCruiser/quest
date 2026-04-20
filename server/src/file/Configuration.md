# QUEST Configuration Guide

The QUEST configuration system uses a JSON structure to manage all aspects of the application's behavior. This document explains each configuration section, available options, and how to modify them for your needs.

## Configuration Overview

The configuration file is located at config.json and contains the following main sections:

```json
{
  "Log": {},
  "Server": {},
  "LLMAdapters": {},
  "Authentication": {},
  "Embeddings": {}
}
```

## Log Configuration

Controls the verbosity of application logs.

```json
"Log": {
    "Level": "trace"
}
```

Available log levels (from most to least verbose):

- `trace` - Extremely detailed information for debugging
- `debug` - Detailed information useful during development
- `info` - General application flow information
- `warn` - Potential issues that don't prevent operation
- `error` - Serious issues that affect functionality

To reduce log output in production environments:

```json
"Log": {
    "Level": "info"
}
```

## Server Configuration

Defines network-related settings and security configuration for the application.

```json
"Server": {
    "Port": 3000,
    "JWTSecret": ""
}
```

Options:

- `Port` - The TCP port the server listens on
- `JWTSecret` - Secret key for signing JWT authentication tokens (optional, can use environment variable)

> **Important:** This configuration value is only used in production environments.
> During development, the port is determined by the `PORT` environment variable in your `.env` file.
> If no environment variable is set, it will fall back to using this configured value.

### Port Configuration

To change the port to avoid conflicts:

```json
"Server": {
    "Port": 8080
}
```

### JWT Secret Configuration

The JWT secret is used to sign and verify authentication tokens. It is resolved using a 3-tier priority system:

1. **Environment variable** - `JWT_SECRET` in `.env` file (highest priority, recommended for production)
2. **Configuration file** - `Server.JWTSecret` in config.json (medium priority)
3. **Auto-generated** - Temporary secret generated on startup (lowest priority, development only)

**Recommended setup for production:**

```bash
# .env file
JWT_SECRET=your-long-random-secret-minimum-64-characters-recommended
```

**Alternative setup using config.json:**

```json
"Server": {
    "Port": 3000,
    "JWTSecret": "your-long-random-secret-minimum-64-characters-recommended"
}
```

> **Security Warning:** If no JWT secret is configured, the server will generate a temporary random secret on startup. This means all user authentication tokens will become invalid whenever the server restarts. For production deployments, always set a persistent JWT secret using either the environment variable or config file method.

**Generating a secure JWT secret:**

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Using OpenSSL
openssl rand -hex 64
```

**Token Expiration:**

JWT tokens are configured to expire after 7 days. Users will need to re-authenticate after this period.

## LLM Adapters Configuration

Configures connections to language model providers. Multiple adapters can be defined with different configurations.

```json
"LLMAdapters": {
    "your_adapter1": {
        "baseUrl": "https://api.openai.com/v1",
        "provider": "openai",
        "modelFilter": ["^gpt-3\\.5.*"],
        "apiKey": "",
        "maxConcurrentRequests": 3
    },
    "local": {
        "baseUrl": "http://0.0.0.0:11434",
        "provider": "ollama",
        "modelFilter": [],
        "apiKey": "",
        "maxConcurrentRequests": 1
    }
}
```

Each adapter has the following properties:

### Adapter Properties

The adapter name is defined by the key you choose in the `LLMAdapters` object. This key will be used to reference the adapter in other parts of the configuration.

For example, in `"your_adapter1": { ... }`, the name "your_adapter1" becomes the identifier for that adapter configuration.

Each adapter requires:

- `baseUrl` - Endpoint URL for the provider's API
- `provider` - Type of provider (`openai` or `ollama`)
- `modelFilter` - Array of regex patterns to filter which models are shown
- `apiKey` - Authentication token for the provider (if required)
- `maxConcurrentRequests` - Limit on simultaneous requests to prevent overloading

Example to add a new adapter for Azure OpenAI:

```json
"LLMAdapters": {
    "azure": {
        "baseUrl": "https://your-resource.openai.azure.com/openai/deployments/your-deployment",
        "provider": "openai",
        "modelFilter": ["^gpt-4.*"],
        "apiKey": "your-azure-api-key",
        "maxConcurrentRequests": 5
    }
}
```

To filter for specific models only, use regex patterns in the `modelFilter` array:

```json
"modelFilter": [
    "^llama3",  // Only show models starting with "llama3"
    "mistral"   // Include any models containing "mistral"
]
```

## Authentication Configuration

Manages user access credentials and permissions.

```json
"Authentication": {
    "user": {
        "role": "user",
        "secret": "REPLACE_WITH_BCRYPT_HASH_GENERATED_BY_hash.js"
    }
}
```

Options:

- `role` - User's permission level (`user` or `admin`)
- `secret` - Bcrypt-hashed password for the user

> **Note:** The role-based access control system is currently not implemented in the application. While roles (`user`, `admin`) are defined in the configuration, they do not affect permissions or access control. This feature is planned for future implementation.

### Adding a New User

To add a new user, you'll need to:

1. Generate a hashed password using the included hash.js script:

```bash
# Navigate to the server directory
cd server

# Run the hash script with your desired password
node hash.js mySecurePassword

# The output will be a bcrypt hash like:
# $2b$10$K4OWsYDhJZVmoB7H7nWQ8eOBBt.pzL7tSuGGP.U52M1xvbeTpyJSe
```

2. Add the user to the config.json file:

```json
"Authentication": {
    "user": {
        "role": "user",
        "secret": "REPLACE_WITH_BCRYPT_HASH_GENERATED_BY_hash.js"
    },
    "newuser": {
        "role": "admin",
        "secret": "$2b$10$K4OWsYDhJZVmoB7H7nWQ8eOBBt.pzL7tSuGGP.U52M1xvbeTpyJSe"
    }
}
```

3. Save the config.json file and restart the application for the changes to take effect.

## Embeddings Configuration

Defines services used for generating text embeddings for comparison and similarity analysis.

```json
"Embeddings": {
    "ollama1": {
        "adapter": "local",
        "model": "mxbai-embed-large:latest"
    }
}
```

Each embedding service has:

Each embedding service has a configuration key that serves as its unique identifier within the system. For example, in `"ollama1": { ... }`, "ollama1" is the custom identifier for that embedding service configuration.

Each service requires:

- `adapter` - Reference to a defined LLM adapter to use
- `model` - Specific model to use for generating embeddings

To add an additional embedding service with OpenAI:

```json
"Embeddings": {
    "ollama1": {
        "adapter": "local",
        "model": "mxbai-embed-large:latest"
    },
    "openai-embed": {
        "adapter": "openai",
        "model": "text-embedding-ada-002"
    }
}
```

## Applying Configuration Changes

After modifying the configuration:

1. Save the config.json file
2. The changes will apply automatically for most options
3. For adapter changes, use the adapter reinitialization endpoint or restart the application

For API keys and sensitive information, consider using environment variables or a secure secrets management system in production environments.
