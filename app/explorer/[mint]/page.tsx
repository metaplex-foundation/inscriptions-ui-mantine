'use client';

import { Center, Container, Loader, Text } from '@mantine/core';
import { publicKey } from '@metaplex-foundation/umi';
import { useQuery } from '@tanstack/react-query';
import { Explorer } from '@/components/Explorer/Explorer';
import { useUmi } from '@/providers/useUmi';

export default function ExplorerPage({ params }: { params: { mint: string } }) {
  const umi = useUmi();
  const { mint } = params;
  const { error, isPending, data: nft } = useQuery({
    retry: false,
    refetchOnMount: true,
    queryKey: ['fetch-nft', mint],
    queryFn: async () => umi.rpc.getAsset(publicKey(mint)),
  });
  return (
    <Container size="xl" pb="xl">
      {isPending &&
        <Center h="20vh">
          <Loader />
        </Center>
      }
      {error &&
      <Center h="20vh">
        <Text>NFT does not exist</Text>
      </Center>}
      {nft && <Explorer nft={nft} />}
    </Container>);
}
