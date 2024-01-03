import { DasApiAsset } from '@metaplex-foundation/digital-asset-standard-api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { UseFormReturnType, useForm } from '@mantine/form';
import { Badge, Box, Button, Card, Center, Checkbox, Group, Image, Loader, SegmentedControl, SimpleGrid, Skeleton, Slider, Stack, Text, ThemeIcon } from '@mantine/core';
import { CodeHighlightTabs } from '@mantine/code-highlight';
import prettyBytes from 'pretty-bytes';
import Compressor from 'compressorjs';
import { notifications } from '@mantine/notifications';
import { IconArrowDown } from '@tabler/icons-react';
import { useNftJsonWithImage } from './hooks';

import classes from './ConfigureInscribe.module.css';
import { getCollection } from './NftSelector';

interface Settings {
  quality: number;
  size: number;
  format: string;
  disabled: boolean
}

function Row({ nft, form, counter }: { nft: DasApiAsset, form: UseFormReturnType<{ [key: string]: Settings }>, counter?: number }) {
  const { json, image, isPending } = useNftJsonWithImage(nft);
  const [imageInfo, setImageInfo] = useState<{ width: number, height: number }>();
  const [previewInfo, setPreviewInfo] = useState<{ type: string, width: number, height: number, size: number, image: Blob | File }>();

  const stats = useMemo(() => {
    if (isPending) {
      return <Center><Loader /></Center>;
    }
    if (!json || !image) {
      return <Text>Unable to load stats</Text>;
    }

    const jsonLength = JSON.stringify(json).length;

    return [{
      label: 'Size',
      stat: prettyBytes(jsonLength + image.size),
    }, {
      label: 'Cost',
      stat: `~${((jsonLength + image.size) * 0.00000696).toFixed(3)} SOL`,
    }, {
      label: 'Dimensions',
      stat: imageInfo?.width ? `${imageInfo.width}x${imageInfo.height}` : 'unknown',
    }, {
      label: 'Type',
      stat: image.type,
    }].map(({ label, stat }) => (
      <Box>
        <Text className={classes.label}>{label}</Text>
        <Text className={classes.value}>{stat}</Text>
      </Box>));
  }, [isPending, json, image, imageInfo]);

  const spaceSaved = useMemo(() => {
    if (!previewInfo || !image || !json) {
      return 0;
    }

    const jsonLength = JSON.stringify(json).length;
    return 1 - (jsonLength + previewInfo.size) / (jsonLength + image.size);
  }, [previewInfo, image, json]);

  useEffect(() => {
    if (!imageInfo || !form.values[nft.id] || !image) {
      return;
    }

    const width = imageInfo.width * (form.values[nft.id].size / 100);
    const height = imageInfo.height * (form.values[nft.id].size / 100);

    // eslint-disable-next-line no-new
    new Compressor(image, {
      quality: form.values[nft.id].quality / 100,
      width,
      height,
      mimeType: form.values[nft.id]?.format,
      success(result) {
        setPreviewInfo({
          width,
          height,
          size: result.size,
          type: form.values[nft.id]?.format,
          image: result,
        });
      },
      error(err) {
        notifications.show({
          title: 'Error compressing image',
          message: err.message,
          color: 'red',
        });
      },
    });
  }, [imageInfo, setPreviewInfo, form.values[nft.id], image]);

  const outputStats = useMemo(() => {
    if (isPending || !previewInfo) {
      return <Center><Loader /></Center>;
    }
    if (!json || !image) {
      return <Text>Unable to load stats</Text>;
    }

    const jsonLength = JSON.stringify(json).length;

    return [{
      label: 'Size',
      stat: prettyBytes(jsonLength + previewInfo.size),
    }, {
      label: 'Cost',
      stat: `~${((jsonLength + previewInfo.size) * 0.00000696).toFixed(3)} SOL`,
    }, {
      label: 'Dimensions',
      stat: previewInfo?.width ? `${previewInfo.width}x${previewInfo.height}` : 'unknown',
    }, {
      label: 'Type',
      stat: previewInfo.type,
    }].map(({ label, stat }) => (
      <Box>
        <Text className={classes.label}>{label}</Text>
        <Text className={classes.value}>{stat}</Text>
      </Box>));
  }, [isPending, json, image, imageInfo, previewInfo]);

  const disabled = form.values[nft.id]?.disabled;

  return (
    <SimpleGrid cols={3}>
      <Skeleton visible={isPending}>
        <Card shadow="sm" padding="lg" radius="md">
          <Card.Section>
            <Skeleton visible={!image}>
              <Image
                src={json?.image}
                height={320}
                onLoad={(e: any) => setImageInfo({ width: e.target.naturalWidth, height: e.target.naturalHeight })}
              />
            </Skeleton>
          </Card.Section>
          <Group justify="space-between" mt="md">
            <Text fw={500}>{nft.content.metadata.name}</Text>
          </Group>

          {json && <CodeHighlightTabs
            withExpandButton
            expandCodeLabel="Show full JSON"
            collapseCodeLabel="Show less"
            defaultExpanded={false}
            mt="md"
            mb="lg"
            code={[{
              fileName: 'metadata.json',
              language: 'json',
              code: JSON.stringify(json, null, 2),
            }]}
          />}
          {counter && <Badge
            variant="default"
            style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',

            }}
          >{counter}
                      </Badge>}
        </Card>
      </Skeleton>
      <Box p="md">
        {/* <Text
          size="lg"
          style={{
            textOverflow: 'ellipsis',
            overflow: 'hidden',
          }}
        >{nft.id}
        </Text> */}
        <Text size="sm">Size: {form.values[nft.id]?.size}%</Text>
        <Slider
          disabled={disabled}
          marks={[
            { value: 25, label: '25%' },
            { value: 50, label: '50%' },
            { value: 75, label: '75%' },
          ]}
          {...form.getInputProps(`${nft.id}.size`)}
        />
        <Text size="sm" pt="xl">Quality: {form.values[nft.id]?.quality}%</Text>
        <Slider
          disabled={form.values[nft.id]?.format === 'image/png' || disabled}
          marks={[
            { value: 25, label: '25%' },
            { value: 50, label: '50%' },
            { value: 75, label: '75%' },
          ]}
          {...form.getInputProps(`${nft.id}.quality`)}
        />

        <Text size="sm" pt="xl">Output format</Text>
        <SegmentedControl
          mt="xs"
          data={['image/jpeg', 'image/png']}
          disabled={disabled}
          {...form.getInputProps(`${nft.id}.format`)}
        />

        <Checkbox
          pt="xl"
          label="Disable image size reduction"
          {...form.getInputProps(`${nft.id}.disabled`)}
        />
      </Box>
      <Card shadow="sm" padding="xl" radius="md">
        <Stack justify="space-between" h="100%">
          <Box>
            <Text size="lg" mb="sm">Original</Text>
            <Group justify="space-between">
              {stats}
            </Group>
          </Box>
          <Center>
            <Stack gap="xs" ta="center" align="center">
              <Text>Cost reduction</Text>
              {disabled ? <Text size="xl" color="grey">0%</Text>
                : <>
                  <Text color="green" size="xl"><b>{(spaceSaved * 100).toFixed(2)}%</b></Text>
                  <ThemeIcon size="lg" color="green" radius="xl" mt="lg">
                    <IconArrowDown size={24} />
                  </ThemeIcon>
                  </>}
            </Stack>
          </Center>
          <Stack align="center">
            <Text size="lg">Downsampled</Text>
            {previewInfo?.image && !disabled
              && <Image src={URL.createObjectURL(previewInfo.image)} height={previewInfo.height} w={previewInfo.width} />}
            <Group justify="space-between">
              {disabled ? stats : outputStats}
            </Group>
          </Stack>
        </Stack>
      </Card>
    </SimpleGrid>
  );
}

