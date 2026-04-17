'use client';

import { useState } from 'react';
import { AppProvider, useAppContext } from '../lib/store';
import { GlobalAIChatProvider } from '../lib/ai-chat-context';
import { GlobalAIPanel } from '../components/GlobalAIPanel';
import { Sidebar, View } from '../components/Sidebar';
import { SubjectSelector } from '../components/SubjectSelector';
import { Dashboard } from '../components/Dashboard';
import { InputSection } from '../components/InputSection';
import { KnowledgeGraph } from '../components/KnowledgeGraph';
import { MemoryBank } from '../components/MemoryBank';
import { MistakeBook } from '../components/MistakeBook';
import { AIChat } from '../components/AIChat';
import { Settings } from '../components/Settings';
import { ReviewSection } from '../components/ReviewSection';
import { TextbookModule } from '../components/TextbookModule';
import { ResourceLibrary } from '../components/ResourceLibrary';
import { clsx } from 'clsx';
import { useEffect } from 'react';

function MainLayout({ currentView, setCurrentView }: { currentView: View, setCurrentView: (v: View) => void }) {
  const { state } = useAppContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fontSizeMap: Record<string, string> = {
      small: '12px',
      base: '14px',
      medium: '16px',
      large: '18px'
    };
    const fontSize = fontSizeMap[state.settings.fontSize || 'base'] || '14px';
    document.documentElement.style.setProperty('--base-font-size', fontSize);
  }, [state.settings.fontSize]);

  return (
    <div className="flex h-screen bg-black font-sans overflow-hidden text-slate-200">
      <Sidebar 
        currentView={currentView} 
        setView={(v) => { setCurrentView(v); setIsMobileMenuOpen(false); }} 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <SubjectSelector onMenuClick={() => setIsMobileMenuOpen(true)} />
        <div className="flex-1 overflow-y-auto relative">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'textbooks' && <TextbookModule />}
          {currentView === 'resources' && <ResourceLibrary />}
          {currentView === 'input' && (
            <div className="max-w-6xl mx-auto h-full">
              <InputSection />
            </div>
          )}
          {currentView === 'graph' && <KnowledgeGraph />}
          {currentView === 'memory' && <MemoryBank />}
          {currentView === 'mistakes' && <MistakeBook />}
          {currentView === 'review' && <ReviewSection />}
          {currentView === 'chat' && <AIChat />}
          {currentView === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  return (
    <AppProvider>
      <GlobalAIChatProvider>
        <MainLayout currentView={currentView} setCurrentView={setCurrentView} />
        <GlobalAIPanel />
      </GlobalAIChatProvider>
    </AppProvider>
  );
}
