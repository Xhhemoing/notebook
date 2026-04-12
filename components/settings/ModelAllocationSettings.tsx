import React from 'react';
import { useAppContext } from '@/lib/store';
import { Cpu } from 'lucide-react';

const MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
  { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite' },
];

const EMBEDDING_MODELS = [
  { id: 'text-embedding-004', name: 'Text Embedding 004' },
  { id: 'gemini-embedding-2-preview', name: 'Gemini Embedding 2 Preview' },
];

export default function ModelAllocationSettings() {
  const { state, dispatch } = useAppContext();

  const updateSetting = (key: string, value: string) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: value } });
  };

  const renderModelSelect = (label: string, key: string, value: string, type: 'chat' | 'embedding' = 'chat') => {
    const defaultModels = type === 'embedding' ? EMBEDDING_MODELS : MODELS;
    
    return (
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
        <select
          value={value}
          onChange={(e) => updateSetting(key, e.target.value)}
          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-200"
        >
          <optgroup label="默认模型">
            {defaultModels.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </optgroup>
          {state.settings.customProviders && state.settings.customProviders.length > 0 && (
            <optgroup label="自定义提供商模型">
              {state.settings.customProviders.flatMap(p => 
                p.models
                  .filter(m => type === 'embedding' ? m.id.toLowerCase().includes('embed') : !m.id.toLowerCase().includes('embed'))
                  .map(m => (
                    <option key={`${p.id}:${m.id}`} value={`${p.id}:${m.id}`}>[{p.name}] {m.name}</option>
                  ))
              )}
            </optgroup>
          )}
          {state.settings.customModels && state.settings.customModels.length > 0 && (
            <optgroup label="收藏模型">
              {state.settings.customModels
                .filter(m => type === 'embedding' ? m.modelId.toLowerCase().includes('embed') : !m.modelId.toLowerCase().includes('embed'))
                .map(m => (
                  <option key={m.id} value={m.id}>[自定义] {m.name}</option>
                ))}
            </optgroup>
          )}
        </select>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <section className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4" />
          模型分配
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderModelSelect('笔记解析模型', 'parseModel', state.settings.parseModel)}
            {renderModelSelect('AI 答疑模型', 'chatModel', state.settings.chatModel)}
            {renderModelSelect('知识图谱生成模型', 'graphModel', state.settings.graphModel)}
            {renderModelSelect('复习出题模型', 'reviewModel', state.settings.reviewModel)}
            {renderModelSelect('向量化模型 (Embedding)', 'embeddingModel', state.settings.embeddingModel || 'gemini-embedding-2-preview', 'embedding')}
          </div>
        </div>
      </section>
    </div>
  );
}
