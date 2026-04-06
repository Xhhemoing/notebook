import React, { useState } from 'react';
import { useAppContext } from '@/lib/store';
import { CustomProvider } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { Cpu, Plus, Trash2, X, Eye, EyeOff, Download, Activity, Edit2, Check } from 'lucide-react';
import clsx from 'clsx';

const BUILT_IN_PROVIDERS = [
  { id: 'siliconflow', name: '硅基流动', type: 'openai', baseUrl: 'https://api.siliconflow.cn/v1' },
  { id: 'tongyi', name: '通义千问', type: 'openai', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { id: 'moonshot', name: '月之暗面', type: 'openai', baseUrl: 'https://api.moonshot.cn/v1' },
  { id: 'zhipu', name: '智谱AI', type: 'openai', baseUrl: 'https://open.bigmodel.cn/api/paas/v4/' },
  { id: 'doubao', name: '字节豆包', type: 'openai', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3' },
  { id: 'deepseek', name: 'DeepSeek', type: 'openai', baseUrl: 'https://api.deepseek.com/v1' },
  { id: 'gemini', name: 'Google Gemini', type: 'gemini', baseUrl: '' },
  { id: 'minimax', name: 'MiniMax', type: 'openai', baseUrl: 'https://api.minimax.chat/v1' },
  { id: 'openai', name: 'OpenAI', type: 'openai', baseUrl: 'https://api.openai.com/v1' },
];

export default function AISettings() {
  const { state, dispatch } = useAppContext();
  const providers = state.settings.customProviders || [];
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(providers.length > 0 ? providers[0].id : null);
  const [showApiKey, setShowApiKey] = useState(false);

  const selectedProvider = providers.find(p => p.id === selectedProviderId);

  const handleAddProvider = () => {
    const newProvider: CustomProvider = {
      id: `provider-${uuidv4()}`,
      name: '新供应商',
      type: 'openai',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      models: []
    };
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { customProviders: [...providers, newProvider] }
    });
    setSelectedProviderId(newProvider.id);
  };

  const updateProvider = (id: string, updates: Partial<CustomProvider>) => {
    const newProviders = providers.map(p => p.id === id ? { ...p, ...updates } : p);
    dispatch({ type: 'UPDATE_SETTINGS', payload: { customProviders: newProviders } });
  };

  const deleteProvider = (id: string) => {
    const newProviders = providers.filter(p => p.id !== id);
    dispatch({ type: 'UPDATE_SETTINGS', payload: { customProviders: newProviders } });
    if (selectedProviderId === id) {
      setSelectedProviderId(newProviders.length > 0 ? newProviders[0].id : null);
    }
  };

  const handleAddModel = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;
    const newModels = [...provider.models, { id: '', name: '新模型' }];
    updateProvider(providerId, { models: newModels });
  };

  const updateModel = (providerId: string, modelIndex: number, updates: { id?: string, name?: string }) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;
    const newModels = [...provider.models];
    newModels[modelIndex] = { ...newModels[modelIndex], ...updates };
    updateProvider(providerId, { models: newModels });
  };

  const deleteModel = (providerId: string, modelIndex: number) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;
    const newModels = [...provider.models];
    newModels.splice(modelIndex, 1);
    updateProvider(providerId, { models: newModels });
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-[#1e1e1e] rounded-2xl border border-slate-800 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[#1e1e1e] border-r border-slate-800 flex flex-col">
        <div className="p-4 flex items-center justify-between text-slate-400">
          <span className="text-sm font-medium">供应商列表</span>
          <button onClick={handleAddProvider} className="hover:text-slate-200">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {providers.map(provider => (
            <button
              key={provider.id}
              onClick={() => setSelectedProviderId(provider.id)}
              className={clsx(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                selectedProviderId === provider.id 
                  ? "bg-indigo-500/20 text-indigo-400" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <div className={clsx("w-2 h-2 rounded-full", provider.apiKey ? "bg-green-500" : "bg-slate-600")} />
                <span className="truncate">{provider.name}</span>
              </div>
              <span className="text-xs text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded">
                {provider.models.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-[#1e1e1e]">
        {selectedProvider ? (
          <div className="p-8 max-w-3xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={selectedProvider.name}
                  onChange={(e) => updateProvider(selectedProvider.id, { name: e.target.value })}
                  className="text-2xl font-bold bg-transparent border-none focus:ring-0 text-slate-200 p-0"
                />
              </div>
              <button 
                onClick={() => deleteProvider(selectedProvider.id)}
                className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              >
                删除
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2">接口地址</label>
                <input
                  type="text"
                  value={selectedProvider.baseUrl || ''}
                  onChange={(e) => updateProvider(selectedProvider.id, { baseUrl: e.target.value })}
                  className="w-full p-3 bg-[#252526] border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="https://api.openai.com/v1"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">API 密钥</label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={selectedProvider.apiKey}
                    onChange={(e) => updateProvider(selectedProvider.id, { apiKey: e.target.value })}
                    className="w-full p-3 pr-10 bg-[#252526] border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500 font-mono"
                    placeholder="sk-..."
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg text-sm transition-colors">
                  <Activity className="w-4 h-4" />
                  连通性测试
                </button>
                <button 
                  onClick={() => updateProvider(selectedProvider.id, { apiKey: '' })}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm transition-colors ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  清除
                </button>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-slate-200">模型列表</h3>
                  <p className="text-sm text-slate-500">共 {selectedProvider.models.length} 个模型</p>
                </div>
                <button 
                  onClick={() => handleAddModel(selectedProvider.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#252526] hover:bg-slate-800 text-slate-300 rounded-lg text-sm transition-colors border border-slate-800"
                >
                  <Plus className="w-4 h-4" />
                  添加模型
                </button>
              </div>

              <div className="space-y-3">
                {selectedProvider.models.map((model, index) => (
                  <div key={index} className="p-4 bg-[#252526] border border-slate-800 rounded-xl flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={model.name}
                        onChange={(e) => updateModel(selectedProvider.id, index, { name: e.target.value })}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-200 p-0"
                        placeholder="显示名称 (如 DeepSeek Chat)"
                      />
                      <input
                        type="text"
                        value={model.id}
                        onChange={(e) => updateModel(selectedProvider.id, index, { id: e.target.value })}
                        className="w-full bg-transparent border-none focus:ring-0 text-xs text-slate-500 p-0 font-mono"
                        placeholder="模型 ID (如 deepseek-chat)"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-slate-500 hover:text-slate-300">
                        <Activity className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteModel(selectedProvider.id, index)}
                        className="p-2 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {selectedProvider.models.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
                    暂无模型，请点击右上角添加
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            请在左侧选择或添加一个供应商
          </div>
        )}
      </div>
    </div>
  );
}
