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

const MENU_ITEMS = [
  { id: 'model-service', label: '模型服务', icon: Cpu },
  { id: 'model-allocation', label: '模型分配', icon: Database },
  { id: 'app-settings', label: '应用设置', icon: SettingsIcon },
  { id: 'mcp-tools', label: 'MCP工具', icon: Wrench },
  { id: 'external-search', label: '外部搜索', icon: Globe },
  { id: 'data-stats', label: '数据统计', icon: BarChart2 },
  { id: 'data-governance', label: '数据治理', icon: Shield },
  { id: 'parameter-tuning', label: '参数调整', icon: Sliders },
  { id: 'logs', label: 'AI 日志', icon: FileText },
  { id: 'shortcuts', label: '快捷键', icon: Keyboard },
  { id: 'about', label: '关于', icon: HelpCircle },
];

export function Settings() {
  const { state, dispatch } = useAppContext();
  const [activeTab, setActiveTab] = useState('model-service');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex h-full bg-[#1e1e1e] text-slate-200 overflow-hidden">
      {/* Main Sidebar */}
      <div className="w-48 bg-[#1e1e1e] border-r border-slate-800 flex flex-col shrink-0">
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

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
        <div className="h-14 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
          <h2 className="text-lg font-medium text-slate-200">
            {MENU_ITEMS.find(i => i.id === activeTab)?.label}
          </h2>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saved ? '已保存' : '保存设置'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="max-w-5xl mx-auto">
            {activeTab === 'model-service' && <AISettings />}
            {activeTab === 'model-allocation' && <ModelAllocationSettings />}
            {activeTab === 'app-settings' && <GeneralSettings />}
            {activeTab === 'data-governance' && <DataSettings />}
            {activeTab === 'logs' && <LogSettings />}
            
            {/* Placeholders for unimplemented tabs */}
            {['mcp-tools', 'external-search', 'data-stats', 'parameter-tuning', 'shortcuts', 'about'].includes(activeTab) && (
              <div className="flex items-center justify-center h-64 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                此功能正在开发中...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
