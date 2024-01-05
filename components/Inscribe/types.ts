import { DasApiAsset } from '@metaplex-foundation/digital-asset-standard-api';
import { Pda } from '@metaplex-foundation/umi';

export interface InscriptionInfo {
  inscriptionPda: Pda
  inscriptionMetadataAccount: Pda
  imagePda: Pda
  pdaExists: boolean
  imagePdaExists: boolean
}

export type AssetWithInscription = DasApiAsset & InscriptionInfo;
