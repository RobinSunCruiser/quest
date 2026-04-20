# QUEST Client

## Overview

QUEST (Qualitative Untersuchung und Evaluation von Sprachmodellen Tool) is a platform for interactive testing, comparison, and evaluation of multiple AI language models. The client
provides a user-friendly interface for side-by-side model comparison and evaluation metrics.

## Technologies

This application is built with modern web technologies:

- [React 18](https://react.dev/) - Component-based UI library
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript for improved developer experience
- [Vite](https://vitejs.dev/) - Fast build tooling and development server
- [Mantine UI](https://mantine.dev/) - Modern React component library
- [Socket.IO](https://socket.io/) - Real-time communication with the server
- [ApexCharts](https://apexcharts.com/) - Interactive data visualization

## Features

- Multi-model chat interface for side-by-side comparison
- Real-time model response evaluation and comparison
- Export evaluation metrics as CSV files
- Markdown rendering of model responses
- Project import/export functionality
- Import/export chat histories
- Customizable system prompts

## Installation

### Prerequisites

- Node.js version `18.0` or higher
- npm version `8.0` or higher
- Git (for cloning the repository)

### Setup Steps

1. **Clone the repository**

    ```sh
    git clone https://github.com/robinsuncruiser/quest.git
    cd quest/client
    ```

2. **Configure environment variables**

    ```sh
    cp .env.example .env
    ```

    Edit `.env` to set the server URL. Default is `http://localhost:3000`:

    ```
    VITE_SERVER_BASE_URL=http://localhost:3000
    ```

3. **Install dependencies**

    ```sh
    npm install
    ```

4. **Start the development server**
    ```sh
    npm run dev
    ```
    The application will be available at `http://localhost:5173`

## Build for Production

```sh
npm run build
```

This creates a `dist` directory with optimized production files.

## Development

### Available Commands

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run build-noemit` - Build without emitting TypeScript files
- `npm run lint` - Run ESLint to check code quality
- `npm run preview` - Preview the production build locally

### Project Structure

```
client/
├── public/             # Static assets served as-is
│   └── fonts/          # Custom web fonts
├── src/
│   ├── components/     # React components
│   │   ├── aside/      # Sidebar components
│   │   ├── authentication/  # Login components
│   │   ├── evaluation/ # Evaluation metrics UI
│   │   └── main/       # Main chat interface
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API and socket services
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Root application component
│   ├── main.tsx        # Application entry point
│   └── main.css        # Global styles
└── ...
```

### Recommended VS Code Extensions

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [ES7+ React Snippets](https://marketplace.visualstudio.com/items?itemName=dsznajder.es7-react-js-snippets)

## Deployment

For full deployment instructions, please refer to the [main project README](../README.md#roduction-build--deployment).

In brief:

1. Build the client (`npm run build` in this directory)
2. Build the server (`npm run build` in the server directory)
3. Client files are automatically copied to the server's dist directory
4. Run the production server (`npm run start`)
5. Alternatively, copy the `dist` directory to your production server

## Configuration Options

### Custom Fonts

The application uses custom fonts:

- Orbitron (for branding and headings)
- Audiowide (for accent text)

Font files are stored in `/public/fonts/` and imported in main.css.

### Timeout Settings

Request timeouts can be configured in the application settings panel. Default is 60 seconds.

## Server Integration

The client connects to a QUEST server which must be properly configured:

- See the Server Configuration Guide for setting up LLM adapters
- Default server port is 3000 (configurable in server settings)
- Ensure server is running before connecting the client

### Server Configuration

For detailed setup instructions of the QUEST server, see [Server Configuration Documentation](../server/src/file/Configuration.md).

## Evaluation System

QUEST includes a comprehensive evaluation system for comparing model responses:

- Multi-metric analysis with cosine similarity, Levenshtein distance, and Jaccard similarity
- Side-by-side visualization of metrics

For more detailed information about the evaluation system, metrics, and methodology, please refer to the
[Server Evaluation Documentation](../server/src/socket/handlers/Evaluation.md).

## Authentication

The client requires authentication to connect to the server:

1. Enter your username and password on the login screen
2. Authentication is handled via secure token exchange
3. Token is stored in browser storage for session persistence
4. User accounts are configured in the server's configuration file

For detailed setup instructions of the Authentication, see [Server Configuration Documentation](../server/src/file/Configuration.md).

## Troubleshooting

### Common Issues

1. **Cannot connect to server**

    - Verify the server is running
    - Check `VITE_SERVER_BASE_URL` in your `.env` file

2. **Authentication failures**

    - Ensure user credentials are set up in the server configuration
    - Default credentials are `user` / `user`

3. **Models not loading**
    - Verify that the adapters are correctly configured on the server
    - Check server logs for adapter initialization errors

## License and Credits

The tool was created by Felix Gratzkowski under the scientific supervision of Dr. rer. nat. Sebastian Bader and Dr.-Ing. Robin Nicolay at the University of Rostock.

This project was developed as part of the KI-Med Collaboration Platform (KiMeKo) project for the comparative analysis of AI models. It is funded by the BMBF (funding code
01IS24056D) and aims to accelerate the development of AI-based medical products. It is part of a northern German ecosystem that brings together research institutions, clinics and
companies to drive forward innovative solutions in the field of medical technology.

This work is licensed under the
[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/).

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

## Contributing

For developers wishing to contribute to the project:

1. Follow the TypeScript style guide and code conventions
2. Write JSDoc comments for new functions and components
3. Submit pull requests with meaningful descriptions
