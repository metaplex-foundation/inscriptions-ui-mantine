import { useQuery } from '@tanstack/react-query';
import { deserializeInscriptionMetadata, findAssociatedInscriptionAccountPda, findInscriptionMetadataPda, findMintInscriptionPda } from '@metaplex-foundation/mpl-inscription';
import { Box, Center, Loader, SimpleGrid, Text, Title } from '@mantine/core';
import { useUmi } from '@/providers/useUmi';
import { InscriptionInfo } from '../Inscribe/types';
import { useEnv } from '@/providers/useEnv';
import { ExplorerNftCard } from './ExplorerNftCard';
import { ExplorerRecent } from './ExplorerRecent';

export function ExplorerLanding() {
  const umi = useUmi();
  const env = useEnv();

  const { error, isPending, data: nfts } = useQuery({
    queryKey: ['fetch-inscriptions', env, umi.identity.publicKey],
    queryFn: async () => {
      const assets = await umi.rpc.getAssetsByOwner({ owner: umi.identity.publicKey });
      const infos: Pick<InscriptionInfo, 'inscriptionPda' | 'inscriptionMetadataAccount' | 'imagePda'>[] = assets.items.map((nft) => {
        const inscriptionPda = findMintInscriptionPda(umi, { mint: nft.id });
        const inscriptionMetadataAccount = findInscriptionMetadataPda(umi, { inscriptionAccount: inscriptionPda[0] });
        const imagePda = findAssociatedInscriptionAccountPda(umi, {
          associationTag: 'image',
          inscriptionMetadataAccount: inscriptionMetadataAccount[0],
        });

        return {
          inscriptionPda,
          inscriptionMetadataAccount,
          imagePda,
        };
      });

      const inscriptionMetadataAccounts = await umi.rpc.getAccounts(infos.map((info) => info.inscriptionMetadataAccount[0]), {
        commitment: 'confirmed',
      });

      const inscriptionMetadata = inscriptionMetadataAccounts.map((account) => {
        if (!account.exists) {
          return undefined;
        }
        try {
          return deserializeInscriptionMetadata(account);
        } catch (e) {
          console.error('deserialize error', e);
        }
        return undefined;
      });

      const result = infos.map((info, i) => ({
        ...assets.items[i],
        ...info,
        metadata: inscriptionMetadata[i],
      }))
        .filter((nft) => nft.metadata)
        .sort((a, b) => {
          const aRank = a.metadata?.inscriptionRank || BigInt(0);
          const bRank = b.metadata?.inscriptionRank || BigInt(0);

          if (aRank > bRank) {
            return 1;
          }
          if (aRank < bRank) {
            return -1;
          }
          return 0;
        });

      return result;
    },
  });

  return (
    <Box mt="xl">
      <Title mb="lg">Your Inscriptions</Title>
      {isPending ? <Center h="20vh"><Loader /></Center> :
        error ? <Center h="20vh" ta="center"><Text>There was an error fetching your Inscriptions.</Text></Center> : nfts?.length ?
          <SimpleGrid
            cols={{
              base: 1,
              sm: 2,
              lg: 5,
              xl: 6,
            }}
          >
            {nfts?.map((nft) => <ExplorerNftCard nft={nft} key={nft.id} />)}
          </SimpleGrid> : <Center h="20vh" ta="center"><Text>You don&apos;t have any Inscriptions.</Text></Center>}

      <Box mt="xl">
        <ExplorerRecent />
      </Box>
    </Box>
  );
}
