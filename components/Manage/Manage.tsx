import { DasApiAsset } from '@metaplex-foundation/digital-asset-standard-api';
import { Box, Center, Modal, Paper, Progress, SimpleGrid, Stack, Tabs, Text, Title, rem } from '@mantine/core';

import { useCallback, useState } from 'react';

import { clearData, initializeAssociatedInscription } from '@metaplex-foundation/mpl-inscription';

import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconBraces, IconInfoCircle, IconPhoto, IconWriting } from '@tabler/icons-react';
import { Pda, PublicKey, TransactionBuilder } from '@metaplex-foundation/umi';
import { useNftInscription } from '../Inscribe/hooks';

import { useUmi } from '@/providers/useUmi';
import { ExplorerNftDetails } from '../Explorer/ExplorerNftDetails';
import { ExplorerInscriptionDetails } from '../Explorer/ExplorerInscriptionDetails';
import { ManageImage } from './ManageImage';
import { ManageJson } from './ManageJson';
import { buildAllocate, buildChunkedWriteData, prepareAndSignTxs, sendTxsWithRetries } from '@/lib/tx';
import { ManageDanger } from './ManageDanger';
import { ManageCustom } from './ManageCustom';

export function Manage({ nft }: { nft: DasApiAsset }) {
  const inscriptionInfo = useNftInscription(nft, { fetchImage: true, fetchMetadata: true, fetchJson: true });
  const umi = useUmi();
  const [progress, setProgress] = useState<number>(0);
  const [maxProgress, setMaxProgress] = useState<number>(0);
  const [opened, { open, close }] = useDisclosure(false);

  const handleWrite = useCallback(async ({ data, associatedTag, inscriptionAccount }: { data: Uint8Array, associatedTag: string | null, inscriptionAccount?: Pda | PublicKey }) => {
    if (!inscriptionInfo.data || !inscriptionAccount) {
      return;
    }

    try {
      open();
      setProgress(0);
      let initBuilder = new TransactionBuilder();

      if (associatedTag === 'image' && !inscriptionInfo.data.imagePdaExists) {
        initBuilder = initBuilder.add(
          initializeAssociatedInscription(umi, {
          inscriptionAccount: inscriptionInfo.data.inscriptionPda,
          inscriptionMetadataAccount: inscriptionInfo.data.inscriptionMetadataAccount,
          associationTag: associatedTag,
        }));
      } else {
        initBuilder = initBuilder.add(
          clearData(umi, {
          inscriptionAccount,
          inscriptionMetadataAccount: inscriptionInfo.data.inscriptionMetadataAccount,
          associatedTag,
        }));
      }

      initBuilder = buildAllocate({
        umi,
        builder: initBuilder,
        inscriptionAccount,
        inscriptionMetadataAccount: inscriptionInfo.data.inscriptionMetadataAccount,
        associatedTag,
        targetSize: data.length,
      });

      const dataBuilder = buildChunkedWriteData({
        umi,
        inscriptionAccount,
        inscriptionMetadataAccount: inscriptionInfo.data.inscriptionMetadataAccount,
        associatedTag,
        data,
      });

      const initTxs = await prepareAndSignTxs({ umi, builder: initBuilder });

      setMaxProgress(initTxs.length);

      const initRes = await sendTxsWithRetries({
        umi,
        txs: initTxs,
        concurrency: 2,
        onProgress: () => setProgress((p) => p + 1),
      });

      if (initRes.errors.length > 0) {
        notifications.show({
          title: 'Error inscribing',
          message: 'Could not confirm inscription account initialization',
          color: 'red',
        });
        return;
      }

      const dataTxs = await prepareAndSignTxs({ umi, builder: dataBuilder });
      setMaxProgress((p) => p + dataTxs.length);

      const dataRes = await sendTxsWithRetries({
        umi,
        txs: dataTxs,
        concurrency: 2,
        onProgress: () => setProgress((p) => p + 1),
      });

      if (dataRes.errors.length > 0) {
        notifications.show({
          title: 'Error inscribing',
          message: 'Could not confirm inscription writes',
          color: 'red',
        });
        return;
      }

      notifications.show({
        title: 'Inscribed',
        message: 'Your inscription has been updated',
        color: 'green',
      });

      inscriptionInfo.refetch();
    } catch (e: any) {
      notifications.show({
        title: 'Error inscribing',
        message: e.message,
        color: 'red',
      });
    } finally {
      close();
    }
  }, [inscriptionInfo.data, umi, open, close, setProgress, setMaxProgress]);

  const iconStyle = { width: rem(12), height: rem(12) };
  return (
    <>
      <Tabs orientation="vertical" defaultValue="details" mt="xl">
        <Tabs.List>
          <Tabs.Tab value="details" leftSection={<IconInfoCircle style={iconStyle} />}>
            Details
          </Tabs.Tab>
          <Tabs.Tab value="image" leftSection={<IconPhoto style={iconStyle} />}>
            Image
          </Tabs.Tab>
          <Tabs.Tab value="json" leftSection={<IconBraces style={iconStyle} />}>
            JSON
          </Tabs.Tab>
          <Tabs.Tab value="custom" leftSection={<IconWriting style={iconStyle} />}>
            Custom data
          </Tabs.Tab>
          <Tabs.Tab value="danger" leftSection={<IconAlertTriangle style={iconStyle} />}>
            Danger zone
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="details">
          <SimpleGrid cols={2} ml="md" spacing="lg" pb="xl">
            <Paper p="xl" radius="md">
              <ExplorerNftDetails nft={nft} />
            </Paper>
            <Paper p="xl" radius="md">
              <ExplorerInscriptionDetails nft={nft} />
            </Paper>
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="image">
          <Box ml="md">
            <ManageImage
              nft={nft}
              onUpdate={async (image) => {
                handleWrite({
                  data: new Uint8Array(await image.arrayBuffer()),
                  associatedTag: 'image',
                  inscriptionAccount: inscriptionInfo.data?.imagePda,
                });
              }}
            />
          </Box>
        </Tabs.Panel>
        <Tabs.Panel value="json">
          <Box ml="md">
            <ManageJson
              nft={nft}
              onUpdate={(json) => {
              const enc = new TextEncoder();
              const jsonData = enc.encode(json);
              handleWrite({
                data: jsonData,
                associatedTag: null,
                inscriptionAccount: inscriptionInfo.data?.inscriptionPda,
              });
            }}
            />
          </Box>
        </Tabs.Panel>
        <Tabs.Panel value="custom">
          <Box ml="md">
            <ManageCustom />
          </Box>
        </Tabs.Panel>
        <Tabs.Panel value="danger">
          <Box ml="md">
            <ManageDanger
              nft={nft}
            />
          </Box>
        </Tabs.Panel>

      </Tabs>
      <Modal opened={opened} onClose={() => { }} centered withCloseButton={false}>
        <Center my="xl">
          <Stack gap="md" align="center">
            <Title order={3}>Updating Inscription</Title>
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
