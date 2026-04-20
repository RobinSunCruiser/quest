/**
 * @module Components.Authentication.AuthForm
 *
 * Authentication form component with username/password login functionality.
 * Provides a clean, accessible login interface with validation and error handling.
 *
 * @example
 * ```tsx
 * import { AuthForm } from './AuthForm';
 *
 * const handleLogin = async (username: string, password: string) => {
 *     const response = await api.login(username, password);
 *     setAuthToken(response.token);
 * };
 *
 * <AuthForm
 *     isLoading={isAuthenticating}
 *     error={authError}
 *     login={handleLogin}
 * />
 * ```
 */

import { Alert, Button, Center, Group, Overlay, Paper, PasswordInput, Stack, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { FaTriangleExclamation } from 'react-icons/fa6';

/**
 * Props for the AuthForm component.
 */
export interface AuthFormProps {
    /** Loading state of the authentication process */
    isLoading: boolean;
    /** Error message to display, null if no error */
    error: string | null;
    /** Callback function to handle login */
    login: (username: string, password: string) => Promise<void>;
}

/**
 * Authentication form component with username and password fields.
 */
export const AuthForm: React.FC<AuthFormProps> = ({ isLoading, error, login }) => {
    const form = useForm({
        mode: 'controlled',
        initialValues: {
            username: '',
            password: '',
        },
        validate: {
            username: (value) => (value.length > 0 ? null : 'Username is required'),
            password: (value) => (value.length > 0 ? null : 'Password is required'),
        },
    });

    /**
     * Handles form submission.
     */
    const handleSubmit = async (values: { username: string; password: string }) => {
        if (isLoading) return;

        try {
            await login(values.username, values.password);
        } catch (error) {
            console.error('Login error:', error);
        }

        form.reset();
    };

    return (
        <Overlay blur={5}>
            <Center w={'100%'} h={'90%'} data-testid="auth-form">
                <Paper p="md" w="400" m="auto" radius="lg" shadow="md">
                    <Stack>
                        <Title order={2} ta="center">
                            Login
                        </Title>

                        {error && (
                            <Alert icon={<FaTriangleExclamation size="1rem" />} title="Authentication Error" color="red" variant="light" data-testid="auth-error-alert">
                                {error}
                            </Alert>
                        )}

                        <form onSubmit={form.onSubmit(handleSubmit)} aria-label="Login form">
                            <TextInput
                                withAsterisk
                                label="Username"
                                placeholder="Enter your username"
                                key={form.key('username')}
                                {...form.getInputProps('username')}
                                aria-required="true"
                                data-testid="username-input"
                                mb="md"
                            />

                            <PasswordInput
                                withAsterisk
                                label="Password"
                                placeholder="Enter your password"
                                key={form.key('password')}
                                {...form.getInputProps('password')}
                                aria-required="true"
                                data-testid="password-input"
                                mb="md"
                            />

                            <Group mt="lg">
                                <Button type="submit" loading={isLoading} data-testid="login-button" fullWidth disabled={isLoading}>
                                    {isLoading ? 'Logging in...' : 'Login'}
                                </Button>
                            </Group>
                        </form>
                    </Stack>
                </Paper>
            </Center>
        </Overlay>
    );
};
