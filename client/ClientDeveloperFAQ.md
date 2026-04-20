# QUEST Client - Developer FAQ

## Table of Contents

- Project Setup
- Architecture
- Components
- State Management
- Authentication
- Models and Chat
- Evaluation
- Custom Messages
- Project Files
- Styling
- Server Integration

## Project Setup

### How do I set up the project for development?

Clone the repository, run `cd quest/client`, copy .env.example to `.env`, configure the server URL, and run `npm install` followed by `npm run dev`.

### What are the minimum Node.js requirements?

Node.js version 18.0 or higher and npm version 8.0 or higher.

### How do I run tests?

Use `npm run test` to run the Vitest test suite.

## Architecture

### What is the main component structure?

The application is structured around the App.tsx root component with modular components in `/src/components/` organized by functionality (aside, main, authentication, evaluation).

### How are custom hooks organized?

Custom hooks in `/src/hooks/` encapsulate reusable logic like chat operations, model selection, and socket connectivity. Use the barrel file index.ts to import hooks from elsewhere
in the application.

### How does communication with the server work?

The application uses Socket.IO for real-time communication through the `socketService` in `/src/services/`. API requests are handled by specialized services like `llmService`.

## Components

### How do I add a new feature to the sidebar?

Add your component to `/src/components/aside/` and then integrate it within the `<AppShell.Aside>` section in App.tsx. Export it through the barrel file index.ts.

### How does the chat interface work?

The chat interface is managed by `ChatWindow` in ChatWindow.tsx, which handles message display, user interactions, and formatting options.

### How do I modify the model selection interface?

The model selection UI is handled by the `CheckboxGroupContainer` component in combination with the `useModelSelection` hook, with state managed in App.tsx.

## State Management

### How is application state managed?

The application uses React's built-in state management with `useState` and `useEffect` hooks, with specialized custom hooks for specific functionality domains.

### How do I persist user settings?

Use the `usePersistedState` hook which wraps `localStorage` persistence around React's `useState`. See its usage in App.tsx for examples.

### Where is chat history stored?

Chat histories are stored in a Map keyed by model ID in the `chatHistories` state variable in App.tsx and synced with the `LLMService`.

## Authentication

### How does authentication work?

Authentication uses the `useVerification` hook which manages login state and JWT tokens. The `Auth` component in Auth.tsx handles the UI.

### Where do I configure user credentials?

User credentials are configured on the server side in the `config.json` file. See server documentation for details on adding/modifying users.

### How can I extend the authentication system?

Modify the `useVerification` hook and the `Auth` component. Additional roles or permissions would require changes to both client and server components.

## Models and Chat

### How do I add support for a new model parameter?

Extend the `IModelInfo` interface in the server's interfaces and update the `ModelInfo` component to display the new parameters.

### How does chat history synchronization work?

The `syncChatHistories` function in `useMessageHandling` hook applies the history from one model to all other selected models.

### Where are timeouts configured?

Timeout values are stored in the persisted state using the `usePersistedState` hook and can be modified in the settings panel.

## Evaluation

### How does the evaluation system work?

Model responses are sent to the server's evaluation endpoint via the `onChatWindowChanged` function in App.tsx when the 'evaluate' action is triggered.

### How can I add new evaluation metrics?

You need to modify the server-side evaluation handler and update the `EvaluationWindow` component to display new metrics.

### How are evaluation results visualized?

Evaluation results are displayed using ApexCharts in the `EvaluationWindow` component, which shows metrics in various chart formats.

## Custom Messages

### What are custom messages?

Custom messages are pre-defined prompts that can be saved and reused across different models, managed by the `CustomMessageOptions` component.

### How do I modify the custom message interface?

Update the `CustomMessageOptions` component in CustomMessageOptions.tsx to change the UI or add new functionality.

### How are custom messages stored?

Custom messages are stored in the application state and can be included in project exports for persistence.

## Project Files

### How do project imports/exports work?

Projects are exported as JSON files using the `exportChat` function in `useChatOperations` hook and imported via the `importChat` function, which loads chat histories and settings.

### What's included in an exported project?

Exported projects include model information, chat histories, custom messages, and application settings like the system prompt and timeout values.

### How do I customize the project format?

Update the `saveProject` function in `useSaveProject` hook and the corresponding `onProjectLoad` function in App.tsx.

## Styling

### How is the UI styled?

The application uses Mantine UI components with custom styling applied through the component props and global CSS in main.css.

### How do I modify the app's fonts?

Custom fonts are stored in `/public/fonts/` and configured in main.css. Replace font files or update the `@font-face` declarations.

### How do I update the application theme?

Modify the Mantine theme configuration in `main.tsx` or apply styling overrides through component props.

## Server Integration

### How does the client connect to the server?

The client connects to the server URL specified in the `.env` file through Socket.IO, managed by the `socketService`.

### What happens if the server connection is lost?

The `useSocketCheck` hook monitors connection status and displays a loading overlay when disconnected.

### How do I reload adapters in the server?

Use the "Reload Backend" button in the sidebar, which calls the `reloadAdapters` function from the `useReloadBackend` hook.
