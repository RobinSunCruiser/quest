# quest Binary Release

This is a standalone binary release of quest, a specialized platform for LLM output evaluation.

## Quick Start

1. **Download the binary** for your platform:
   - `quest-win.exe` - Windows
   - `quest-macos` - macOS
   - `quest-linux` - Linux

2. **Configure the application** by editing `config.json` (see Configuration section below)

3. **Run the binary**:
   ```bash
   ./quest-win.exe
   ./quest-macos
   ./quest-linux
   ```

4. **Access the application** at `http://localhost:3000`

5. **Login** with default credentials: `user` / `user`

## Configuration

The `config.json` file contains all configuration settings for quest. Edit this file to configure your LLM providers and other settings.

### Server Configuration

```json
{
  "Log": {
    "Level": "info"
  },
  "Server": {
    "Port": 3000
  }
}
```

- `Log.Level`: Logging level (trace, debug, info, warn, error)
- `Server.Port`: Port number for the web server

### LLM Adapters

Configure your language model providers in the `LLMAdapters` section:

```json
{
  "LLMAdapters": {
    "openai": {
      "baseUrl": "https://api.openai.com/v1",
      "provider": "openai",
      "modelFilter": [],
      "apiKey": "your-openai-api-key-here",
      "maxConcurrentRequests": 3
    },
    "anthropic": {
      "baseUrl": "https://api.anthropic.com",
      "provider": "anthropic",
      "modelFilter": [],
      "apiKey": "your-anthropic-api-key-here",
      "maxConcurrentRequests": 3
    },
    "local": {
      "baseUrl": "http://localhost:11434",
      "provider": "ollama",
      "modelFilter": [],
      "apiKey": "",
      "maxConcurrentRequests": 1
    },
    "perplexity": {
      "baseUrl": "https://api.perplexity.ai",
      "provider": "perplexityai",
      "modelFilter": [],
      "apiKey": "your-perplexity-api-key-here",
      "maxConcurrentRequests": 3
    }
  },
  "Embeddings": {
      "ollama1": {
          "adapter": "local",
          "model": "mxbai-embed-large:latest"
      }
  }
}
```

#### Embeddings
- An embedding model must be available for Semantic output evaluation. You can download it from ollama and host it with an ollama adapter

#### Adapter Configuration Fields

- `baseUrl`: API endpoint for the provider
- `provider`: Adapter type (`openai`, `anthropic`, `ollama`, `perplexityai`)
- `modelFilter`: Array of regex patterns to filter available models (empty array = all models)
- `apiKey`: API key for authenticated services (leave empty for Ollama)
- `maxConcurrentRequests`: Maximum simultaneous requests to prevent overloading

### Authentication

Default user configuration:

```json
{
  "Authentication": {
    "user": {
      "role": "user",
      "secret": "REPLACE_WITH_BCRYPT_HASH_GENERATED_BY_hash.js"
    }
  }
}
```

- Default username: `user`
- Default password: `user`
- The `secret` field contains a bcrypt hash of the password

## Setting Up LLM Providers

### OpenAI

1. Create an account at [https://platform.openai.com](https://platform.openai.com)
2. Generate an API key
3. Add your API key to the `openai` adapter in `config.json`

### Anthropic

1. Create an account at [https://console.anthropic.com](https://console.anthropic.com)
2. Generate an API key
3. Add your API key to the `anthropic` adapter in `config.json`

### Ollama (Local Models)

1. Install Ollama from [https://ollama.com](https://ollama.com)
2. Pull models you want to use:
   ```bash
   ollama pull llama3.2
   ollama pull mistral
   ```
3. Ensure Ollama is running on `http://localhost:11434`
4. The `local` adapter should work without additional configuration

### PerplexityAI

1. Create an account at [https://www.perplexity.ai](https://www.perplexity.ai)
2. Generate an API key
3. Add your API key to the `perplexity` adapter in `config.json`

## Usage

### Quest LLM Evaluation workflow

1. **Select a set of models**: Enter text manually to send a request to selected models
2. **Models return responses**: Select tabs to see model responses
3. **Evaluate model responses**: Press evaluate next to a models response to compare outputs. Make sure embedding model is available

## Troubleshooting

### Binary Won't Start

- Ensure the binary has execute permissions:
  ```bash
  chmod +x quest-macos  # macOS/Linux
  ```
- Check that port 3000 is available
- Verify `config.json` syntax is valid

### No Models Available

- Check that your LLM providers are properly configured
- Verify API keys are correct and have sufficient credits
- For Ollama, ensure the service is running and models are pulled
- Use the "Reload Backend" button in the web interface

### Authentication Issues

- Default credentials: `user` / `user`
- To change password, use the password hashing tool or update the bcrypt hash in `config.json`

### Network Issues

- Check firewall settings for port 3000
- Verify internet connectivity for cloud-based LLM providers
- For Ollama, ensure the service is accessible at the configured URL

## File Structure

```
quest-binary/
├── quest-[platform]     # Executable binary
├── config.json          # Configuration file
└── release_readme.md    # This file
```

## Support

For issues and questions:
- Check the troubleshooting section above
- Review the main project documentation
- Ensure your `config.json` is properly formatted

## License

This project is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0).

© 2024 University of Rostock. All rights reserved.