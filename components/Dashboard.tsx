'use client';

import { useAppContext } from '@/lib/store';
import { BrainCircuit, Target, AlertTriangle, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';

export function Dashboard() {
  const { state } = useAppContext();
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
  }, []);

  const subjectMemories = state.memories.filter((m) => m.subject === state.currentSubject);
  const weakMemories = subjectMemories.filter((m) => m.confidence <= 40);
  const recentMemories = [...subjectMemories].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  const stats = [
    { label: '总记忆点', value: subjectMemories.length, icon: BrainCircuit, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: '薄弱环节', value: weakMemories.length, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
    { label: '今日复习', value: subjectMemories.filter(m => m.lastReviewed && now > 0 && m.lastReviewed > now - 86400000).length, icon: Target, color: 'text-green-500', bg: 'bg-green-50' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{state.currentSubject} 学习总览</h2>
        <p className="text-slate-500">距离高考还有 75 天，继续保持！</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center', stat.bg)}>
                <Icon className={clsx('w-6 h-6', stat.color)} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            急需复习的薄弱点
          </h3>
          <div className="space-y-3">
            {weakMemories.length === 0 ? (
              <p className="text-slate-500 text-sm">太棒了！目前没有薄弱点。</p>
            ) : (
              weakMemories.slice(0, 5).map((m) => (
                <div key={m.id} className="p-3 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-sm text-red-900 font-medium line-clamp-2">{m.content}</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-red-600">置信度: {m.confidence}%</span>
                    <span className="text-red-400">{new Date(m.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            最近录入
          </h3>
          <div className="space-y-3">
            {recentMemories.length === 0 ? (
              <p className="text-slate-500 text-sm">暂无最近录入的记忆。</p>
            ) : (
              recentMemories.map((m) => (
                <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-sm text-slate-700 font-medium line-clamp-2">{m.content}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">{m.functionType}</span>
                    <span className="text-slate-400">{new Date(m.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
