# QUEST Python Client

## Overview

The QUEST Python Client provides a simple interface for interacting with the QUEST server, allowing users to send requests to various language models and evaluate their responses. This client is designed to work seamlessly with the QUEST platform, which includes a server and a web-based client for model comparison.

## Installation

### Prerequisites

- Python 3.8 or higher
- pip or pipenv for package management

### Setup Steps

1. **Clone the repository**

```sh
git clone https://github.com/robinsuncruiser/quest.git
cd quest/python-client
```

2. **Install dependencies**

Using pip:

```sh
pip install -r requirements.txt
```

Or using pipenv:

```sh
pipenv install
```

## Usage

### Basic Example

```python
from quest_client import QuestClient

# Initialize the client
client = QuestClient(
    server_url="http://localhost:3000",  # URL of your QUEST server
    verbose=True,
    autoLogin=True,

)

# The first time you run the client, it will prompt for your username and password
# and store the authentication token in a file for future use.

# List available models
models = client.list_models()
for model in models:
    print(model["id"])

# Send a request to a model
response = client.request_completion(
    model_id="openai-gpt-4",
    prompt="What is the capital of France?",
    system_prompt="You are a geography expert.",
    options={"temperature": 0.7}
)

# Extract the text content from the response
content = client.get_response_content(response)
print(content)

# Clean up
client.disconnect()
```

### Interactive Jupyter Notebook

The repository includes a sample Jupyter notebook (`quest_client.ipynb`) that demonstrates all the key features of the client. Run it to explore the client's capabilities in an interactive environment.

## Key Functions

### Authentication

- `login(username, password)` - Authenticate with username and password
- `connect()` - Connect to the QUEST server
- `disconnect()` - Disconnect from the server

### Model Management

- `list_models()` - Get a list of available language models

### Language Model Interaction

- `request_completion(model_id, prompt, system_prompt, options)` - Send a non-streaming request
- `request_stream(model_id, prompt, system_prompt, options, visual)` - Send a streaming request

### Evaluation

- `evaluate_responses(model_responses, options)` - Compare and evaluate responses from multiple models

### Utilities

- `check_socket_server()` - Check if the server's WebSocket is available
- `check_server()` - Check if the HTTP server is available
- `get_response_content(response)` - Extract text from a response object

## Configuration Options

- `server_url` - The base URL of the QUEST server (default: "http://localhost:3000")
- `token_file` - Path to file where authentication token is stored (default: ".quest_token")
- `auto_connect` - Whether to automatically connect on initialization (default: True)
- `verbose` - Whether to print detailed status messages (default: False)
- `auto_login` - Whether to prompt for login credentials if needed (default: True)

## Integration with Other Components

The Python client works alongside the other components of the QUEST platform:

- **QUEST Server**: Provides the backend API endpoints and socket connections
- **QUEST Client (Web)**: Browser-based UI for interactive model comparison

For full project documentation, refer to the main README.

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
