import React from 'react';

import { AppLayout } from './components/layout';

import { AuthForm } from '@/components/authentication';
import { useSocketCheck } from './hooks/useSocketCheck';
import { LoadingOverlay, Paper, Stack, Text } from '@mantine/core';
import { LuServerOff } from 'react-icons/lu';
import { useAuthentication } from './hooks';

const App: React.FC = () => {
    const { isConnected: isSocketConnected, error: connectionError } = useSocketCheck();
    const { isLoading, login, error: authError, isAuthenticated } = useAuthentication({ isSocketConnected });

    return (
        <>
            <LoadingOverlay
                visible={!isSocketConnected}
                loaderProps={{
                    children: (
                        <Paper withBorder>
                            <Stack align="center" justify="center" gap="md" w={'20rem'} h={'20rem'} p={'lg'} bg="white">
                                <LuServerOff size={80} color="#24292E" />
                                <Text fw={600}>{'Server not reachable'}</Text>
                                {connectionError && <Text c="red">{String(connectionError)}</Text>}
                            </Stack>
                        </Paper>
                    ),
                }}
            />
            {!isAuthenticated ? <AuthForm isLoading={isLoading} error={authError} login={login} /> : <AppLayout />}
        </>
    );
};

export default App;
