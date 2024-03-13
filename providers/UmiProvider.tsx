import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { ReactNode, useMemo } from 'react';
import { mplInscription } from '@metaplex-foundation/mpl-inscription';
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api';
import { UmiContext } from './useUmi';

export const UmiProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const umi = useMemo(() => createUmi(connection)
    .use(walletAdapterIdentity(wallet))
    .use(mplTokenMetadata())
    .use(dasApi())
    .use(mplInscription()), [wallet, connection]);

  return <UmiContext.Provider value={{ umi }}>{children}</UmiContext.Provider>;
};
