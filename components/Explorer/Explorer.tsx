import { DasApiAsset } from '@metaplex-foundation/digital-asset-standard-api';
import { Paper, SimpleGrid } from '@mantine/core';

import { ExplorerNftDetails } from './ExplorerNftDetails';
import { ExplorerInscriptionDetails } from './ExplorerInscriptionDetails';

export function Explorer({ nft }: { nft: DasApiAsset }) {
  return (
    <SimpleGrid cols={2} mt="xl" spacing="lg" pb="xl">
      <Paper p="xl" radius="md">
        <ExplorerNftDetails nft={nft} />
      </Paper>
      <Paper p="xl" radius="md">
        <ExplorerInscriptionDetails nft={nft} />
      </Paper>
    </SimpleGrid>
  );
}
