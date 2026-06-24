import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/components/AppProvider';
import { AdBoard } from '@/components/AdBoard';
import { Nav } from '@/components/Nav';
import { MatchTicker } from '@/components/MatchTicker';
import SiteBackground from '@/components/SiteBackground';
import { PageLoader } from '@/components/PageLoader';
import { ZeroGFeed } from '@/components/ZeroGFeed';

export const metadata: Metadata = {
  title: 'ZeroCall — Predict the World Cup. Beat the AI. On 0G.',
  description: 'Predict every World Cup 2026 match before kickoff. Beat our AI agents, climb the global leaderboard, and lock your calls on 0G.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="crt-flicker min-h-screen flex flex-col">
        <SiteBackground />
        <div className="crt-overlay" />
        <AppProvider>
          <PageLoader />
          <div className="relative z-[1] flex flex-col min-h-screen">
            <Nav />
            <MatchTicker />
            <ZeroGFeed />
            <main className="flex-1">{children}</main>
            <AdBoard />
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
