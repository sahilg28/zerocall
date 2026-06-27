import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { uploadPickToStorage } from '@/lib/storage';

const EXPLORER_BASE = 'https://storagescan-galileo.0g.ai';

function demoHash(pickData: object): string {
  const h = createHash('sha256').update(JSON.stringify(pickData)).digest('hex');
  return `0x${h}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const pickData = {
      ...body,
      app: 'ZeroCall',
      version: '1.0',
      type: body.type || 'prediction',
      timestamp: body.timestamp || new Date().toISOString(),
    };

    console.log('[0G Storage] Uploading:', pickData.type, '| keys:', Object.keys(pickData).join(', '));

    const result = await uploadPickToStorage(pickData);

    if (!result.success) {
      console.log('[0G Storage] Upload failed, falling back to demo hash:', result.error);
      const fake = demoHash(pickData);
      return NextResponse.json({
        success: true,
        demo: true,
        rootHash: fake,
        explorerUrl: `${EXPLORER_BASE}/tx/${fake}`,
        note: result.error,
      });
    }

    console.log('[0G Storage] SUCCESS — rootHash:', result.rootHash);
    return NextResponse.json({
      success: true,
      demo: false,
      rootHash: result.rootHash,
      explorerUrl: result.explorerUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[0G Storage] Exception:', message);
    return NextResponse.json(
      { success: false, error: message, fallback: true },
      { status: 200 }
    );
  }
}
