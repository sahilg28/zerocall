import { NextRequest, NextResponse } from 'next/server';
import { generateAgentPick } from '@/lib/agents';
import { Match, AGENT_IDS } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, match } = body as { agentId: string; match: Match };

    if (!agentId || !(AGENT_IDS as readonly string[]).includes(agentId)) {
      return NextResponse.json(
        { success: false, error: `Invalid agentId: ${agentId}` },
        { status: 400 }
      );
    }

    if (!match?.id || !match?.homeTeam || !match?.awayTeam) {
      return NextResponse.json(
        { success: false, error: 'Invalid match data: id, homeTeam, awayTeam required' },
        { status: 400 }
      );
    }

    console.log(`[0G Compute] Agent ${agentId} predicting: ${match.homeTeam} vs ${match.awayTeam}`);
    const prediction = await generateAgentPick(agentId, match);
    console.log(`[0G Compute] Agent ${agentId} result:`, prediction.outcome, prediction.score.home + '-' + prediction.score.away);

    return NextResponse.json({ success: true, prediction });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[0G Compute] Error:`, message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
