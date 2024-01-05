import { Anchor, Badge, Box, Card, Group, Image, Skeleton, Stack, Text } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { useNftJson } from './hooks';
import { AssetWithInscription } from './types';
import { useEnv } from '@/providers/useEnv';

export function NftCard({ nft, isSelected, showLinks }: { nft: AssetWithInscription, isSelected?: boolean, showLinks?: boolean }) {
  const { error, isPending, data: json } = useNftJson(nft);
  const env = useEnv();

  return (
    <Skeleton visible={isPending}>
      <Card shadow="sm" padding="lg" radius="md">
        <Card.Section>
          <Skeleton visible={!!error}>
            <Image
              src={json?.image}
              height={160}
            />
          </Skeleton>
        </Card.Section>
        <Group justify="space-between" mt="md">
          <Text fw={500}>{nft.content.metadata.name}</Text>
        </Group>
        {showLinks &&
          <Stack mt="md" gap="xs" w="100%">

            <Anchor
              href={`https://solscan.io/account/${nft.inscriptionPda[0]}?${env === 'devnet' ? 'cluster=devnet' : ''}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Group justify="space-between">
                <Text>Inscription JSON</Text>
                <IconExternalLink />
              </Group>
            </Anchor>
            <Anchor
              href={`https://solscan.io/account/${nft.imagePda[0]}?${env === 'devnet' ? 'cluster=devnet' : ''}`}
              target="_blank"
              rel="noopener noreferrer"
            >              <Group justify="space-between">
            <Text>Inscription Image</Text>
            <IconExternalLink />
                           </Group>
            </Anchor>
          </Stack>}

      </Card>
      {nft?.pdaExists
        && <Badge
          variant="default"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '0.5rem',

          }}
        >JSON Inscribed
           </Badge>}
      {nft?.imagePdaExists
        && <Badge
          variant="default"
          style={{
            position: 'absolute',
            top: '2.5rem',
            right: '0.5rem',

          }}
        >Image Inscribed
           </Badge>}
      {isSelected && <Box
        pos="absolute"
        style={{
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          borderRadius: 'inherit',
          border: '3px solid #21c297',
        }}
      />}
    </Skeleton>
  );
}
