import { Text } from '@mantine/core';
import { useInterval } from 'use-interval';
import { useState } from 'react';
import { Pda } from '@metaplex-foundation/umi';
import { fetchAllInscriptionShard, findInscriptionShardPda } from '@metaplex-foundation/mpl-inscription';
import { useUmi } from '@/providers/useUmi';

export function InscriptionCounter() {
    const [count, setCount] = useState(0);
    const umi = useUmi();

    const shardKeys: Pda[] = [];
    for (let shardNumber = 0; shardNumber < 32; shardNumber += 1) {
        shardKeys.push(findInscriptionShardPda(umi, { shardNumber }));
    }

    useInterval(() => {
        const fetchAndUpdate = async () => {
            const shards = await fetchAllInscriptionShard(umi, shardKeys);
            let numInscriptions = 0;
            shards.forEach((shard) => {
                const rank = 32 * Number(shard.count) + shard.shardNumber;
                numInscriptions = Math.max(numInscriptions, rank);
            });
            setCount(numInscriptions);
        };
        fetchAndUpdate();
        setCount(count + 1);
    }, 10000);

    return (
        <div>
            <Text c="red" ta="right" fw={700}>{count}</Text>
            <Text>Inscriptions</Text>
        </div>
    );
}
