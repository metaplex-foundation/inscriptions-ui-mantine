import { DasApiAsset } from '@metaplex-foundation/digital-asset-standard-api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { UseFormReturnType, useForm } from '@mantine/form';
import { Badge, Box, Button, Card, Center, Checkbox, Grid, Group, Image, Loader, SegmentedControl, Select, Skeleton, Slider, Stack, Tabs, Text, ThemeIcon, rem } from '@mantine/core';
import { CodeHighlightTabs } from '@mantine/code-highlight';
import prettyBytes from 'pretty-bytes';
import Compressor from 'compressorjs';
import { notifications } from '@mantine/notifications';
import { IconArrowDown, IconBraces, IconPhoto } from '@tabler/icons-react';
import { MIME_TYPES } from '@mantine/dropzone';
import { useNftJsonWithImage } from './hooks';

import classes from './ConfigureInscribe.module.css';
import { getCollection } from './NftSelector';
import { DropzoneButton } from '../Dropzone/DropzoneButton';

interface Settings {
  quality: number;
  size: number;
  format: string;
  imageType: 'Compress' | 'Raw' | 'Override' | 'None'
  jsonOverride?: any
  imageOverride?: Blob | File
}

interface PreviewInfo { type: string, width: number, height: number, size: number, image: Blob | File }

