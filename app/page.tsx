'use client';

import { useState } from 'react';
import { AppProvider } from '@/lib/store';
import { Sidebar, View } from '@/components/Sidebar';
import { SubjectSelector } from '@/components/SubjectSelector';
import { Dashboard } from '@/components/Dashboard';
import { InputSection } from '@/components/InputSection';
import { KnowledgeGraph } from '@/components/KnowledgeGraph';
import { MemoryBank } from '@/components/MemoryBank';
import { MistakeBook } from '@/components/MistakeBook';
import { AIChat } from '@/components/AIChat';
import { Settings } from '@/components/Settings';
import { ReviewSection } from '@/components/ReviewSection';
import { clsx } from 'clsx';

export default function Home() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  return (
    <AppProvider>
      <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
        <Sidebar currentView={currentView} setView={setCurrentView} />
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <SubjectSelector />
          <div className="flex-1 overflow-y-auto relative">
            <div className={clsx("absolute inset-0 overflow-y-auto", currentView === 'dashboard' ? 'block' : 'hidden')}>
              <Dashboard />
            </div>
            <div className={clsx("absolute inset-0 overflow-y-auto", currentView === 'input' ? 'block' : 'hidden')}>
              <InputSection />
            </div>
            <div className={clsx("absolute inset-0 overflow-y-auto", currentView === 'graph' ? 'block' : 'hidden')}>
              <KnowledgeGraph />
            </div>
            <div className={clsx("absolute inset-0 overflow-y-auto", currentView === 'memory' ? 'block' : 'hidden')}>
              <MemoryBank />
            </div>
            <div className={clsx("absolute inset-0 overflow-y-auto", currentView === 'mistakes' ? 'block' : 'hidden')}>
              <MistakeBook />
            </div>
            <div className={clsx("absolute inset-0 overflow-y-auto", currentView === 'review' ? 'block' : 'hidden')}>
              <ReviewSection />
            </div>
            <div className={clsx("absolute inset-0 overflow-y-auto", currentView === 'chat' ? 'block' : 'hidden')}>
              <AIChat />
            </div>
            <div className={clsx("absolute inset-0 overflow-y-auto", currentView === 'settings' ? 'block' : 'hidden')}>
              <Settings />
            </div>
          </div>
        </main>
      </div>
    </AppProvider>
  );
}
