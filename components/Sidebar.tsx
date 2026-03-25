'use client';

import { BookOpen, BrainCircuit, MessageSquare, Network, PlusCircle, Settings, BookX, ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';

export type View = 'dashboard' | 'input' | 'graph' | 'memory' | 'mistakes' | 'chat' | 'settings' | 'review';

export function Sidebar({ currentView, setView }: { currentView: View; setView: (v: View) => void }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: '总览', icon: BookOpen },
    { id: 'input', label: '录入记忆', icon: PlusCircle },
    { id: 'graph', label: '知识图谱', icon: Network },
    { id: 'memory', label: '记忆库', icon: BrainCircuit },
    { id: 'mistakes', label: '错题本', icon: BookX },
    { id: 'review', label: '记忆复习', icon: GraduationCap },
    { id: 'chat', label: 'AI 答疑', icon: MessageSquare },
  ];

  return (
    <div className={clsx(
      "bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 transition-all duration-300 relative",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-slate-800 border border-slate-700 text-slate-300 rounded-full p-1 hover:bg-slate-700 z-10"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div className={clsx("p-6 flex items-center", isCollapsed ? "justify-center px-0" : "gap-2")}>
        <BrainCircuit className="w-6 h-6 text-blue-500 shrink-0" />
        {!isCollapsed && <h1 className="text-xl font-bold text-white tracking-tight whitespace-nowrap overflow-hidden">二轮复习助手</h1>}
      </div>
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as View)}
              title={isCollapsed ? item.label : undefined}
              className={clsx(
                'w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isCollapsed ? 'justify-center px-0' : 'px-3',
                isActive
                  ? 'bg-blue-600/10 text-blue-400'
                  : 'hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className={clsx('w-5 h-5 shrink-0', isActive ? 'text-blue-400' : 'text-slate-500')} />
              {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => setView('settings')}
          title={isCollapsed ? '设置' : undefined}
          className={clsx(
            'w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isCollapsed ? 'justify-center px-0' : 'px-3',
            currentView === 'settings'
              ? 'bg-blue-600/10 text-blue-400'
              : 'hover:bg-slate-800 hover:text-white'
          )}
        >
          <Settings className={clsx('w-5 h-5 shrink-0', currentView === 'settings' ? 'text-blue-400' : 'text-slate-500')} />
          {!isCollapsed && <span className="whitespace-nowrap">设置</span>}
        </button>
      </div>
    </div>
  );
}
