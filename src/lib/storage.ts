import { ZgFile, Indexer } from '@0glabs/0g-ts-sdk';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const RPC_URL = process.env.RPC_URL || 'https://evmrpc-testnet.0g.ai';
const STORAGE_INDEXER = process.env.STORAGE_INDEXER || 'https://indexer-storage-testnet-turbo.0g.ai';
const EXPLORER_BASE = 'https://storagescan-galileo.0g.ai';

export interface StorageResult {
  rootHash: string;
  explorerUrl: string;
  success: boolean;
  error?: string;
}

export async function uploadPickToStorage(pickData: object): Promise<StorageResult> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    return {
      rootHash: '',
      explorerUrl: '',
      success: false,
      error: 'PRIVATE_KEY not configured — cannot write to 0G Storage',
    };
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const indexer = new Indexer(STORAGE_INDEXER);

  const jsonStr = JSON.stringify(pickData, null, 2);
  const tempPath = path.join(os.tmpdir(), `zerocall-pick-${Date.now()}.json`);
  fs.writeFileSync(tempPath, jsonStr);

  const file = await ZgFile.fromFilePath(tempPath);
  try {
    const [tree, treeErr] = await file.merkleTree();
    if (treeErr) {
      return { rootHash: '', explorerUrl: '', success: false, error: `Merkle tree error: ${treeErr}` };
    }

    const rootHash = tree!.rootHash() ?? '';

    const [, uploadErr] = await indexer.upload(file, RPC_URL, wallet as any);
    if (uploadErr) {
      return { rootHash: '', explorerUrl: '', success: false, error: `Upload failed: ${uploadErr.message}` };
    }

    return {
      rootHash,
      explorerUrl: `${EXPLORER_BASE}/tx/${rootHash}`,
      success: true,
    };
  } finally {
    await file.close();
    try { fs.unlinkSync(tempPath); } catch {}
  }
}
