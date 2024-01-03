'use client';

import { Center, Container, Text } from '@mantine/core';
import { useWallet } from '@solana/wallet-adapter-react';
import { Inscribe } from '@/components/Inscribe/Inscribe';

export default function () {
  const wallet = useWallet();

  return (
  <Container size="lg" pb="xl">
    {wallet.connected ? <Inscribe /> : <Center h="50vh"><Text>Connect your wallet to begin</Text></Center>}
  </Container>);
}
