import { Badge, Card, Group, Image, Skeleton, Text } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { AssetWithInscription } from '../Inscribe/types';
import { useNftJson } from '../Inscribe/hooks';

import classes from './ExplorerNftCard.module.css';

export function ExplorerNftCard({ nft }: { nft: Omit<AssetWithInscription, 'pdaExists' | 'imagePdaExists'> }) {
  const { error, isPending, data: json } = useNftJson(nft);
  const router = useRouter();

  return (
    <Skeleton
      visible={isPending}
      className={classes.cardContainer}
      onClick={() => {
        router.push(`/explorer/${nft.id}`);
      }}
    >
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
      {nft?.metadata
        && <Badge
          variant="default"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '0.5rem',

          }}
        >#{nft.metadata.inscriptionRank.toString()!}
           </Badge>}
    </Skeleton>
  );
}
