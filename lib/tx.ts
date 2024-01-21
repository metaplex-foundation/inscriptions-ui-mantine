import { allocate, writeData } from '@metaplex-foundation/mpl-inscription';
import { Pda, PublicKey, Transaction, TransactionBuilder, TransactionBuilderGroup, Umi, signAllTransactions } from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import pMap from 'p-map';

export const MAX_PERMITTED_DATA_INCREASE = 10_240;
export const signatureToString = (signature: Uint8Array) => base58.deserialize(signature)[0];

export interface SendTxsWithRetriesOptions {
  txs: Transaction[];
  umi: Umi;
  concurrency: number;
  retries?: number;
  commitment?: 'finalized' | 'confirmed';
  onProgress?: (signature: string) => void;
}

export async function sendTxsWithRetries({
  txs,
  umi,
  concurrency,
  onProgress,
  ...opts
}: SendTxsWithRetriesOptions) {
  const results: string[] = [];
  let retries = opts.retries || 3;
  let txsToSend = [...txs];
  const commitment = opts.commitment || 'confirmed';

  do {
    const errors: Transaction[] = [];
    console.log('init tries left', retries);
    // eslint-disable-next-line no-await-in-loop
    await pMap(
      txsToSend,
      async (tx) => {
        try {
          const blockhash = await umi.rpc.getLatestBlockhash({
            commitment,
          });
          const res = await umi.rpc.sendTransaction(tx, {
            commitment,
          });
          const sig = signatureToString(res);
          console.log('signature', sig);

          const confirmRes = await umi.rpc.confirmTransaction(res, {
              commitment,
              strategy: {
                type: 'blockhash',
                ...blockhash,
              },
            });
          if (confirmRes.value?.err) {
            throw new Error('Transaction failed');
          }

          onProgress?.(sig);
          results.push(sig);
        } catch (e) {
          console.log(e);
          errors.push(tx);
        }
      },
      {
        concurrency,
      }
    );
    txsToSend = errors;
    retries -= 1;
  } while (txsToSend.length && retries >= 0);

  return {
    signatures: results,
    errors: txsToSend,
  };
}

export interface BuildChunkedWriteDataOptions {
  umi: Umi;
  data: Uint8Array;
  chunkSize?: number;
  inscriptionAccount: Pda | PublicKey;
  inscriptionMetadataAccount: Pda | PublicKey;
  associatedTag: string | null;
  builder?: TransactionBuilder;
}

export function buildChunkedWriteData({
  umi,
  data,
  inscriptionAccount,
  inscriptionMetadataAccount,
  associatedTag,
  ...opts
}: BuildChunkedWriteDataOptions) {
  const chunkSize = opts.chunkSize || 800;
  let builder = opts.builder || new TransactionBuilder();

  let i = 0;
  let chunks = 0;
  while (i < data.length) {
    builder = builder.add(
      writeData(umi, {
        inscriptionAccount,
        inscriptionMetadataAccount,
        value: data.slice(i, i + chunkSize),
        associatedTag,
        offset: i,
      })
    );
    i += chunkSize;
    chunks += 1;
  }

  console.log('json chunks', chunks);

  return builder;
}

export interface BuildAllocateOptions {
  umi: Umi;
  currentSize?: number;
  targetSize: number;
  inscriptionAccount: Pda | PublicKey;
  inscriptionMetadataAccount: Pda | PublicKey;
  associatedTag: string | null;
  builder?: TransactionBuilder;
}

export function buildAllocate({
  umi,
  targetSize,
  inscriptionAccount,
  inscriptionMetadataAccount,
  associatedTag,
  ...opts
}: BuildAllocateOptions) {
  let builder = opts.builder || new TransactionBuilder();
  const currentSize = opts.currentSize || 0;

  if (currentSize < targetSize) {
    // we need to call allocate multiple times because Solana accounts can only be allocated at most 10k at a time
    const numAllocates = Math.ceil((targetSize - currentSize) / MAX_PERMITTED_DATA_INCREASE);

    for (let j = 0; j < numAllocates; j += 1) {
      builder = builder.add(
        allocate(umi, {
          inscriptionAccount,
          inscriptionMetadataAccount,
          associatedTag,
          targetSize,
        })
      );
    }
  } else {
    builder = builder.add(
      allocate(umi, {
        inscriptionAccount,
        inscriptionMetadataAccount,
        associatedTag,
        targetSize,
      })
    );
  }

  return builder;
}

export interface PrepareAndSignTxsOptions {
  umi: Umi;
  builder: TransactionBuilder;
}

export async function prepareAndSignTxs({
  umi,
  builder,
}: PrepareAndSignTxsOptions) {
  const split = builder.unsafeSplitByTransactionSize(umi);
  const txs = (await new TransactionBuilderGroup(split).setLatestBlockhash(umi)).build(umi);

  const signedTxs = await signAllTransactions(txs.map((tx) => ({
    transaction: tx,
    signers: [umi.identity],
  })));

  return signedTxs;
}
