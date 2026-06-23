import { NextRequest, NextResponse } from 'next/server';
import { generateAgentPick } from '@/lib/agents';
import { Match } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { agentId, match } = (await req.json()) as { agentId: string; match: Match };

    const prediction = await generateAgentPick(agentId, match);

    return NextResponse.json({ success: true, prediction });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
