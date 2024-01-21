import { Button, Center, Container, Loader, Modal, Progress, Stack, Text, Title } from '@mantine/core';
import { DasApiAsset } from '@metaplex-foundation/digital-asset-standard-api';
import { useCallback } from 'react';
import { close as inscriptionClose } from '@metaplex-foundation/mpl-inscription';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { Pda, PublicKey } from '@metaplex-foundation/umi';
import { useNftInscription } from '../Inscribe/hooks';
import { useUmi } from '@/providers/useUmi';

export function ManageDanger({ nft }: { nft: DasApiAsset }) {
  const inscriptionInfo = useNftInscription(nft, { fetchImage: true, fetchMetadata: true, fetchJson: true });
  const umi = useUmi();
  const [opened, { open, close }] = useDisclosure(false);

  const closeInscription = useCallback(async ({ associatedTag, inscriptionAccount }: { associatedTag: string | null, inscriptionAccount?: Pda | PublicKey }) => {
    if (!inscriptionInfo.data || !inscriptionAccount) {
      return;
    }
    open();
    try {
      await inscriptionClose(umi, {
        inscriptionAccount,
        inscriptionMetadataAccount: inscriptionInfo.data?.inscriptionMetadataAccount,
        associatedTag,
      }).sendAndConfirm(umi);
      notifications.show({
        title: 'Inscription deleted',
        message: 'Inscription deleted successfully',
        color: 'green',
      });
      inscriptionInfo.refetch();
    } catch (e: any) {
      notifications.show({
        title: 'Inscription deleted failed',
        message: e.message,
        color: 'red',
      });
    } finally {
      close();
    }
  }, [inscriptionInfo, umi]);

  return (
    <>
      {inscriptionInfo.isPending ? <Center h="20vh"><Loader /></Center> :
      <Container size="xs" mt="xl">
        <Stack>
          <Button
            color="red"
            onClick={() => closeInscription({
              associatedTag: 'image',
              inscriptionAccount: inscriptionInfo.data?.imagePda,
            })}
          >Delete Image Inscription
          </Button>
          <Button
            color="red"
            onClick={() => closeInscription({
              associatedTag: null,
              inscriptionAccount: inscriptionInfo.data?.inscriptionPda,
            })}
          >Delete Inscription
          </Button>
        </Stack>
      </Container>}
      <Modal opened={opened} onClose={() => { }} centered withCloseButton={false}>
        <Center my="xl">
          <Stack gap="md" align="center">
            <Title order={3}>Deleting Inscription</Title>
            <Text>The Solana rent will be returned to your wallet.</Text>
            <Center w="100%">
              <Stack w="100%">
                <Progress value={0} animated />
              </Stack>
            </Center>
          </Stack>
        </Center>
      </Modal>
    </>
  );
}
