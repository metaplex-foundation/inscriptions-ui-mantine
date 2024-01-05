import { Box, Button, Center, Checkbox, Group, Loader, SimpleGrid, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { DasApiAsset } from '@metaplex-foundation/digital-asset-standard-api';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { findAssociatedInscriptionAccountPda, findInscriptionMetadataPda, findMintInscriptionPda } from '@metaplex-foundation/mpl-inscription';
import { useUmi } from '@/providers/useUmi';
import { NftCard } from './NftCard';
import { NftCollectionCard } from './NftCollectionCard';

import classes from './NftSelector.module.css';
import { AssetWithInscription, InscriptionInfo } from './types';

export const UNCATAGORIZED = 'Uncategorized';

export const getCollection = (nft: DasApiAsset) => nft.grouping.filter(({ group_key }) => group_key === 'collection')[0]?.group_value || UNCATAGORIZED;

export function NftSelector({ onSelect, selectedNfts }: { onSelect: (nfts: AssetWithInscription[]) => void, selectedNfts: AssetWithInscription[] }) {
  const [selectAll, setSelectAll] = useState(false);
  const [collate, setCollate] = useState(false);
  const [hideInscribed, setHideInscribed] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedNfts.map((nft) => nft.id)));
  const [collections, setCollections] = useState<{ [key: string]: { nfts: AssetWithInscription[], selected: number } }>({});

  const umi = useUmi();

  const { error, isPending, data: nfts } = useQuery({
    queryKey: ['fetch-nfts', umi.identity.publicKey],
    queryFn: async () => {
      const assets = await umi.rpc.getAssetsByAuthority({ authority: umi.identity.publicKey });
      const infos: Pick<InscriptionInfo, 'inscriptionPda' | 'inscriptionMetadataAccount' | 'imagePda'>[] = assets.items.map((nft) => {
        const inscriptionPda = findMintInscriptionPda(umi, { mint: nft.id });
        const inscriptionMetadataAccount = findInscriptionMetadataPda(umi, { inscriptionAccount: inscriptionPda[0] });
        const imagePda = findAssociatedInscriptionAccountPda(umi, {
          associationTag: 'image',
          inscriptionMetadataAccount: inscriptionMetadataAccount[0],
        });

        return {
          inscriptionPda,
          inscriptionMetadataAccount,
          imagePda,
        };
      });

      const inscriptionExists = await umi.rpc.getAccounts(infos.map((info) => info.inscriptionPda[0]), {
        commitment: 'confirmed',
        dataSlice: {
          length: 0,
          offset: 0,
        },
      });

      const imageExists = await umi.rpc.getAccounts(infos.map((info) => info.imagePda[0]), {
        commitment: 'confirmed',
        dataSlice: {
          length: 0,
          offset: 0,
        },
      });

      return infos.map((info, i) => ({
        ...assets.items[i],
        inscriptionPda: infos[i].inscriptionPda,
        inscriptionMetadataAccount: infos[i].inscriptionMetadataAccount,
        imagePda: infos[i].imagePda,
        pdaExists: inscriptionExists[i].exists,
        imagePdaExists: imageExists[i].exists,
      }));
    },
  });

  useEffect(() => {
    if (error) {
      notifications.show({
        title: 'Error fetching NFTs',
        message: error.message,
        color: 'red',
      });
    }
  }, [error]);

  useEffect(() => {
    if (!nfts) {
      setCollections({});
      return;
    }
    const sNfts = new Set(selectedNfts.map((nft) => nft.id));
    const col: { [key: string]: { nfts: AssetWithInscription[], selected: number } } = {};
    nfts.forEach((nft) => {
      const collection = getCollection(nft);
      if (!col[collection]) {
        col[collection] = {
          nfts: [],
          selected: 0,
        };
      }
      col[collection].nfts.push(nft);
      if (sNfts.has(nft.id)) {
        col[collection].selected += 1;
      }
    });
    setCollections(col);
  }, [nfts]);

  const handleSelect = useCallback((nft: AssetWithInscription) => {
    if (nft.pdaExists) return;
    const col = getCollection(nft);
    if (selected.has(nft.id)) {
      selected.delete(nft.id);
      setSelected(new Set(selected));
      setCollections({
        ...collections,
        [col]: {
          nfts: collections[col].nfts,
          selected: collections[col].selected - 1,
        },
      });
    } else {
      setSelected(new Set(selected.add(nft.id)));
      setCollections({
        ...collections,
        [col]: {
          nfts: collections[col].nfts,
          selected: collections[col].selected + 1,
        },
      });
    }
  }, [selected, setSelected, collections, setCollections]);

  const handleSelectCollection = useCallback((collection: string) => {
    if (collections[collection].selected === collections[collection].nfts.length) {
      collections[collection].nfts.forEach((nft) => {
        selected.delete(nft.id);
      });
      setCollections({
        ...collections,
        [collection]: {
          nfts: collections[collection].nfts,
          selected: 0,
        },
      });
      setSelected(new Set(selected));
    } else {
      collections[collection].nfts.forEach((nft) => {
        setSelected(new Set(selected.add(nft.id)));
      });
      setCollections({
        ...collections,
        [collection]: {
          nfts: collections[collection].nfts,
          selected: collections[collection].nfts.length,
        },
      });
    }
  }, [selected, setSelected, collections, setCollections]);

  return (
    <>
      <Group my="lg" justify="space-between">
        <Group>
          <Checkbox
            label="Hide inscribed"
            checked={hideInscribed}
            disabled={isPending}
            onChange={() => {
              setHideInscribed(!hideInscribed);
            }}
          />
          {/* <Checkbox
            label="Collate by collection"
            checked={collate}
            disabled={isPending}
            onChange={() => {
              setCollate(!collate);
            }}
          /> */}
          <Checkbox
            label="Select All"
            checked={selectAll}
            disabled={isPending}
            onChange={() => {
              if (selectAll) {
                setSelected(new Set());
                const res: { [key: string]: { nfts: AssetWithInscription[], selected: number } } = {};
                Object.keys(collections).forEach((collection) => {
                  res[collection] = {
                    nfts: collections[collection].nfts,
                    selected: 0,
                  };
                });
                setCollections(res);
              } else {
                setSelected(new Set(nfts?.map((nft) => nft.id)));
                const res: { [key: string]: { nfts: AssetWithInscription[], selected: number } } = {};
                Object.keys(collections).forEach((collection) => {
                  res[collection] = {
                    nfts: collections[collection].nfts,
                    selected: collections[collection].nfts.length,
                  };
                });
                setCollections(res);
              }
              setSelectAll(!selectAll);
            }}
          />
        </Group>
        <Button
          disabled={!selected.size}
          onClick={() => {
            onSelect(selected.size ? nfts?.filter((nft) => selected.has(nft.id)) || [] : []);
          }}
        >Next
        </Button>

      </Group>
      {/* TODO: filter out all already inscribed NFTs */}
      {isPending ? <Center h="50vh"><Loader /> </Center> :
        <>
          <SimpleGrid
            cols={{
              base: 1,
              sm: 2,
              lg: 5,
            }}
          >
            {collate ? <>
              {Object.keys(collections).map((key) => {
                if (key === UNCATAGORIZED) return null;
                return (
                  <Box
                    key={key}
                    onClick={() => handleSelectCollection(key)}
                    className={classes.cardContainer}
                  >
                    <NftCollectionCard collection={key} nfts={collections[key].nfts} numSelected={collections[key].selected} />
                  </Box>);
              })}
                       </>
              : nfts?.filter((nft) => hideInscribed ? !nft.pdaExists : true).map((nft) => (
                <Box
                  key={nft.id}
                  onClick={() => {
                    handleSelect(nft);
                  }}
                  className={classes.cardContainer}
                  style={{
                    cursor: nft.pdaExists ? 'default' : 'pointer',
                  }}
                >
                  <NftCard nft={nft} isSelected={selected.has(nft.id)} />
                </Box>))}
          </SimpleGrid>
          {collections[UNCATAGORIZED] && <Box mt="lg">
            <Text>Uncheck &quot;Collate by collection&quot; to see <b>{collections[UNCATAGORIZED].nfts.length}</b> NFT(s) not in a collection</Text>
                                         </Box>}
        </>}
    </>
  );
}
