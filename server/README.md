# QUEST Server

## Overview

The QUEST Server provides the backend for the Qualitative Untersuchung und Evaluation von Sprachmodellen Tool (QUEST), handling communication with various language models, user authentication, and evaluation metrics. It serves as the central hub for processing requests from the client application and managing connections to different LLM providers.

## Technologies

Built with modern TypeScript technologies:

- [Express.js](https://expressjs.com/) - Web application framework
- [Socket.IO](https://socket.io/) - Real-time bidirectional communication
- [Node.js](https://nodejs.org/) - JavaScript runtime environment
- [Ollama-js](https://github.com/ollama/ollama-js) - Local LLM integration based on Ollama API
- [OpenAI-node](https://github.com/openai/openai-node) - Cloud LLM integration based on OpenAI API
- [bcrypt-ts](https://www.npmjs.com/package/bcrypt-ts) - Password hashing and verification
- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) - Authentication tokens

## Features

- Multi-adapter support for various LLM providers (OpenAI, Ollama, etc.)
- Real-time chat communication through WebSockets
- Secure authentication system with JWT
- Model discovery and management
- Request queueing and prioritization
- Request timeout handling and cancellation
- Comprehensive logging system
- Model response evaluation metrics

## Prerequisites

- Node.js version `18.0` or higher
- npm version `8.0` or higher
- Git (for cloning the repository)
- Ollama (optional, for local LLM support)

## Installation

1. **Clone the repository**

   ```sh
   git clone https://github.com/robinsuncruiser/quest.git
   cd quest/server
   ```

2. **Configure environment variables**

   ```sh
   cp .env.example .env
   ```

   Edit `.env` to set your configuration:

   ```
   PORT=3000
   OPENAI_API_KEY=your_openai_api_key
   ```

3. **Install dependencies**
   ```sh
   npm install
   ```

## Development

1. **Start the development server**

   ```sh
   npm run dev
   ```

   The server will be available at `http://localhost:3000` (or your configured port)

2. **Available Commands**
   - `npm run dev` - Start the development server with hot reloading
   - `npm run build` - Build the production version
   - `npm run start` - Start the production server
   - `npm run lint` - Run ESLint to check code quality

## Deployment

For full deployment instructions, please refer to the [main project README](../README.md#roduction-build--deployment).

In brief:

1. Build the client (`npm run build` in the client directory)
2. Build the server (`npm run build` in this directory)
3. Client files are automatically copied to the server's dist directory
4. Run the production server (`npm run start`)
5. Alternatively, copy the `dist` directory to your production server

## Configuration

The server uses a JSON configuration system located at `src/file/config.json`.

### Key Configuration Sections

1. **Log Configuration**
   - Controls log verbosity (trace, debug, info, warn, error)
2. **Server Configuration**
   - Define network settings (port)
3. **LLM Adapters**
   - Configure LLM providers (OpenAI, Ollama, etc.)
   - Set API keys, base URLs, and model filters
4. **Authentication**
   - Manage user credentials and roles
5. **Embeddings**
   - Configure embedding model settings

For detailed configuration options, see the [Configuration Documentation](src/file/Configuration.md).

## Authentication

The server uses JWT for authentication. To add new users:

1. **Generate a password hash**

   ```sh
   node hash.js yourSecurePassword
   ```

2. **Add the user to configuration**

   ```json
   "Authentication": {
     "username": {
       "role": "user",
       "secret": "generated_hash_from_previous_step"
     }
   }
   ```

3. **Restart the server** for changes to take effect

For detailed configuration options, see the [Configuration Documentation](src/file/Configuration.md).

## API Key Management

The server uses a `KeyManager` utility for handling API keys:

1. **Key Resolution Strategy**

   API keys are resolved in the following order of priority:

   - Direct parameter passed to adapter constructor
   - Configuration file entries in the adapter section
   - Environment variables (e.g., OPENAI_API_KEY)

2. **Adding API Keys**

   Keys can be added in multiple ways:

   - Directly in the adapter constructor
   - In the configuration file (config.json)
   - As environment variables (.env)

## Project Structure

```
server/
├── dist/               # Compiled JavaScript output
├── src/
│   ├── adapters/       # LLM adapters (OpenAI, Ollama, etc.)
│   ├── file/           # Configuration management
│   ├── interfaces/     # TypeScript interfaces
│   ├── socket/         # WebSocket handlers
│   │   ├── handlers/   # Message handlers for different events
│   ├── utils/          # Utility functions
│   ├── logger.ts       # Logging system
│   └── server.ts       # Main application entry point
└── ...
```

## Adding New Adapters

To add support for new LLM providers:

1. Create a new adapter class in `src/adapters/` extending `LLMAdapter`
2. Implement required methods (forwardRequest, listModels, etc.)
3. Register the adapter in `LLMAdapterManager`
4. Add configuration in `config.json`

## Troubleshooting

### Common Issues

1. **Server won't start**

   - Check Node.js version (18.0+ required)
   - Verify port availability in your environment
   - Check for syntax errors in config.json

2. **Authentication failures**

   - Verify user credentials in config.json
   - Ensure proper JWT secret generation

3. **LLM adapters not working**

   - Verify API keys are correctly set
   - Check network connectivity to LLM providers
   - For Ollama, ensure the service is running locally

4. **API key errors**

   - Check that API keys are correctly set in one of the supported locations
   - Verify environment variables are accessible to the Node.js process
   - Ensure the API key is valid and has the necessary permissions

5. **Request timeouts**
   - Increase timeout settings in adapter configuration
   - Check network connectivity and LLM provider status

## Contributing

1. Follow TypeScript style guide and code conventions
2. Add JSDoc comments for new functions and classes
3. Update tests when adding new functionality
4. Submit pull requests with meaningful descriptions

## License and Credits

The tool was created by Felix Gratzkowski under the scientific supervision of Dr. rer. nat. Sebastian Bader and Dr.-Ing. Robin Nicolay at the University of Rostock.

This project was developed as part of the KI-Med Collaboration Platform (KiMeKo) project for the comparative analysis of AI models. It is funded by the BMBF (funding code 01IS24056D) and aims to accelerate the development of AI-based medical products. It is part of a northern German ecosystem that brings together research institutions, clinics and companies to drive forward innovative solutions in the field of medical technology.

This work is licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/).

You are free to:

- Share — copy and redistribute the material in any medium or format
- Adapt — remix, transform, and build upon the material

Under the following terms:

- Attribution — You must give appropriate credit to the University of Rostock
- NonCommercial — You may not use the material for commercial purposes
- ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license

![alt license image](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)

For the full license text, see the [LICENSE](LICENSE) file in the project root.

© 2024 University of Rostock. All rights reserved.

For additional documentation, please refer to:

- [Configuration Guide](src/file/Configuration.md)
- [Evaluation Documentation](src/socket/handlers/Evaluation.md)