// TODO refactor this whole component
function Row({ nft, form, counter, overrideable }: { nft: DasApiAsset, form: UseFormReturnType<{ [key: string]: Settings }>, counter?: number, overrideable?: boolean }) {
  const { json, image, isPending } = useNftJsonWithImage(nft);
  const [imageInfo, setImageInfo] = useState<{ width: number, height: number }>();
  const [previewInfo, setPreviewInfo] = useState<PreviewInfo>();
  const [overrideImageInfo, setOverrideImageInfo] = useState<PreviewInfo>();

  const {
    quality,
    size,
    format,
    imageType,
    imageOverride,
    jsonOverride,
  } = form.values[nft.id];

  const onJsonOverride = useCallback(async (files: File[]) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const j = JSON.parse(e.target?.result as string);
        form.setFieldValue(`${nft.id}.jsonOverride`, j);
      } catch (err: any) {
        notifications.show({
          message: err.message,
          color: 'red',
        });
      }
    };

    reader.onerror = (e) => {
      console.log('json reader error', e);
    };

    reader.readAsText(files[0]);
  }, []);

  useEffect(() => {
    if (form.values[nft.id].imageType === 'Override') {
      setOverrideImageInfo(undefined);
      form.setFieldValue(`${nft.id}.imageOverride`, undefined as any);
    }
  }, [form.values[nft.id].imageType]);

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
      <Box key={label}>
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

    const width = imageInfo.width * (size / 100);
    const height = imageInfo.height * (size / 100);

    // eslint-disable-next-line no-new
    new Compressor(image, {
      quality: quality / 100,
      width,
      height,
      mimeType: format,
      success(result) {
        setPreviewInfo({
          width,
          height,
          size: result.size,
          type: format,
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
  }, [imageInfo, setPreviewInfo, image, quality, size]);

  const outputStats = useMemo(() => {
    if (isPending || (imageType === 'Override' && imageOverride ? !overrideImageInfo : !previewInfo)) {
      return <Center><Loader /></Center>;
    }

    if ((!json && !jsonOverride) || (!image && !imageOverride && imageType !== 'None')) {
      return <Text>Unable to load stats</Text>;
    }

    const j = jsonOverride ?? json;
    const jsonLength = JSON.stringify(j).length;

    const iInfo = imageType === 'Override' ? overrideImageInfo : previewInfo;

    return [{
      label: 'Size',
      stat: prettyBytes(jsonLength + (iInfo?.size || 0)),
    }, {
      label: 'Cost',
      stat: `~${((jsonLength + (iInfo?.size || 0)) * 0.00000696).toFixed(3)} SOL`,
    }, {
      label: 'Dimensions',
      stat: iInfo?.width ? `${iInfo.width}x${iInfo.height}` : '-',
    }, {
      label: 'Type',
      stat: iInfo?.type || '-',
    }].map(({ label, stat }) => (
      <Box key={label}>
        <Text className={classes.label}>{label}</Text>
        <Text className={classes.value}>{stat}</Text>
      </Box>));
  }, [isPending, json, image, previewInfo, imageOverride, overrideImageInfo, jsonOverride, imageType]);

  const imageTypeOptions = useMemo(() => overrideable ? ['Compress', 'Raw', 'Override', 'None'] : ['Compress', 'Raw', 'None'], [overrideable]);

  const iconStyle = { width: rem(12), height: rem(12) };
  return (
    <Grid>
      <Grid.Col span={3}>
        <Skeleton visible={isPending} h="100%">
          <Card shadow="sm" padding="lg" radius="md" h="100%">
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
            {counter &&
              <Badge
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
      </Grid.Col>
      <Grid.Col span={6}>
        <Tabs defaultValue="image">
          <Tabs.List mb="md">
            <Tabs.Tab value="image" leftSection={<IconPhoto style={iconStyle} />}>
              Image
            </Tabs.Tab>
            <Tabs.Tab value="json" leftSection={<IconBraces style={iconStyle} />}>
              JSON
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="image">
            <Select label="Image inscription mode" data={imageTypeOptions} {...form.getInputProps(`${nft.id}.imageType`)} />
            {imageType === 'Compress' &&
              <>
                <Text size="sm" mt="md">Output format</Text>
                <SegmentedControl
                  data={['image/jpeg', 'image/png']}
                  {...form.getInputProps(`${nft.id}.format`)}
                />

                <Text size="sm" mt="md">Size: {size}%</Text>
                <Slider
                  marks={[
                    { value: 25, label: '25%' },
                    { value: 50, label: '50%' },
                    { value: 75, label: '75%' },
                  ]}
                  {...form.getInputProps(`${nft.id}.size`)}
                />
                <Text size="sm" pt="xl">Quality: {quality}%</Text>
                <Slider
                  mb="xl"
                  disabled={format === 'image/png'}
                  marks={[
                    { value: 25, label: '25%' },
                    { value: 50, label: '50%' },
                    { value: 75, label: '75%' },
                  ]}
                  {...form.getInputProps(`${nft.id}.quality`)}
                />
              </>}
            {imageType === 'None' &&
              <Text mt="md">Skip the image inscription step</Text>
            }
            {imageType === 'Raw' &&
              <Text mt="md">Inscribe the raw image from the existing NFT</Text>
            }
            {imageType === 'Override' &&
              <>
                {!imageOverride ?
                  <Box mt="md">
                    <DropzoneButton
                      mimeTypes={[MIME_TYPES.gif, MIME_TYPES.jpeg, MIME_TYPES.png]}
                      name="image"
                      onDrop={(files) => form.setFieldValue(`${nft.id}.imageOverride`, files[0] as any)}
                    />
                  </Box> : <Button mt="md" color="gray" onClick={() => form.setFieldValue(`${nft.id}.imageOverride`, undefined as any)}>Remove image</Button>}
              </>
            }

          </Tabs.Panel>

          <Tabs.Panel value="json">
            {overrideable ?
              <>
                {!jsonOverride ?
                  <Box my="md">
                    <DropzoneButton mimeTypes={['application/json']} onDrop={onJsonOverride} name="JSON" />
                  </Box> : <>
                    {jsonOverride && <CodeHighlightTabs
                      withExpandButton
                      expandCodeLabel="Show full JSON"
                      collapseCodeLabel="Show less"
                      defaultExpanded={false}
                      mt="md"
                      mb="lg"
                      code={[{
                        fileName: 'metadata.json',
                        language: 'json',
                        code: JSON.stringify(jsonOverride, null, 2),
                      }]}
                    />}
                    <Button mt="md" color="gray" onClick={() => form.setFieldValue(`${nft.id}.jsonOverride`, undefined as any)}>Remove JSON</Button>
                           </>}
              </> :
              <Text>Inscribe the raw JSON from the existing NFT</Text>
            }
          </Tabs.Panel>

        </Tabs>
      </Grid.Col>
      <Grid.Col span={3}>
        <Card shadow="sm" padding="xl" radius="md" h="100%">
          <Stack justify="space-between" h="100%">
            <Box>
              <Text size="lg" mb="sm">Original</Text>
              <Group justify="space-between">
                {stats}
              </Group>
            </Box>
            {imageType === 'Compress' &&
              <Center>
                <Stack gap="xs" ta="center" align="center">
                  <Text>Cost reduction</Text>
                  <>
                    <Text color="green" size="xl"><b>{(spaceSaved * 100).toFixed(2)}%</b></Text>
                    <ThemeIcon size="lg" color="green" radius="xl" mt="lg">
                      <IconArrowDown size={24} />
                    </ThemeIcon>
                  </>
                </Stack>
              </Center>}
            <Stack>
              <Text size="lg">{imageType === 'Raw' ? 'Raw' : imageType === 'Compress' ? 'Compressed' : imageType === 'None' ? 'JSON only' : 'New image'}</Text>
              {previewInfo?.image && imageType === 'Compress' && <Image src={URL.createObjectURL(previewInfo.image)} height={previewInfo.height} w={previewInfo.width} />}
              {imageType === 'Override' &&
                <Skeleton visible={!imageOverride}>
                  <Image
                    src={imageOverride && URL.createObjectURL(imageOverride)}
                    height={320}
                    onLoad={(e: any) => {
                      if (imageOverride && (overrideImageInfo?.image as File)?.name !== (imageOverride as File)?.name) {
                        setOverrideImageInfo({
                          width: e.target.naturalWidth,
                          height: e.target.naturalHeight,
                          size: imageOverride.size,
                          type: imageOverride.type,
                          image: imageOverride,
                        });
                      }
                    }}
                  />
                </Skeleton>}
              <Group justify="space-between">
                {imageType === 'Raw' ? stats : outputStats}
              </Group>
            </Stack>
          </Stack>
        </Card>
      </Grid.Col>
    </Grid>
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
    initialValues: selectedNfts.map((nft) => ({
      [nft.id]: {
        quality: 100,
        size: 100,
        format: 'image/jpeg',
        imageType: 'Compress' as any,
      },
    })).reduce((acc, curr) => ({ ...acc, ...curr }), {}),
  });

  const reset = useCallback(() => {
    const values: { [id: string]: Settings } = {};
    selectedNfts.forEach((nft) => {
      values[nft.id] = {
        quality: 100,
        size: 100,
        format: 'image/jpeg',
        imageType: 'Compress',
      };
    });
    form.setValues(values);
  }, [selectedNfts]);

  useEffect(() => {
    if (collate) {
      reset();
    }
  }, [collate]);

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
      let valid = true;
      Object.keys(form.values).forEach((id) => {
        const config = form.values[id];

        if (config.imageType === 'Override' && !config.imageOverride) {
          notifications.show({
            message: 'Please upload an image file or switch to a different image inscription mode',
            color: 'red',
          });
          valid = false;
        }
      });

      if (valid) {
        onConfigure(selectedNfts.map((nft) => ({
          nft,
          ...form.values[nft.id],
        })));
      }
    }
  }, [onConfigure, form.values]);

  return (
    <>
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
          <Row nft={nft} form={form} key={nft.id} overrideable />
        ))}
      </Stack>
    </>);
}
