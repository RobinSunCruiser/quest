import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
    ...tseslint.config(
        { ignores: ['dist'] },
        {
            extends: [js.configs.recommended, ...tseslint.configs.recommended, 'plugin:react/recommended', 'plugin:@typescript-eslint/recommended'],
            files: ['**/*.{ts,tsx}'],
            languageOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
                globals: {
                    ...globals.browser,
                    node: 'readonly', // Adding node as a global variable
                },
            },
            plugins: {
                'react-hooks': reactHooks,
                'react-refresh': reactRefresh,
                '@typescript-eslint': tseslint,
            },
            rules: {
                'react/prop-types': 'off', // Disable prop-types rule
                '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
                '@typescript-eslint/explicit-module-boundary-types': 'off',
                '@typescript-eslint/no-explicit-any': 'off', // Allow explicit 'any' types
                '@typescript-eslint/no-var-requires': 'off', // Allow require statements
                ...reactHooks.configs.recommended.rules,
                'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            },
            settings: {
                react: {
                    version: 'detect', // Automatically detect the version of React
                },
            },
        }
    ),
    eslintConfigPrettier,
];
