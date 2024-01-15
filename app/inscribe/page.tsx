'use client';

import { Center, Container, Paper, Text } from '@mantine/core';
import { useWallet } from '@solana/wallet-adapter-react';
import { Inscribe } from '@/components/Inscribe/Inscribe';

export default function () {
  const wallet = useWallet();

  return (
    <Container size="xl" pb="xl">
      {wallet.connected ? <Inscribe /> :
        <Container size="sm">
          <Paper mt="xl">
            <Center h="20vh">
              <Text>Connect your wallet to begin.</Text>
            </Center>
          </Paper>
        </Container>
      }
    </Container>);
}