export interface InscriptionSettings extends Settings {
  nft: DasApiAsset
}

export function ConfigureInscribe({ selectedNfts, onConfigure }: { selectedNfts: DasApiAsset[], onConfigure: (settings: InscriptionSettings[]) => void }) {
  const [collate, setCollate] = useState(true);
  const [cGroups, setCGroups] = useState<{ [key: string]: { nfts: DasApiAsset[] } }>({});

  useEffect(() => {
    const groups: { [key: string]: { nfts: DasApiAsset[] } } = {};
    selectedNfts.forEach((nft) => {
      const collection = getCollection(nft);
      if (!groups[collection]) {
        groups[collection] = {
          nfts: [],
        };
      }
      groups[collection].nfts.push(nft);
    });
    setCGroups(groups);
  }, [selectedNfts]);

  const form = useForm<{ [key: string]: Settings }>({
    initialValues: {},
  });

  useEffect(() => {
    const values: { [id: string]: Settings } = {};
    selectedNfts.forEach((nft) => {
      values[nft.id] = {
        quality: 100,
        size: 100,
        format: 'image/jpeg',
        disabled: false,
      };
    });
    form.setValues(values);
  }, [selectedNfts]);

  // TODO mirror values applied to the collection to each nft realtime

  const handleConfigure = useCallback(() => {
    if (collate) {
      const result: InscriptionSettings[] = [];
      Object.keys(cGroups).forEach((collection) => {
        const baseNft = cGroups[collection].nfts[0];
        cGroups[collection].nfts.forEach((nft) => {
          result.push({
            nft,
            ...form.values[baseNft.id],
          });
        });
      });

      onConfigure(result);
    } else {
      onConfigure(selectedNfts.map((nft) => ({
        nft,
        ...form.values[nft.id],
      })));
    }
  }, [onConfigure, form.values]);

  return <>
    <Group my="lg" justify="space-between">
      <Group>
        <Checkbox
          label="Collate by collection"
          checked={collate}
          onChange={() => {
            setCollate(!collate);
          }}
        />

      </Group>
      <Button
        onClick={handleConfigure}
      >Next
      </Button>

    </Group>
    <Stack gap="lg">
      {collate ? Object.keys(cGroups).map((collection) => <Row key={collection} nft={cGroups[collection].nfts[0]} form={form} counter={cGroups[collection].nfts.length} />) : selectedNfts.map((nft) => (
        <Row nft={nft} form={form} key={nft.id} />
      ))}
    </Stack>
         </>;
}
