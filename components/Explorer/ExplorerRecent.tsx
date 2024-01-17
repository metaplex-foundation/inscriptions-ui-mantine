import { Center, Loader, SimpleGrid, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { fetchAllInscriptionMetadata } from '@metaplex-foundation/mpl-inscription';
import { useEnv } from '@/providers/useEnv';
import { ExplorerNftCard } from './ExplorerNftCard';

export function ExplorerRecent() {
  const env = useEnv();
  const { error, isPending, data: nfts } = useQuery({
    queryKey: ['fetch-recent-inscriptions', env],
    queryFn: async () => [],
  });

  return (
    <>
      <Title mb="lg">Recent Inscriptions</Title>
      <Center h="20vh"><Text>Coming soon...</Text></Center>
      {/* {isPending && <Center h="20vh"><Loader /></Center> :
      (error || nfts?.length === 0) ? <Center h="20vh" ta="center"><Text>Unable to fetch recent Inscriptions.</Text></Center> :
        <SimpleGrid
          cols={{
            xs: 1,
            sm: 2,
            lg: 3,
          }}
          spacing="lg"
          pb="xl"
        >
          {nfts?.map((nft) => (
          <ExplorerNftCard key={nft.id} nft={nft} />
          ))}
        </SimpleGrid>} */}
    </>
  );
}
