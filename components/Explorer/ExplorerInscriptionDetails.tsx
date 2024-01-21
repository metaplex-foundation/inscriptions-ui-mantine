import { Badge, Center, Group, Image, Loader, Stack, Text, Title } from '@mantine/core';
import { DasApiAsset } from '@metaplex-foundation/digital-asset-standard-api';
import { CodeHighlightTabs } from '@mantine/code-highlight';
import { useNftInscription } from '../Inscribe/hooks';
import { ExplorerStat } from './ExplorerStat';

export function ExplorerInscriptionDetails({ nft }: { nft: DasApiAsset }) {
  const inscriptionInfo = useNftInscription(nft, { fetchImage: true, fetchMetadata: true, fetchJson: true });
  return (
    <Stack>
      <Text fz="md" tt="uppercase" fw={700} c="dimmed">Inscription Details</Text>
      {inscriptionInfo.isPending ? <Center h="20vh"><Loader /></Center> :
        inscriptionInfo.error || !inscriptionInfo?.data.metadataPdaExists ? <Center h="20vh"><Text>NFT is not inscribed</Text></Center>
          :
          <>
            <Title>
              #{inscriptionInfo.data?.metadata?.inscriptionRank.toString()!}
            </Title>
            {inscriptionInfo.data?.image &&
              <>
                <Text fz="xs" tt="uppercase" fw={700} c="dimmed">Inscribed Image</Text>
                <Image src={URL.createObjectURL(inscriptionInfo.data?.image)} maw={320} />

              </>}
            <ExplorerStat
              label="Inscription address (JSON)"
              value={inscriptionInfo.data?.inscriptionPda[0]!}
              copyable
            />
            <ExplorerStat
              label="Inscription metadata address"
              value={inscriptionInfo.data?.inscriptionMetadataAccount[0]!}
              copyable
            />
            {inscriptionInfo.data?.imagePdaExists && <ExplorerStat
              label="Inscription image address"
              value={inscriptionInfo.data?.imagePda[0]!}
              copyable
            />}
            {inscriptionInfo.data?.metadata &&
              <>
                <Group gap="xs">
                  <Text fz="xs" tt="uppercase" fw={700} c="dimmed">Inscribed JSON</Text>
                  {!inscriptionInfo.data?.jsonValid && <Badge color="red" variant="light">Invalid JSON</Badge>}
                </Group>
                <CodeHighlightTabs
                  withExpandButton
                  expandCodeLabel="Show full JSON"
                  collapseCodeLabel="Show less"
                  defaultExpanded={false}
                  mb="lg"
                  code={[{
                    fileName: 'inscribed.json',
                    language: 'json',
                    code: JSON.stringify(inscriptionInfo.data?.json, null, 2),
                  }]}
                />
              </>}
          </>
      }
    </Stack>
  );
}
