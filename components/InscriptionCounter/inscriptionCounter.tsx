import { Box, NumberFormatter, Text, Title } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pda } from '@metaplex-foundation/umi';
import { fetchAllInscriptionShard, findInscriptionShardPda } from '@metaplex-foundation/mpl-inscription';
import { useInterval } from '@mantine/hooks';
import { useUmi } from '@/providers/useUmi';

import classes from './InscriptionCounter.module.css';

export function InscriptionCounter() {
  const [count, setCount] = useState(0);
  const umi = useUmi();

  const shardKeys: Pda[] = useMemo(() => {
    const k = [];
    for (let shardNumber = 0; shardNumber < 32; shardNumber += 1) {
      k.push(findInscriptionShardPda(umi, { shardNumber }));
    }
    return k;
  }, []);

  const fetchAndUpdate = useCallback(async () => {
    const shards = await fetchAllInscriptionShard(umi, shardKeys);
    let numInscriptions = 0;
    shards.forEach((shard) => {
      const rank = 32 * Number(shard.count) + shard.shardNumber;
      numInscriptions = Math.max(numInscriptions, rank);
    });
    setCount(numInscriptions);
  }, [setCount, shardKeys]);

  const interval = useInterval(() => {
    fetchAndUpdate();
  }, 5000);

  useEffect(() => {
    fetchAndUpdate();
    interval.start();
    return interval.stop;
  }, []);

  return (
    <Box ta="center">
      <Text>Current Inscription Number</Text>
      <Title c="red" fw={900} className={classes.counter}>
        <NumberFormatter value={count} thousandSeparator />
      </Title>
      <Text>Inscribe an NFT to claim your number!</Text>
    </Box>
  );
}
