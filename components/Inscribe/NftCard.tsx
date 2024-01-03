import { Box, Card, Group, Image, Skeleton, Text } from '@mantine/core';
import { DasApiAsset } from '@metaplex-foundation/digital-asset-standard-api';
import { useNftJson } from './hooks';

export function NftCard({ nft, isSelected }: { nft: DasApiAsset, isSelected?: boolean }) {
  const { error, isPending, data: json } = useNftJson(nft);

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

      </Card>
      <Box
        pos="absolute"
        style={{
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          borderRadius: 'inherit',
          border: isSelected ? '3px solid #21c297' : 'none',
      }}
      />
    </Skeleton>
  );
}
