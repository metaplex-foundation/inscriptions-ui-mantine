'use client';

import { Box, Center, Container, Paper, Text, Title } from '@mantine/core';
import { useWallet } from '@solana/wallet-adapter-react';
import { ExplorerLanding } from '@/components/Explorer/ExplorerLanding';
import { ExplorerRecent } from '@/components/Explorer/ExplorerRecent';

export default function ExplorerPage() {
  const wallet = useWallet();
  return (
    <Container size="xl" pb="xl">
      {wallet.connected ? <ExplorerLanding /> :
        <>
        <Title mt="xl" mb="lg">Your Inscriptions</Title>
        <Container size="sm">
          <Paper mt="xl">
            <Center h="20vh">
              <Text>Connect your wallet to see your inscriptions.</Text>
            </Center>
          </Paper>
        </Container>
        </>
      }
      <Box mt="xl">
        <ExplorerRecent />
      </Box>
    </Container>);
}
