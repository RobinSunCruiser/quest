#!/usr/bin/env python3
"""
QUEST Python Client Library

A client for interacting with the QUEST server programmatically.

This library provides a convenient interface to the QUEST platform's API,
enabling Python applications to leverage LLM capabilities, model management,
and evaluation services.

Features:
- Socket.IO-based real-time communication
- Authentication with secure token persistence
- Automatic server availability detection and retry mechanisms
- Model discovery and metadata retrieval
- Synchronous and streaming LLM requests
- Multi-model response evaluation
- Interactive and non-interactive modes
"""

import json
import os
import time
import uuid
from threading import Event
from typing import Dict, List, Optional, Union, Any
from getpass import getpass

import requests
import socketio


class QuestClient:
    """
    Client for interacting with the QUEST server.

    This class provides methods to authenticate, connect to the QUEST server,
    send requests to language models, and evaluate model responses. It handles
    token management, server availability checking, and both streaming and
    non-streaming interactions with models.
    """

    def __init__(
        self,
        server_url: str = "http://localhost:3000",
        token_file: str = ".quest_token",
        auto_connect: bool = True,
        verbose: bool = False,
        auto_login: bool = True,
    ):
        """
        Initialize the QUEST client.

        Creates a new QUEST client instance with the specified configuration.
        The client will check server availability immediately and attempt to
        load and verify any existing authentication token.

        Args:
            server_url: The base URL of the QUEST server
            token_file: Path to file where authentication token is stored
            auto_connect: Whether to automatically connect to the server on initialization
            verbose: Whether to print detailed status messages during operation
            auto_login: Whether to automatically prompt for login credentials if no valid token exists
        """
        # Store configuration options
        self.server_url = server_url
        self.token_file = token_file
        self.verbose = verbose
        self.auto_login = auto_login

        # Initialize state variables
        self.connected = False
        self.token = None
        self.model_list = []
        self.last_response = None
        self.evaluation_data = None
        self.events = {}
        self._stream_chunks = {}
        self._live_stream = set()

        # Initialize Socket.IO client and set up handlers
        self.sio = socketio.Client()
        self._setup_socket_handlers()

        # Check socket server availability immediately
        self.server_available = self.check_socket_server()
        if not self.server_available:
            print(
                f"\n⚠️ QUEST socket server at {self.server_url} appears to be offline or unreachable"
            )
            print("Some operations may fail until the server becomes available.")

        # Load and verify token if server is available
        self.token = self._load_token()
        if self.server_available and self.token and not self._verify_token(self.token):
            self._log("Stored token is invalid or expired, clearing it")
            self._clear_token()

        # Connect automatically if requested and server is available
        if auto_connect and self.server_available:
            self.connect()

        # Try auto-login if no valid token exists and server is available
        if (
            self.server_available
            and not self.token
            and self.auto_login
            and self._is_interactive()
        ):
            self._log("No valid token found, initiating automatic login")
            self._interactive_login()

    def _log(self, message: str) -> None:
        """
        Log a message if verbose mode is enabled.

        Args:
            message: The message to log
        """
        if self.verbose:
            print(f"[QuestClient] {message}")

    def _clear_token(self) -> None:
        """
        Remove authentication token from memory and disk.

        This method clears any stored token both from the client instance
        and from the token file on disk.
        """
        self.token = None
        if os.path.exists(self.token_file):
            try:
                os.remove(self.token_file)
                self._log(f"Deleted token file: {self.token_file}")
            except Exception as e:
                self._log(f"Error deleting token file: {e}")

    def _setup_socket_handlers(self) -> None:
        """
        Set up Socket.IO event handlers.

        This method configures all the necessary event handlers for the Socket.IO
        client to process server responses, including connection events, model lists,
        chat responses, streaming chunks, and evaluation results.
        """

        @self.sio.event
        def connect():
            """Handle successful connection to the server."""
            self._log("Connected to QUEST server")
            self.connected = True
            if self.token:
                self._authenticate()

        @self.sio.event
        def disconnect():
            """Handle disconnection from the server."""
            self._log("Disconnected from QUEST server")
            self.connected = False

        @self.sio.event
        def connect_error(data):
            """Handle connection error events."""
            self._log(f"Connection error: {data}")

        # Register event handlers for specific message types
        self.sio.on("LLM_LIST_UPDATE", self._handle_model_list)
        self.sio.on("LLM_CHAT_RESPONSE", self._handle_chat_response)
        self.sio.on("LLM_CHAT_STREAM_CHUNK_RESPONSE", self._handle_chat_chunk)
        self.sio.on("LLM_EVAL_RESPONSE", self._handle_eval_response)
        self.sio.on("AUTH_RESPONSE", self._handle_auth_response)

    def _load_token(self) -> Optional[str]:
        """
        Load authentication token from file.

        Returns:
            The authentication token if available, or None if not found or invalid
        """
        try:
            if os.path.exists(self.token_file):
                with open(self.token_file, "r") as f:
                    token = f.read().strip()
                    if token:
                        self._log(f"Loaded authentication token from {self.token_file}")
                        return token
                    else:
                        self._log(f"Token file exists but is empty: {self.token_file}")
        except Exception as e:
            self._log(f"Error loading token: {e}")
        return None

    def _save_token(self, token: str) -> None:
        """
        Save authentication token to file.

        Args:
            token: The authentication token to save
        """
        try:
            with open(self.token_file, "w") as f:
                f.write(token)
            # Set appropriate permissions if on Unix-like system
            try:
                os.chmod(self.token_file, 0o600)  # Read/write for owner only
            except:
                pass  # Skip if on Windows or other systems
            self._log(f"Saved authentication token to {self.token_file}")
        except Exception as e:
            self._log(f"Error saving token: {e}")

    def _authenticate(self) -> None:
        """
        Send authentication message with stored token.

        This method sends the stored authentication token to the server to
        establish an authenticated session. It should be called after connecting
        to the server if a valid token exists.
        """
        if not self.token:
            self._log("No authentication token available")
            return

        auth_message = {
            "event": "AUTH",
            "version": "0.1.0",
            "data": {"token": self.token},
        }

        self.sio.emit("AUTH", auth_message)
        self._log("Authentication request sent")

    def _interactive_login(self) -> bool:
        """
        Prompt for username and password in an interactive environment.

        This method interactively prompts the user for their username and password
        to authenticate with the QUEST server. It's used when auto_login is enabled
        and no valid token is available.

        Returns:
            bool: True if login was successful, False otherwise
        """
        try:
            print("\nAuthentication required. Please log in to the QUEST server:")
            username = input("Username: ").strip()
            password = getpass("Password: ")

            return self.login(username, password)
        except (KeyboardInterrupt, EOFError):
            print("\nLogin cancelled by user")
            return False
        except Exception as e:
            self._log(f"Interactive login failed: {str(e)}")
            return False

    def _is_interactive(self) -> bool:
        """
        Check if the code is running in an interactive terminal.

        This determines whether user input can be requested for operations
        like login prompts and connection retry confirmations.

        Returns:
            bool: True if running in an interactive terminal, False otherwise
        """
        try:
            import sys

            return sys.stdin.isatty()
        except:
            return False

    def _handle_auth_response(self, data: Dict) -> None:
        """
        Handle authentication response from the server.

        Args:
            data: The authentication response data from the server
        """
        success = data.get("data", {}).get("success", False)
        if success:
            self._log("Authentication successful")
        else:
            error_msg = data.get("error", {}).get(
                "message", "Unknown authentication error"
            )
            self._log(f"Authentication failed: {error_msg}")
            self._clear_token()

            if self._is_interactive() and self.auto_login:
                self._log("Attempting to re-authenticate...")
                self._interactive_login()

    def _handle_model_list(self, data: Dict) -> None:
        """
        Handle model list update from server.

        Args:
            data: The model list data from the server
        """
        self.model_list = data.get("data", {}).get("models", [])
        request_id = data.get("payload", {}).get("requestID")

        self._log(f"Received list of {len(self.model_list)} available models")

        if request_id in self.events:
            self.events[request_id].set()

    def _handle_chat_response(self, data: Dict) -> None:
        """
        Handle chat response from server.

        Args:
            data: The chat response data from the server
        """
        self.last_response = data
        request_id = data.get("payload", {}).get("requestID")
        model_id = data.get("data", {}).get("modelID", "unknown")

        if data.get("error"):
            error_msg = data.get("error", {}).get("message", "Unknown error")
            self._log(f"Error from server for model {model_id}: {error_msg}")
        else:
            self._log(f"Received chat response from model {model_id}")

        if request_id in self.events:
            self.events[request_id].set()

    def _handle_chat_chunk(self, data: Dict) -> None:
        """
        Handle streaming chat chunks from server.

        This method processes each chunk of a streaming response, updating
        the accumulated response and triggering display if visual mode is enabled.

        Args:
            data: The chat chunk data from the server
        """
        chunk = data.get("data", {}).get("chunk", "")
        is_done = data.get("data", {}).get("done", False)
        request_id = data.get("payload", {}).get("requestID")

        # Print chunk if visual streaming is enabled
        if request_id in self._live_stream:
            print(chunk, end="", flush=True)

        # Collect chunk if we're tracking this request
        if request_id in self._stream_chunks:
            self._stream_chunks[request_id].append(chunk)

        # Signal completion if done
        if is_done and request_id in self.events:
            if request_id in self._live_stream:
                print()  # Add final newline
            self.events[request_id].set()
            self._log(f"Stream completed for request {request_id}")

    def _handle_eval_response(self, data: Dict) -> None:
        """
        Handle evaluation response from server.

        Args:
            data: The evaluation response data from the server
        """
        request_id = data.get("payload", {}).get("requestID")

        if data.get("error"):
            error_msg = data.get("error", {}).get("message", "Unknown error")
            self._log(f"Evaluation error from server: {error_msg}")
            self.evaluation_data = {"error": error_msg}
        else:
            self.evaluation_data = data.get("data", {}).get("evaluation", {})
            self._log("Received evaluation results")

        if request_id in self.events:
            self.events[request_id].set()

    def _verify_token(self, token: str) -> bool:
        """
        Verify if the stored token is still valid.

        Makes an API call to check whether the provided authentication token
        is recognized by the server and hasn't expired.

        Args:
            token: Authentication token to verify

        Returns:
            bool: True if the token is valid, False otherwise
        """
        try:
            self._log("Verifying token validity")
            response = requests.post(
                f"{self.server_url}/verify",
                json={"token": token},
                timeout=5,  # 5 second timeout for token verification
            )

            if response.status_code == 200:
                data = response.json()
                is_valid = data.get("valid", False)
                if is_valid:
                    self._log("Token is valid")
                else:
                    self._log("Token is invalid or expired")
                return is_valid

            self._log(
                f"Token verification failed with status code: {response.status_code}"
            )
            return False
        except requests.exceptions.ConnectionError:
            self._log("Token verification failed: Connection error")
            return False
        except requests.exceptions.Timeout:
            self._log("Token verification timed out")
            return False
        except Exception as e:
            self._log(f"Token verification error: {e}")
            return False

    def _retry_server_connection(self) -> bool:
        """
        Prompt the user to retry connecting to the server.

        This method is called when the server appears to be unavailable and the
        client is running in an interactive environment. It allows the user to
        retry connecting to the server a limited number of times.

        Returns:
            bool: True if server became available after retries, False otherwise
        """
        if not self._is_interactive():
            return False

        max_retries = 3
        retries = 0

        print("\n⚠️ QUEST server appears to be offline or unreachable")
        print("Please ensure the server is running at:", self.server_url)

        while retries < max_retries and not self.server_available:
            retry = input("\nWould you like to retry connecting? (y/n): ")
            if retry.lower() in ["y", "yes"]:
                print("Checking socket server availability...")
                self.server_available = self.check_socket_server()
                if self.server_available:
                    print("✅ Socket server is now available!")
                    return True
                else:
                    print("Socket server still unavailable.")
                    retries += 1
                    if retries == max_retries:
                        print(f"Maximum retry attempts ({max_retries}) reached.")
            else:
                # User chose not to retry
                break

        return self.server_available

    def check_socket_server(self, timeout: int = 5) -> bool:
        """
        Check if the QUEST server's WebSocket connection is available.

        This method attempts to establish a temporary socket connection to the server
        to determine if the WebSocket server is online and accessible. It only checks
        WebSocket connectivity without relying on HTTP endpoints, which is useful for
        diagnosing connection issues specific to the socket server.

        Args:
            timeout: Maximum time in seconds to wait for socket connection

        Returns:
            bool: True if socket server is responding, False otherwise
        """
        # Create a temporary socket client for testing
        test_socket = socketio.Client()
        socket_available = False

        # Define handlers for the test socket
        @test_socket.event
        def connect():
            nonlocal socket_available
            socket_available = True

        @test_socket.event
        def connect_error(data):
            self._log(f"Socket connection error during availability check: {data}")

        try:
            # Attempt connection with timeout
            test_socket.connect(
                self.server_url,
                wait_timeout=timeout,
                wait=True,
                transports=["websocket"],  # Try only websocket transport
            )

            # If connect succeeded, socket is available
            self._log("Socket server is online and responding")
            return True
        except socketio.exceptions.ConnectionError as e:
            self._log(f"Socket server appears to be offline: {e}")
            return False
        except Exception as e:
            self._log(f"Error checking socket availability: {str(e)}")
            return False
        finally:
            # Always disconnect the test socket
            try:
                if test_socket.connected:
                    test_socket.disconnect()
            except:
                pass

        return socket_available

    def connect(self) -> bool:
        """
        Connect to the QUEST server.

        This method establishes a connection to the server, handling authentication
        and availability checks. If the server is unavailable, it offers to retry
        the connection when in interactive mode.

        The method will:
        1. Check server availability if not already confirmed
        2. Offer retry options if server is unavailable (in interactive mode)
        3. Verify token validity if one exists
        4. Attempt login if needed and in interactive mode
        5. Establish socket connection to server

        Returns:
            bool: True if successfully connected, False otherwise
        """
        try:
            # Check if server is available using socket-only check
            if not self.server_available:
                self.server_available = self.check_socket_server()

            # If server is unavailable, offer to retry in interactive mode
            if not self.server_available:
                self._retry_server_connection()

            # If still unavailable, can't connect
            if not self.server_available:
                return False

            # Verify token if we have one
            if self.token and not self._verify_token(self.token):
                self._log("Token is invalid or expired")
                self._clear_token()

            # Try login if needed and possible
            if not self.token and self.auto_login and self._is_interactive():
                self._log("No valid token, attempting interactive login")
                if not self._interactive_login():
                    self._log("Interactive login failed")
                    return False

            # Now connect to socket server
            if not self.connected:
                self.sio.connect(self.server_url)

            return self.connected
        except socketio.exceptions.ConnectionError as e:
            print("\n⚠️ Failed to connect to QUEST server")
            print(f"Error details: {str(e)}")
            print("Please ensure the server is running at:", self.server_url)
            self.server_available = False
            return False
        except Exception as e:
            self._log(f"Connection error: {e}")
            self.server_available = False
            return False

    def disconnect(self) -> None:
        """
        Disconnect from the QUEST server.

        This method cleanly terminates the Socket.IO connection to the server
        if one is currently established. It does not affect the stored
        authentication token.
        """
        if self.connected:
            self.sio.disconnect()

    def login(self, username: str, password: str) -> bool:
        """
        Login to the QUEST server.

        This method sends the provided credentials to the server to obtain
        an authentication token. If successful, the token is stored both
        in memory and in the token file for future use.

        Args:
            username: User's username for authentication
            password: User's password for authentication

        Returns:
            bool: True if login was successful and a token was obtained, False otherwise
        """
        try:
            response = requests.post(
                f"{self.server_url}/login",
                json={"username": username, "password": password},
                timeout=10,  # 10 second timeout for login requests
            )

            if response.status_code == 200:
                data = response.json()
                token = data.get("token")
                if token:
                    self._save_token(token)
                    self.token = token

                    # Authenticate if already connected
                    if self.connected:
                        self._authenticate()
                    return True

            self._log(f"Login failed: {response.text}")
            return False
        except requests.exceptions.ConnectionError:
            self._log("Login failed: Server connection error")
            return False
        except requests.exceptions.Timeout:
            self._log("Login request timed out")
            return False
        except Exception as e:
            self._log(f"Login error: {e}")
            return False

    def _ensure_connected(self) -> bool:
        """
        Ensure client is connected and authenticated.

        This internal method is called before sending requests to ensure that:
        1. The server is available
        2. The client is connected to the server
        3. The client is authenticated with a valid token

        If any of these conditions are not met, it attempts to resolve them
        by checking server availability, connecting, or obtaining a token.

        Returns:
            bool: True if client is connected and authenticated, False otherwise
        """
        # First check server availability if not connected
        if not self.connected:
            # Check if we should recheck the server status
            if not self.server_available:
                self.server_available = self.check_socket_server()

            # If server is still unavailable, offer to retry
            if not self.server_available:
                self._retry_server_connection()

            # If still unavailable after retries
            if not self.server_available:
                return False

            # Try login if we don't have a token
            if not self.token and self.auto_login and self._is_interactive():
                self._log("No token available, attempting login")
                if not self._interactive_login():
                    self._log("Login failed")
                    return False

            # Connect if needed
            if not self.connected:
                if not self.connect():
                    self._log("Failed to connect to server")
                    return False

        # Authenticate if we have a token
        if self.token and self.connected:
            self._authenticate()

        # Final check
        if not self.token:
            self._log("Not authenticated and couldn't obtain a token")
            return False

        return True

    def list_models(self, timeout: int = 10) -> List[Dict]:
        """
        Get list of available models from the server.

        This method requests the list of models that are available for use,
        including their IDs, providers, capabilities, and other metadata.

        Args:
            timeout: Maximum time in seconds to wait for the server response

        Returns:
            List[Dict]: List of model information dictionaries, each containing:
                - id: Unique identifier for the model
                - provider: The model provider (e.g., OpenAI, Anthropic)
                - capabilities: Features supported by the model
                - maxTokens: Maximum context length supported
                - contextWindow: Context window size
                - ...and other model-specific attributes
        """
        for attempt in range(2):
            # Ensure connection
            if not self._ensure_connected():
                if attempt == 0:
                    self._log("Authentication failed, retrying...")
                    continue
                return []

            # Send model list request
            request_id = str(uuid.uuid4())
            self.events[request_id] = Event()

            list_message = {
                "event": "LLM_LIST_REQUEST",
                "version": "0.1.0",
                "payload": {"requestID": request_id},
            }

            self.sio.emit("LLM_LIST_REQUEST", list_message)
            self._log(f"Sent model list request with {timeout}s timeout")

            # Wait for response
            success = self.events[request_id].wait(timeout)
            del self.events[request_id]

            if not success:
                self._log(f"Model list request timed out after {timeout} seconds")
                return []

            return self.model_list

        return []

    def request_completion(
        self,
        model_id: str,
        prompt: str,
        system_prompt: str = "You are a helpful assistant.",
        options: Dict = None,
        timeout: int = 60,
    ) -> Dict:
        """
        Send a non-streaming chat request to a model.

        This method sends a prompt to the specified model and waits for
        the complete response before returning. It does not stream the
        response as it's being generated.

        Args:
            model_id: ID of the model to use (e.g., "openai-gpt-4")
            prompt: User prompt or question to send to the model
            system_prompt: System instructions defining the model's behavior
            options: Dictionary of model-specific options such as:
                - temperature: Randomness of outputs (0.0-2.0)
                - top_p: Nucleus sampling parameter (0.0-1.0)
                - max_tokens: Maximum tokens to generate
                - stop: List of strings that will stop generation when encountered
            timeout: Maximum time in seconds to wait for a response

        Returns:
            Dict: Response dictionary containing:
                - data: The response data object
                - data.message: The generated message
                - data.modelID: ID of the model that generated the response
                - error: Error information (if an error occurred)
        """
        # Prepare options
        if options is None:
            options = {}
        options["stream"] = False

        return self._send_request(
            model_id=model_id,
            prompt=prompt,
            system_prompt=system_prompt,
            options=options,
            timeout=timeout,
            stream=False,
        )

    def request_stream(
        self,
        model_id: str,
        prompt: str,
        system_prompt: str = "You are a helpful assistant.",
        options: Dict = None,
        timeout: int = 60,
        visual: bool = True,
    ) -> str:
        """
        Send a streaming chat request to a model and return the complete response.

        This method sends a prompt to the specified model and streams the
        response as it's being generated. When the visual parameter is True,
        the response is displayed in real-time as it arrives. Regardless of
        the visual setting, the complete response is collected and returned
        as a string once generation is complete or the timeout is reached.

        Args:
            model_id: ID of the model to use (e.g., "openai-gpt-4")
            prompt: User prompt or question to send to the model
            system_prompt: System instructions defining the model's behavior
            options: Dictionary of model-specific options (see request_completion)
            timeout: Maximum time in seconds to wait for complete response
            visual: Whether to display the streaming response in real-time

        Returns:
            str: The complete text response from the model as a single string
        """
        # Prepare options
        if options is None:
            options = {}
        options["stream"] = True

        # Set up tracking for this request
        request_id = str(uuid.uuid4())
        self._stream_chunks[request_id] = []
        self.events[request_id] = Event()

        # Enable visual streaming if requested
        if visual:
            self._live_stream.add(request_id)
            print("\n📝 Model is generating response...")

        # Send request
        self._send_request(
            model_id=model_id,
            prompt=prompt,
            system_prompt=system_prompt,
            options=options,
            timeout=timeout,
            stream=True,
            request_id=request_id,
        )

        # Wait for completion
        if not self.events[request_id].wait(timeout):
            if visual and request_id in self._live_stream:
                print("\n⚠️ Request timed out")

        # Collect and clean up
        full_response = "".join(self._stream_chunks[request_id])

        # Clean up
        if request_id in self._live_stream:
            self._live_stream.remove(request_id)

        del self._stream_chunks[request_id]
        del self.events[request_id]

        return full_response

    def _send_request(
        self,
        model_id: str,
        prompt: str,
        system_prompt: str,
        options: Dict,
        timeout: int,
        stream: bool,
        request_id: str = None,
    ) -> Union[Dict, str]:
        """
        Internal method to send a chat request to a model.

        This internal method handles the details of constructing and sending
        request messages to the server over Socket.IO. It supports both
        streaming and non-streaming modes with appropriate handling of each.

        Args:
            model_id: ID of the model to use
            prompt: User prompt to send
            system_prompt: System prompt/instructions for the model
            options: Model options dictionary
            timeout: Request timeout in seconds
            stream: Whether to stream the response
            request_id: Optional custom request ID

        Returns:
            Union[Dict, str]: For non-streaming requests, returns the complete
                response data dictionary. For streaming requests, returns a dict
                with request_id and conversation_id. On error, returns an error
                message string.
        """
        for attempt in range(2):
            # Ensure connection
            if not self._ensure_connected():
                if attempt == 0:
                    self._log("Authentication failed, retrying...")
                    continue
                return "Error: Not connected or authenticated"

            # Generate IDs
            if request_id is None:
                request_id = str(uuid.uuid4())
            conversation_id = str(uuid.uuid4())

            # Set up event if needed
            if not stream or request_id not in self._stream_chunks:
                self.events[request_id] = Event()

            # Prepare message
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ]

            chat_message = {
                "event": "LLM_CHAT_REQUEST",
                "version": "0.1.0",
                "data": {
                    "modelID": model_id,
                    "messages": messages,
                    "modelOptions": options,
                },
                "payload": {"requestID": request_id, "conversationID": conversation_id},
            }

            try:
                # Send request
                self.sio.emit("LLM_CHAT_REQUEST", chat_message)
                self._log(
                    f"Sent request to {model_id}" + (" (streaming)" if stream else "")
                )

                # Handle non-streaming responses
                if not stream:
                    if not self.events[request_id].wait(timeout):
                        del self.events[request_id]
                        return f"Error: Request timed out after {timeout} seconds"

                    del self.events[request_id]

                    if self.last_response is None:
                        return "Error: No response received"

                    return self.last_response

                # For streaming, return request info
                return {
                    "request_id": request_id,
                    "conversation_id": conversation_id,
                }
            except Exception as e:
                self._log(f"Error sending request: {str(e)}")
                if request_id in self.events:
                    del self.events[request_id]
                return f"Error: {str(e)}"

        return "Error: Authentication failed after multiple attempts"

    def abort_request(self, request_id: str, conversation_id: str) -> None:
        """
        Abort an ongoing request.

        This method sends a signal to the server to cancel a request that
        is currently in progress. This is particularly useful for long-running
        streaming requests that you no longer need to complete.

        Args:
            request_id: ID of the request to abort
            conversation_id: ID of the conversation containing the request
        """
        if not self.connected:
            self._log("Cannot abort request - not connected")
            return

        abort_message = {
            "event": "LLM_CHAT_ABORT",
            "version": "0.1.0",
            "payload": {"requestID": request_id, "conversationID": conversation_id},
        }

        self.sio.emit("LLM_CHAT_ABORT", abort_message)
        self._log(f"Abort request sent for request {request_id}")

        # If we have a pending event for this request, mark it as done
        if request_id in self.events:
            self.events[request_id].set()

    def abort_evaluation(self, request_id: str) -> None:
        """
        Abort an ongoing evaluation request.

        This method sends a signal to the server to cancel an evaluation
        that is currently in progress. Evaluations can be compute-intensive
        and time-consuming, so this allows canceling them when no longer needed.

        Args:
            request_id: ID of the evaluation request to abort
        """
        if not self.connected:
            self._log("Cannot abort evaluation - not connected")
            return

        abort_message = {
            "event": "LLM_EVAL_ABORT",
            "version": "0.1.0",
            "payload": {"requestID": request_id},
        }

        self.sio.emit("LLM_EVAL_ABORT", abort_message)
        self._log(f"Evaluation abort request sent for request {request_id}")

        # If we have a pending event for this request, mark it as done
        if request_id in self.events:
            self.events[request_id].set()

    def check_server(self, timeout: int = 5, check_socket: bool = False) -> bool:
        """
        Check if the QUEST server is available and responding.

        This method attempts an HTTP request to the server's health endpoint
        to determine if the server is online and accessible. Optionally, it
        can also check socket connectivity if check_socket=True.

        Args:
            timeout: Maximum time in seconds to wait for server response
            check_socket: Whether to also check socket connection availability

        Returns:
            bool: True if server is responding, False otherwise
        """
        try:
            # Check HTTP availability first
            response = requests.get(f"{self.server_url}/health", timeout=timeout)
            if response.status_code == 200:
                self._log("HTTP server is online and responding")

                # Optionally check socket availability
                if check_socket and not self.check_socket_server(timeout):
                    self._log("HTTP server is up but socket server is not available")
                    self.server_available = False
                    return False

                self.server_available = True
                return True

            self._log(f"Server responded with status code: {response.status_code}")
            self.server_available = False
            return False
        except requests.exceptions.ConnectionError:
            self._log("Server connection failed - server appears to be offline")
            self.server_available = False
            return False
        except requests.exceptions.Timeout:
            self._log(f"Server connection timed out after {timeout} seconds")
            self.server_available = False
            return False
        except Exception as e:
            self._log(f"Error checking server availability: {str(e)}")
            self.server_available = False
            return False

    def evaluate_responses(
        self, model_responses: List[Dict], options: Dict = None, timeout: int = 30
    ) -> Dict:
        """
        Request evaluation of multiple model responses.

        This method sends multiple model responses to the QUEST evaluation service
        to compare and analyze them. It provides detailed metrics on the quality,
        accuracy, and style of each response, as well as comparative analysis
        between responses.

        Args:
            model_responses: List of model responses to evaluate
                Each dict must have:
                - 'modelID': String identifier of the model that generated the response
                - 'message': String containing the full text response from the model
            options: Evaluation options dictionary with settings like:
                - 'removeThinkingBlock': Remove "thinking" sections before evaluation
                - 'extractFactClaims': Extract and validate factual claims
                - 'aspectScoring': Enable detailed scoring on specific aspects
                - 'humanReferenceText': Optional reference text for comparison
            timeout: Request timeout in seconds

        Returns:
            Dict: Evaluation data dictionary containing:
                - 'similarity': Similarity score between responses (0.0-1.0)
                - 'responses': List of analyzed responses with their metrics:
                    - 'clarity': Clarity score (0.0-1.0)
                    - 'accuracy': Factual accuracy assessment
                    - 'length': Statistics about response length
                    - 'style': Writing style assessment
                - 'summary': Textual summary of evaluation results
                - 'error': Error information if the evaluation failed
        """
        # Default options
        if options is None:
            options = {"removeThinkingBlock": True}

        # Try up to 2 times
        for attempt in range(2):
            # Ensure connection
            if not self._ensure_connected():
                if attempt == 0:
                    self._log("Authentication failed, retrying...")
                    continue
                return {"error": "Not connected or authenticated"}

            # Set up request
            request_id = str(uuid.uuid4())
            self.events[request_id] = Event()
            self.evaluation_data = None

            # Debug info
            model_ids = [resp.get("modelID", "unknown") for resp in model_responses]
            self._log(f"Evaluating models: {model_ids}")

            # Prepare message
            eval_message = {
                "event": "LLM_EVAL_REQUEST",
                "version": "0.1.0",
                "data": {
                    "chatModels": model_responses,
                    "options": options,
                },
                "payload": {"requestID": request_id},
            }

            try:
                # Start a timer to track actual execution time
                start_time = time.time()

                # Send request
                self.sio.emit("LLM_EVAL_REQUEST", eval_message)
                self._log(f"Evaluation request sent with {timeout}s timeout")

                # Wait for response with timeout
                if not self.events[request_id].wait(timeout):
                    elapsed = time.time() - start_time
                    self._log(f"Evaluation timed out after {elapsed:.1f} seconds")
                    del self.events[request_id]
                    return {"error": f"Evaluation timed out after {timeout} seconds"}

                # Calculate response time for logging
                elapsed = time.time() - start_time
                self._log(f"Evaluation completed in {elapsed:.1f} seconds")

                del self.events[request_id]

                # Check for response
                if self.evaluation_data is None:
                    return {"error": "No evaluation response received"}

                return self.evaluation_data

            except Exception as e:
                self._log(f"Error during evaluation: {str(e)}")
                if request_id in self.events:
                    del self.events[request_id]
                return {"error": f"Exception during evaluation: {str(e)}"}

        return {"error": "Evaluation failed after multiple attempts"}

    def get_response_content(self, response: Union[Dict, str]) -> str:
        """
        Extract just the content from a model response.

        This utility method extracts the actual text content from a response
        dictionary returned by the API, handling different response formats
        (string or dictionary) and potential error conditions.

        Args:
            response: The full response (either a dictionary from request_completion
                     or a string from request_stream)

        Returns:
            str: String content of the response, or error message if the response
                 contains an error
        """
        if isinstance(response, str):
            return response

        if not response:
            return ""

        # Check for error
        if "error" in response:
            if isinstance(response["error"], dict):
                error_msg = response["error"].get("message", "Unknown error")
            else:
                error_msg = str(response["error"])
            return f"Error: {error_msg}"

        # Extract content
        content = response.get("data", {}).get("message", "")
        if not content and isinstance(response.get("data", {}).get("message"), str):
            # Handle string message format
            content = response.get("data", {}).get("message", "")

        return content


