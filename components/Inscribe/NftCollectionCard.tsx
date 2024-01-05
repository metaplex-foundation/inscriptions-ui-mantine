import { Badge, Box, Card, Group, Image, Skeleton, Text } from '@mantine/core';
import { DasApiAsset } from '@metaplex-foundation/digital-asset-standard-api';
import { useNftJson } from './hooks';

export function NftCollectionCard({ nfts, numSelected }: { nfts: DasApiAsset[], numSelected: number }) {
  // TODO fetch collection NFT
  const { error, isPending, data: json } = useNftJson(nfts[0]);

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
          <Text fw={500}>{nfts[0].content.metadata.name}</Text>
        </Group>

      </Card>
      <Badge
        variant="default"
        style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',

        }}
      >{numSelected}/{nfts.length}
      </Badge>
      <Box
        pos="absolute"
        style={{
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          borderRadius: 'inherit',
          border: numSelected > 0 ? '3px solid #21c297' : 'none',
      }}
      />
    </Skeleton>
  );
}
