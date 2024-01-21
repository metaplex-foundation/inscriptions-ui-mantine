import { DasApiAsset } from '@metaplex-foundation/digital-asset-standard-api';
import { Box, Button, Center, Image, Loader, Text } from '@mantine/core';
import { MIME_TYPES } from '@mantine/dropzone';
import { useState } from 'react';
import { useNftInscription } from '../Inscribe/hooks';
import { DropzoneButton } from '../Dropzone/DropzoneButton';

export function ManageImage({ nft, onUpdate }: { nft: DasApiAsset, onUpdate: (image: File) => void }) {
  const inscriptionInfo = useNftInscription(nft, { fetchImage: true, fetchMetadata: true, fetchJson: true });
  const [image, setImage] = useState<File | null>(null);

  return (
    <>
      {inscriptionInfo.isPending ? <Center h="20vh"><Loader /></Center> :
        <>
          <Text fz="xs" tt="uppercase" fw={700} c="dimmed">Inscribed Image</Text>
          {inscriptionInfo.data?.image ? <Image src={URL.createObjectURL(inscriptionInfo.data?.image)} maw={320} /> :
            <Text fz="xs">No image found</Text>}

          <Text mt="md" fz="xs" tt="uppercase" fw={700} c="dimmed">Inscribe new image</Text>
          <Box>
            <DropzoneButton
              mimeTypes={[MIME_TYPES.gif, MIME_TYPES.jpeg, MIME_TYPES.png]}
              name="image"
              onDrop={(files) => setImage(files[0])}
            >
              {image &&
                <Center mt="xl">
                <Image src={URL.createObjectURL(image)} maw={320} />
                </Center>
                }
            </DropzoneButton>
          </Box>
          <Button size="md" disabled={!image} onClick={() => onUpdate(image!)}>Update image</Button>

        </>}
    </>
  );
}