def main():
    """
    Example usage demonstrating the QUEST client's capabilities.

    This function provides a comprehensive walkthrough of the client's main features:
    1. Connecting to the server and checking availability
    2. Listing available models
    3. Sending standard completion requests
    4. Sending streaming requests
    5. Evaluating and comparing model responses

    It serves both as a demonstration and a simple test of key functionality.

    Returns:
        int: Exit code (0 for success, 1 for failure)
    """
    print("\n=== QUEST Python Client Demo ===\n")

    # Initialize client with automatic login
    client = QuestClient(
        server_url="http://localhost:3000", verbose=True, auto_login=True
    )

    # Check if server is available before proceeding
    print("Checking server availability...")
    if not client.check_socket_server():
        print("\n❌ ERROR: QUEST server is offline or unreachable")
        print("Please ensure the server is running at: http://localhost:3000")
        return 1

    # List available models
    print("\nListing available models...")
    models = client.list_models()

    if not models:
        print("No models available or couldn't retrieve model list.")
        client.disconnect()
        return 1

    # Print models
    print(f"\nFound {len(models)} available models:")
    for model in models:
        model_id = model.get("id", "unknown")
        print(f"{model_id}")

    # Select a valid model to use for testing
    if not models:
        print("No models available for testing")
        client.disconnect()
        return 1

    valid_model = models[0].get("id")
    print(f"\nUsing model: {valid_model}")

    # Test completion request
    print("\nSending a completion request...")
    prompt = "What is the capital of France?"

    response = client.request_completion(
        model_id=valid_model,
        prompt=prompt,
        system_prompt="You are a geography expert. Provide brief answers.",
        options={"temperature": 0.3},
    )

    content = client.get_response_content(response)
    print(f"\nResponse to '{prompt}':\n{content}")

    # Test streaming request
    print("\nSending a streaming request...")
    stream_prompt = "Explain neural networks in three sentences."

    streamed_content = client.request_stream(
        model_id=valid_model,
        prompt=stream_prompt,
        system_prompt="You are a machine learning expert.",
        options={"temperature": 0.7},
        visual=True,
    )

    print(f"\nFinal response to '{stream_prompt}':")
    print("-" * 50)
    print(streamed_content)
    print("-" * 50)

    # Test evaluation if we have at least one model
    print("\nTesting evaluation of similar responses...")
    responses = [
        {
            "modelID": "openai-gpt-3.5-turbo",
            "message": "Paris is the capital of France.",
        },
        {
            "modelID": "ollama-llama2",
            "message": "The capital city of France is Paris.",
        },
    ]

    eval_results = client.evaluate_responses(responses)

    if "error" in eval_results:
        print(f"Evaluation error: {eval_results['error']}")
    else:
        print("\nEvaluation results:")
        print(json.dumps(eval_results, indent=2))

    # Clean up
    client.disconnect()
    print("\nClient disconnected")
    return 0


if __name__ == "__main__":
    exit(main())
