import { Button, Center, Container, Loader, Modal, Paper, Progress, Stack, Text, Title } from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';
import pMap from 'p-map';
import { useQueryClient } from '@tanstack/react-query';
import { allocate, createShard, findAssociatedInscriptionAccountPda, findInscriptionMetadataPda, findInscriptionShardPda, findMintInscriptionPda, initializeAssociatedInscription, initializeFromMint, safeFetchInscriptionShard, writeData } from '@metaplex-foundation/mpl-inscription';
import Compressor from 'compressorjs';
import { useDisclosure } from '@mantine/hooks';
import { Pda, Transaction, TransactionBuilder, TransactionBuilderGroup, Umi, signAllTransactions } from '@metaplex-foundation/umi';
import { DasApiAsset } from '@metaplex-foundation/digital-asset-standard-api';
import { notifications } from '@mantine/notifications';
import { base58 } from '@metaplex-foundation/umi/serializers';
import { useUmi } from '@/providers/useUmi';
import { InscriptionSettings } from './ConfigureInscribe';
import { useEnv } from '@/providers/useEnv';

const MAX_PERMITTED_DATA_INCREASE = 10_240;
const sizeOf = require('browser-image-size');

async function fetchIdempotentInscriptionShard(umi: Umi, number = Math.floor(Math.random() * 32)) {
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
  jsonLength: number;
  newImage?: Blob | File;
  nft: DasApiAsset;
  quality: number;
  size: number;
  format: string;
  inscriptionPda: Pda;
  inscriptionMetadataAccount: Pda;
  imagePda: Pda;
  // pdaExists: boolean;
  // imagePdaExists: boolean;
};

