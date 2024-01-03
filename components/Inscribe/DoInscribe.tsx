import { Button, Center, Container, Loader, Modal, Paper, Progress, Stack, Text, Title } from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';
import pMap from 'p-map';
import { useQueryClient } from '@tanstack/react-query';
import { createShard, findAssociatedInscriptionAccountPda, findInscriptionMetadataPda, findInscriptionShardPda, findMintInscriptionPda, initializeFromMint, safeFetchInscriptionShard, writeData } from '@metaplex-foundation/mpl-inscription';
import Compressor from 'compressorjs';
import { useDisclosure } from '@mantine/hooks';
import { Pda, Umi } from '@metaplex-foundation/umi';
import { DasApiAsset } from '@metaplex-foundation/digital-asset-standard-api';
import { notifications } from '@mantine/notifications';
import { base58 } from '@metaplex-foundation/umi/serializers';
import { useUmi } from '@/providers/useUmi';
import { accountExists } from './hooks';
import { InscriptionSettings } from './ConfigureInscribe';

const sizeOf = require('browser-image-size');

async function fetchIdempotentInscriptionShard(umi: Umi) {
  const number = Math.floor(Math.random() * 32);
  const shardAccount = findInscriptionShardPda(umi, { shardNumber: number });

  // Check if the account has already been created.
  let shardData = await safeFetchInscriptionShard(umi, shardAccount);

  if (!shardData) {
    await createShard(umi, {
      shardAccount,
      shardNumber: 0,
    }).sendAndConfirm(umi);

    // Then an account was created with the correct data.
    shardData = await safeFetchInscriptionShard(umi, shardAccount);
  }

  return shardAccount;
}

const signatureToString = (signature: Uint8Array) => base58.deserialize(signature)[0];

type Calculated = {
  json: any;
  newImage: Blob | File | null;
  nft: DasApiAsset;
  quality: number;
  size: number;
  format: string;
  disabled: boolean;
  inscriptionPda: Pda;
  inscriptionMetadataAccount: Pda;
  imagePda: Pda;
  pdaExists: boolean;
  imagePdaExists: boolean;
};

export function DoInscribe({ inscriptionSettings }: { inscriptionSettings: InscriptionSettings[] }) {
  const [summary, setSummary] = useState<{ calculated: Calculated[], totalSize: number }>();
  const [progress, setProgress] = useState<number>(0);
  const [results, setResults] = useState<string[]>();
  const [opened, { open, close }] = useDisclosure(false);
  const client = useQueryClient();
  const umi = useUmi();

  useEffect(() => {
    const doIt = async () => {
      // we recalculate everything because of collation
      const calculated: Calculated[] = await pMap(inscriptionSettings, async (settings) => {
        const { nft, disabled, format, quality, size } = settings;
        const json = await client.fetchQuery({
          queryKey: ['fetch-nft-json', settings.nft.id],
          queryFn: async () => {
            const j = await (await fetch(nft.content.json_uri)).json();
            return j;
          },
        });

        const image = await client.fetchQuery({
          queryKey: ['fetch-uri-blob', json.image],
          queryFn: async () => {
            const blob = await (await fetch(json.image)).blob();
            return blob;
          },
        });

        const inscriptionData = await client.fetchQuery({
          queryKey: ['fetch-nft-inscription', nft.id],
          queryFn: async () => {
            const inscriptionPda = findMintInscriptionPda(umi, { mint: nft.id });
            const inscriptionMetadataAccount = findInscriptionMetadataPda(umi, { inscriptionAccount: inscriptionPda[0] });
            const imagePda = findAssociatedInscriptionAccountPda(umi, {
              associationTag: 'image',
              inscriptionMetadataAccount: inscriptionMetadataAccount[0],
            });

            const pdaExists = await accountExists(umi, inscriptionPda[0]);
            const imagePdaExists = await accountExists(umi, imagePda[0]);

            return {
              inscriptionPda,
              inscriptionMetadataAccount,
              imagePda,
              pdaExists,
              imagePdaExists,
            };
          },
        });

        let newImage: Blob | File | null = image;
        if (!disabled) {
          // TODO optimize, only download headers
          const { width, height } = await sizeOf(image);
          newImage = await new Promise((resolve, reject) => {
            // eslint-disable-next-line no-new
            new Compressor(image, {
              quality: quality / 100,
              width: width * (size / 100),
              height: height * (size / 100),
              mimeType: format,
              success(result) {
                resolve(result);
              },
              error(err) {
                reject(err);
              },
            });
          });
        }

        return {
          ...inscriptionData,
          ...settings,
          json,
          newImage,
        };
      }, {
        concurrency: 5,
      });

      let size = 0;

      calculated.forEach((c) => {
        if (c.newImage) {
          size += c.newImage.size;
        }
        size += JSON.stringify(c.json).length;
      });

      setSummary({
        calculated,
        totalSize: size,
      }
      );
    };
    doIt();
  }, [inscriptionSettings]);

  const handleInscribe = useCallback(async () => {
    if (!summary) {
      return;
    }
    try {
      open();

      // TODO signAllTransaction
      await pMap(summary.calculated, async (c: Calculated) => {
        // Inscribe the NFT metadata of the new NFT
        const inscribeRes = await initializeFromMint(umi, {
          mintAccount: c.nft.id,
          inscriptionShardAccount: await fetchIdempotentInscriptionShard(umi),
        }).add(writeData(umi, {
          inscriptionAccount: c.inscriptionPda,
          inscriptionMetadataAccount: c.inscriptionMetadataAccount,
          value: Buffer.from(
            // TODO need to chunk this
            JSON.stringify(c.json)
          ),
          associatedTag: null,
          offset: 0,
        })).sendAndConfirm(umi);

        setProgress((p) => p + 1);
        setResults((r) => [...(r || []), signatureToString(inscribeRes.signature)]);
      }, {
        concurrency: 2,
      });
    } catch (e: any) {
      notifications.show({
        title: 'Error inscribing',
        message: e.message,
        color: 'red',
      });
    } finally {
      close();
    }
  }, [inscriptionSettings, setProgress]);

  return (
    <>
      <Container size="sm" mt="lg">
        <Paper p="xl" radius="md">
          <Title order={2}>Summary</Title>
          {!summary ? <Center h="20vh"><Loader /></Center>
            : <Stack mt="md">
              <Text>Number of NFTs to inscribe: <b>{summary.calculated.length}</b></Text>
              <Text>Total Solana rent cost: <b>~{(summary.totalSize * 0.00000696).toFixed(4)} SOL</b></Text>
              <Text>Total Metaplex fees: <b>FREE</b> forever</Text>
              <Center><Button size="lg" onClick={handleInscribe}>Inscribe!</Button></Center>
              </Stack>}
        </Paper>
      </Container>
      <Modal opened={opened} onClose={() => { }} centered withCloseButton={false}>
        <Center my="xl">
          <Stack gap="md" align="center">
            <Title order={3}>Inscribing...</Title>
            <Text>Be prepared to approve many transactions...</Text>
            <Center>
              {summary && <Stack align="center">
                <Progress value={(progress / summary.calculated.length) * 100} />
                <Text>{progress} / {summary.calculated.length}</Text>
                          </Stack>}
            </Center>
          </Stack>
        </Center>
      </Modal>
    </>
  );
}
