'use client';

import { useAppContext } from '@/lib/store';
import { Settings as SettingsIcon, Save, Cloud, Download, Upload, Loader2, Info, FileJson, Database, Trash2, GraduationCap, Cpu, ChevronDown, ChevronUp, ExternalLink, Book, FileText, BookOpen, X, Search, BarChart2, Shield, Sliders, Keyboard, HelpCircle, Wrench, Globe } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import AISettings from './settings/AISettings';
import GeneralSettings from './settings/GeneralSettings';
import DataSettings from './settings/DataSettings';
import LogSettings from './settings/LogSettings';
import ModelAllocationSettings from './settings/ModelAllocationSettings';
import DataGovernanceSettings from './settings/DataGovernanceSettings';
import DataStatsSettings from './settings/DataStatsSettings';
import { DataManager } from './DataManager';

const MENU_ITEMS = [
  { id: 'app-settings', label: '通用设置', icon: SettingsIcon },
  { id: 'model-service', label: '模型服务', icon: Cpu },
  { id: 'data-management', label: '数据管理', icon: Database },
  { id: 'data-governance', label: '数据治理', icon: Shield },
  { id: 'data-stats', label: '数据统计', icon: BarChart2 },
  { id: 'logs', label: 'AI 日志', icon: FileText },
  { id: 'about', label: '关于', icon: HelpCircle },
];

export function Settings() {
  const { state, dispatch } = useAppContext();
  const [activeTab, setActiveTab] = useState('app-settings');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-[#1e1e1e] text-slate-200 overflow-hidden">
      {/* Main Sidebar (Desktop) */}
      <div className="hidden md:flex w-48 bg-[#1e1e1e] border-r border-slate-800 flex-col shrink-0">
        <div className="p-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="搜索设置..." 
              className="w-full bg-[#252526] border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2 custom-scrollbar">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                activeTab === item.id 
                  ? "bg-slate-800 text-slate-200" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Top Menu */}
      <div className="md:hidden flex overflow-x-auto border-b border-slate-800 bg-[#1e1e1e] shrink-0 no-scrollbar p-2 gap-2">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={clsx(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
              activeTab === item.id 
                ? "bg-slate-800 text-slate-200" 
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
            )}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
        <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 shrink-0">
          <h2 className="text-base md:text-lg font-medium text-slate-200">
            {MENU_ITEMS.find(i => i.id === activeTab)?.label}
          </h2>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-3 py-1.5 md:px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs md:text-sm font-medium transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saved ? '已保存' : '保存设置'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <div className="max-w-5xl mx-auto">
            {activeTab === 'model-service' && (
              <div className="space-y-8">
                <ModelAllocationSettings />
                <div className="pt-8 border-t border-slate-800">
                  <h3 className="text-lg font-medium text-slate-200 mb-6 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-indigo-400" />
                    AI 供应商配置
                  </h3>
                  <AISettings />
                </div>
              </div>
            )}
            {activeTab === 'data-management' && <DataManager />}
            {activeTab === 'app-settings' && <GeneralSettings />}
            {activeTab === 'data-governance' && (
              <div className="space-y-8">
                <DataSettings />
                <div className="pt-8 border-t border-slate-800">
                  <h3 className="text-lg font-medium text-slate-200 mb-6 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-400" />
                    数据清理与维护
                  </h3>
                  <DataGovernanceSettings />
                </div>
              </div>
            )}
            {activeTab === 'data-stats' && <DataStatsSettings />}
            {activeTab === 'logs' && <LogSettings />}
            
            {activeTab === 'about' && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20">
                  <GraduationCap className="w-12 h-12 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">高考 AI 学习助手</h3>
                  <p className="text-slate-500 mt-2">版本 2.1.0 (Stable)</p>
                </div>
                <p className="max-w-md text-slate-400 leading-relaxed">
                  专为高考学子打造的智能化学习辅助系统。集成 FSRS 记忆算法、RAG 知识检索与 AI 深度分析，助您高效备考。
                </p>
                <div className="flex gap-4">
                  <button className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors">
                    <Globe className="w-4 h-4" />
                    官方网站
                  </button>
                  <button className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors">
                    <ExternalLink className="w-4 h-4" />
                    检查更新
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
