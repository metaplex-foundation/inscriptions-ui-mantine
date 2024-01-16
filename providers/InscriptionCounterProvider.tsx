import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { Pda } from '@metaplex-foundation/umi';
import { fetchAllInscriptionShard, findInscriptionShardPda } from '@metaplex-foundation/mpl-inscription';
import { useInterval } from '@mantine/hooks';
import { useUmi } from './useUmi';
import { InscriptionCounterContext } from './useInscriptionCounter';

export const InscriptionCounterProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
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
  }, [setCount, shardKeys, umi]);

  const interval = useInterval(() => {
    fetchAndUpdate();
  }, 5000);

  useEffect(() => {
    fetchAndUpdate();
    interval.start();
    return interval.stop;
  }, [fetchAndUpdate]);

 return <InscriptionCounterContext.Provider value={{ count }}>{children}</InscriptionCounterContext.Provider>;
};
