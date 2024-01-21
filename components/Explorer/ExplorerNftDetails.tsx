import { Center, Image, Loader, Stack, Text, Title } from '@mantine/core';
import { DasApiAsset } from '@metaplex-foundation/digital-asset-standard-api';
import { CodeHighlightTabs } from '@mantine/code-highlight';
import { useNftJson } from '../Inscribe/hooks';
import { ExplorerStat } from './ExplorerStat';

export function ExplorerNftDetails({ nft }: { nft: DasApiAsset }) {
  const jsonInfo = useNftJson(nft);
  return (
    <Stack>
      <Text fz="md" tt="uppercase" fw={700} c="dimmed">NFT Details</Text>
      {jsonInfo.isPending ? <Center h="20vh"><Loader /></Center> :
        <>
          <Title>{jsonInfo.data.name}</Title>

          <Image src={jsonInfo.data.image} maw={320} />
          {jsonInfo.data.description && <ExplorerStat
            label="Description"
            value={jsonInfo.data.description}
          />}
          <ExplorerStat
            label="Mint"
            value={nft.id}
            copyable
          />

          <Text fz="xs" tt="uppercase" fw={700} c="dimmed">JSON Metadata</Text>
          <CodeHighlightTabs
            withExpandButton
            expandCodeLabel="Show full JSON"
            collapseCodeLabel="Show less"
            defaultExpanded={false}
            mb="lg"
            code={[{
              fileName: 'metadata.json',
              language: 'json',
              code: JSON.stringify(jsonInfo.data, null, 2),
            }]}
          />
        </>}

    </Stack>
  );
}
