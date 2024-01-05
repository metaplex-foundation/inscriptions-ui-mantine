import { DasApiAsset } from '@metaplex-foundation/digital-asset-standard-api';
import { findAssociatedInscriptionAccountPda, findInscriptionMetadataPda, findMintInscriptionPda } from '@metaplex-foundation/mpl-inscription';
import { PublicKey, Umi } from '@metaplex-foundation/umi';
import { useQuery } from '@tanstack/react-query';
import { useUmi } from '@/providers/useUmi';

export async function accountExists(umi: Umi, account: PublicKey) {
  const maybeAccount = await umi.rpc.getAccount(account);
  if (maybeAccount.exists) {
      return true;
  }
  return false;
}

export const useNftJson = (nft: DasApiAsset) => useQuery({
  queryKey: ['fetch-nft-json', nft.id],
  queryFn: async () => {
    const j = await (await fetch(nft.content.json_uri)).json();
    return j;
  },
});

export const useNftInscription = (nft: DasApiAsset) => {
  const umi = useUmi();

  return useQuery({
    // refetchOnMount: true,
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
};

export const useUriBlob = (uri: string) => useQuery({
  queryKey: ['fetch-uri-blob', uri],
  queryFn: async () => {
    if (!uri) {
      return null;
    }
    const blob = await (await fetch(uri)).blob();
    return blob;
  },
});

export const useNftJsonWithImage = (nft: DasApiAsset) => {
  const { isPending: jsonPending, data: json } = useNftJson(nft);
  const { isPending: imagePending, data: blob } = useUriBlob(json?.image);

  return { isPending: jsonPending || imagePending, json, image: blob };
};
