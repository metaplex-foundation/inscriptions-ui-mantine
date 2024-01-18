import { DasApiAsset } from '@metaplex-foundation/digital-asset-standard-api';
import { InscriptionMetadata } from '@metaplex-foundation/mpl-inscription';
import { Pda } from '@metaplex-foundation/umi';

export interface InscriptionInfo {
  inscriptionPda: Pda
  inscriptionMetadataAccount: Pda
  imagePda: Pda
  pdaExists: boolean
  metadataPdaExists?: boolean
  imagePdaExists: boolean
  metadata?: InscriptionMetadata
  image?: Blob
  json?: any
  jsonValid?: boolean
}

export type AssetWithInscription = DasApiAsset & InscriptionInfo;
