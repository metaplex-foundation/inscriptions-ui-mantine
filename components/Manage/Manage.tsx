import { DasApiAsset } from '@metaplex-foundation/digital-asset-standard-api';
import { Button, Center, Image, JsonInput, Loader, Modal, Paper, Progress, SimpleGrid, Stack, Text, Title } from '@mantine/core';

import { CodeHighlightTabs } from '@mantine/code-highlight';

import { useCallback, useEffect, useState } from 'react';
import { TransactionBuilder, TransactionBuilderGroup, signAllTransactions } from '@metaplex-foundation/umi';
import { clearData, writeData } from '@metaplex-foundation/mpl-inscription';
import { base58 } from '@metaplex-foundation/umi/serializers';
import pMap from 'p-map';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useNftInscription, useNftJson } from '../Inscribe/hooks';
import { ManageStat } from './ManageStat';
import { useUmi } from '@/providers/useUmi';

const signatureToString = (signature: Uint8Array) => base58.deserialize(signature)[0];

export function Manage({ nft }: { nft: DasApiAsset }) {
  const inscriptionInfo = useNftInscription(nft, { fetchImage: true, fetchMetadata: true, fetchJson: true });
  const jsonInfo = useNftJson(nft);
  const [newJson, setNewJson] = useState<string>(inscriptionInfo.data?.json || '');
  const umi = useUmi();
  const [progress, setProgress] = useState<number>(0);
  const [maxProgress, setMaxProgress] = useState<number>(0);
  const [opened, { open, close }] = useDisclosure(false);

  const handleWriteData = useCallback(async () => {
    if (!inscriptionInfo.data) {
      console.log('no inscription info');
    } else {
      try {
        open();
        setProgress(0);
        let dataBuilder = clearData(umi, {
          inscriptionAccount: inscriptionInfo.data.inscriptionPda[0],
          inscriptionMetadataAccount: inscriptionInfo.data.inscriptionMetadataAccount,
          associatedTag: null,
        });
        const chunkSize = 800;
        const enc = new TextEncoder();

        console.log('new json', newJson);
        const jsonData = enc.encode(newJson);
        let i = 0;
        let chunks = 0;
        while (i < jsonData.length) {
          dataBuilder = dataBuilder.add(writeData(umi, {
            inscriptionAccount: inscriptionInfo.data.inscriptionPda[0],
            inscriptionMetadataAccount: inscriptionInfo.data.inscriptionMetadataAccount,
            value: jsonData.slice(i, i + chunkSize),
            associatedTag: null,
            offset: i,
          }));
          i += chunkSize;
          chunks += 1;
        }
        console.log('json chunks', chunks);

        const dataSplit = dataBuilder.unsafeSplitByTransactionSize(umi);
        console.log('data tx length', dataSplit.length);

        setMaxProgress(dataSplit.length);

        const dataTxs = (await new TransactionBuilderGroup(dataSplit).setLatestBlockhash(umi)).build(umi);

        const signedDataTxs = await signAllTransactions(dataTxs.map((tx => ({
          transaction: tx,
          signers: [umi.identity],
        }))));

        const errors = [];
        const results: string[] = [];

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
    }
  }, [inscriptionInfo.data, newJson]);

  useEffect(() => {
    console.log('json changed', inscriptionInfo.data?.json);
    setNewJson(JSON.stringify(inscriptionInfo.data?.json, null, 2) || '');
  }, [inscriptionInfo.data?.json]);

  return (
    <>
      <SimpleGrid cols={2} mt="xl" spacing="lg" pb="xl">
        <Paper p="xl" radius="md">
          <Stack>
            <Text fz="md" tt="uppercase" fw={700} c="dimmed">NFT Details</Text>
            {jsonInfo.isPending ? <Center h="20vh"><Loader /></Center> :
              <>
                <Title>{jsonInfo.data.name}</Title>

                <Image src={jsonInfo.data.image} maw={320} />
                {jsonInfo.data.description && <ManageStat
                  label="Description"
                  value={jsonInfo.data.description}
                />}
                <ManageStat
                  label="Mint"
                  value={nft.id}
                  copyable
                />

                <Text fz="xs" tt="uppercase" fw={700} c="dimmed">JSON Metadata</Text>
                <CodeHighlightTabs
                  withExpandButton
                  expandCodeLabel="Show full JSON"
                  collapseCodeLabel="Show less"
                  defaultExpanded
                  mb="lg"
                  code={[{
                    fileName: 'metadata.json',
                    language: 'json',
                    code: JSON.stringify(jsonInfo.data, null, 2),
                  }]}
                />
              </>}

          </Stack>
        </Paper>
        <Paper p="xl" radius="md">
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
                  <ManageStat
                    label="Inscription address (JSON)"
                    value={inscriptionInfo.data?.inscriptionPda[0]!}
                    copyable
                  />
                  <ManageStat
                    label="Inscription metadata address"
                    value={inscriptionInfo.data?.inscriptionMetadataAccount[0]!}
                    copyable
                  />
                  {inscriptionInfo.data?.imagePdaExists && <ManageStat
                    label="Inscription image address"
                    value={inscriptionInfo.data?.imagePda[0]!}
                    copyable
                  />}
                  {inscriptionInfo.data?.metadata &&
                    <>
                      <Text fz="xs" tt="uppercase" fw={700} c="dimmed">Inscribe JSON</Text>
                      <JsonInput
                        label="JSON to Inscribe"
                        value={newJson}
                        onChange={setNewJson}
                        validationError="Invalid JSON"
                        autosize
                      />
                    </>}
                </>
            }
            <SimpleGrid cols={3}>
              <Button size="md" onClick={handleWriteData}>Update JSON</Button>
              {/* <Button size="md" onClick={null}>Remove Authority</Button>
            <Button size="md" onClick={null}>Burn</Button> */}
            </SimpleGrid>
          </Stack>
        </Paper>
      </SimpleGrid>
      <Modal opened={opened} onClose={() => { }} centered withCloseButton={false}>
        <Center my="xl">
          <Stack gap="md" align="center">
            <Title order={3}>Inscribing...</Title>
            <Text>Be prepared to approve many transactions...</Text>
            <Center w="100%">
              <Stack w="100%">
                <Progress value={(progress / maxProgress) * 100} animated />
                <Text ta="center">{progress} / {maxProgress}</Text>
              </Stack>
            </Center>
          </Stack>
        </Center>
      </Modal>
    </>
  );
}