export function DoInscribe({ inscriptionSettings, onComplete }: { inscriptionSettings: InscriptionSettings[], onComplete: (txs: string[]) => void }) {
  const env = useEnv();
  const [summary, setSummary] = useState<{ calculated: Calculated[], totalSize: number }>();
  const [progress, setProgress] = useState<number>(0);
  const [maxProgress, setMaxProgress] = useState<number>(0);
  const [opened, { open, close }] = useDisclosure(false);
  const client = useQueryClient();
  const umi = useUmi();

  useEffect(() => {
    const doIt = async () => {
      // we recalculate everything because of collation
      const calculated: Calculated[] = await pMap(inscriptionSettings, async (settings) => {
        const { nft, format, quality, size, imageType, jsonOverride, imageOverride } = settings;

        let json = jsonOverride;
        if (!json) {
          json = await client.fetchQuery({
            queryKey: ['fetch-nft-json', settings.nft.id],
            queryFn: async () => {
              const j = await (await fetch(nft.content.json_uri)).json();
              return j;
            },
          });
        }

        let image = imageOverride;
        if (imageType === 'Raw' || imageType === 'Compress') {
          image = await client.fetchQuery({
            queryKey: ['fetch-uri-blob', json.image],
            queryFn: async () => {
              const blob = await (await fetch(json.image)).blob();
              return blob;
            },
          });
        }

        const inscriptionData = await client.fetchQuery({
          queryKey: ['fetch-nft-inscription', env, nft.id],
          queryFn: async () => {
            const inscriptionPda = findMintInscriptionPda(umi, { mint: nft.id });
            const inscriptionMetadataAccount = findInscriptionMetadataPda(umi, { inscriptionAccount: inscriptionPda[0] });
            const imagePda = findAssociatedInscriptionAccountPda(umi, {
              associationTag: 'image',
              inscriptionMetadataAccount: inscriptionMetadataAccount[0],
            });

            // const pdaExists = await accountExists(umi, inscriptionPda[0]);
            // const imagePdaExists = await accountExists(umi, imagePda[0]);

            return {
              inscriptionPda,
              inscriptionMetadataAccount,
              imagePda,
              // pdaExists,
              // imagePdaExists,
            };
          },
        });

        if (image && imageType === 'Compress') {
          // TODO optimize, only download headers
          const { width, height } = await sizeOf(image);
          image = await new Promise((resolve, reject) => {
            // eslint-disable-next-line no-new
            new Compressor(image as Blob, {
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
          json,
          jsonLength: JSON.stringify(json).length,
          newImage: image,
          quality,
          size,
          nft,
          format,
        };
      }, {
        concurrency: 5,
      });

      let size = 0;

      calculated.forEach((c) => {
        if (c.newImage) {
          size += c.newImage.size;
        }
        size += c.jsonLength;
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
      setProgress(0);

      // TODO remove this because we don't need it
      const shardAccounts = await Promise.all([...Array(32)].map((_, i) => fetchIdempotentInscriptionShard(umi, i)));

      const randomShard = () => shardAccounts[Math.floor(Math.random() * shardAccounts.length)];
      let setupBuilder = new TransactionBuilder();
      let dataBuilder = new TransactionBuilder();
      const chunkSize = 800;
      const imageDatas = (await Promise.all(summary.calculated.map((c) => c.newImage?.arrayBuffer()))).map((b) => b ? new Uint8Array(b) : null);
      const enc = new TextEncoder();

      // TODO skip the inits if they already exist

      summary.calculated.forEach((c, index) => {
        console.log('initializing', c.nft.id);

        setupBuilder = setupBuilder
          .add(initializeFromMint(umi, {
            mintAccount: c.nft.id,
            inscriptionShardAccount: randomShard(),
          }))
          .add(allocate(umi, {
            inscriptionAccount: c.inscriptionPda[0],
            inscriptionMetadataAccount: c.inscriptionMetadataAccount,
            associatedTag: null,
            targetSize: c.jsonLength,
          }));

        if (c.newImage) {
          setupBuilder = setupBuilder
            .add(initializeAssociatedInscription(umi, {
              inscriptionAccount: c.inscriptionPda[0],
              associationTag: 'image',
              inscriptionMetadataAccount: c.inscriptionMetadataAccount,
            }));

          // we need to call allocate multiple times because Solana accounts can only be allocated at most 10k at a time
          const numAllocates = Math.ceil(c.newImage.size / MAX_PERMITTED_DATA_INCREASE);
          for (let j = 0; j < numAllocates; j += 1) {
            setupBuilder = setupBuilder.add(allocate(umi, {
              inscriptionAccount: c.imagePda,
              inscriptionMetadataAccount: c.inscriptionMetadataAccount,
              associatedTag: 'image',
              targetSize: c.newImage.size,
            }));
          }

          const imageData = imageDatas[index] as Uint8Array;
          let i = 0;
          let chunks = 0;
          while (i < imageData.length) {
            dataBuilder = dataBuilder.add(writeData(umi, {
              inscriptionAccount: c.imagePda,
              inscriptionMetadataAccount: c.inscriptionMetadataAccount,
              value: imageData.slice(i, i + chunkSize),
              associatedTag: 'image',
              offset: i,
            }));
            i += chunkSize;
            chunks += 1;
          }
          console.log('image chunks', chunks);
        }

        const jsonData = enc.encode(JSON.stringify(c.json));
        let i = 0;
        let chunks = 0;
        while (i < jsonData.length) {
          dataBuilder = dataBuilder.add(writeData(umi, {
            inscriptionAccount: c.inscriptionPda[0],
            inscriptionMetadataAccount: c.inscriptionMetadataAccount,
            value: jsonData.slice(i, i + chunkSize),
            associatedTag: null,
            offset: i,
          }));
          i += chunkSize;
          chunks += 1;
        }
        console.log('json chunks', chunks);
      });

      console.log('data ix length', dataBuilder.getInstructions().length);

      const split = setupBuilder.unsafeSplitByTransactionSize(umi);
      console.log('setup tx length', split.length);
      const dataSplit = dataBuilder.unsafeSplitByTransactionSize(umi);
      console.log('data tx length', dataSplit.length);
      setMaxProgress(split.length + dataSplit.length);

      const setupTxs = (await new TransactionBuilderGroup(split).setLatestBlockhash(umi)).build(umi);

      const signedTxs = await signAllTransactions(setupTxs.map((tx => ({
        transaction: tx,
        signers: [umi.identity],
      }))));

      let txsToSend = [...signedTxs];
      const results: string[] = [];
      let retries = 3;

      do {
        const errors: Transaction[] = [];
        // eslint-disable-next-line no-await-in-loop
        await pMap(txsToSend, async (tx) => {
          try {
            const res = await umi.rpc.sendTransaction(tx, {
              commitment: 'finalized',
            });
            const sig = signatureToString(res);
            console.log('signature', sig);

            setProgress((p) => p + 1);
            results.push(sig);
          } catch (e) {
            console.log(e);
            errors.push(tx);
          }
        }, {
          concurrency: 2,
        });
        txsToSend = errors;
        retries -= 1;
      } while (txsToSend.length && retries >= 0);

      if (txsToSend.length) {
        throw new Error('Setup transactions failed to confirm successfully');
      }

      const dataTxs = (await new TransactionBuilderGroup(dataSplit).setLatestBlockhash(umi)).build(umi);

      console.log('data', summary.calculated);

      const signedDataTxs = await signAllTransactions(dataTxs.map((tx => ({
        transaction: tx,
        signers: [umi.identity],
      }))));

      txsToSend = [...signedTxs];
      retries = 3;

      do {
        const errors: Transaction[] = [];
        // eslint-disable-next-line no-await-in-loop
        await pMap(signedDataTxs, async (tx) => {
          try {
            const res = await umi.rpc.sendTransaction(tx);
            const sig = signatureToString(res);
            console.log('signature', sig);

            setProgress((p) => p + 1);
            results.push(sig);
          } catch (e) {
            console.log(e);
            errors.push(tx);
            throw e;
          }
        }, {
          concurrency: 2,
        });
        txsToSend = errors;
        retries -= 1;
      } while (txsToSend.length && retries >= 0);

      if (txsToSend.length) {
        throw new Error('Write data transactions failed to confirm successfully');
      }

      onComplete(results);
    } catch (e: any) {
      console.log(e);
      notifications.show({
        title: 'Error inscribing',
        message: e.message,
        color: 'red',
      });
    } finally {
      close();
    }
  }, [summary, inscriptionSettings, setProgress, setMaxProgress, open, close, umi, onComplete]);

  return (
    <>
      <Container size="sm" mt="lg">
        <Paper p="xl" radius="md">
          <Title order={2}>Summary</Title>
          {!summary ? <Center h="20vh"><Loader /></Center> :
            <Stack mt="md">
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
            <Center w="100%">
              {summary &&
                <Stack w="100%">
                  <Progress value={(progress / maxProgress) * 100} animated />
                  <Text ta="center">{progress} / {maxProgress}</Text>
                </Stack>}
            </Center>
          </Stack>
        </Center>
      </Modal>
    </>
  );
}
