'use client';

import { useAppContext } from '@/lib/store';
import { Settings as SettingsIcon, Save, Cloud, Download, Upload, Loader2, Info, FileJson } from 'lucide-react';
import { useState, useRef } from 'react';
import { pushToCloudflare, pullFromCloudflare } from '@/lib/sync';

const MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (默认，速度快)' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (推荐，推理能力强)' },
  { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite (轻量级)' },
];

export function Settings() {
  const { state, dispatch } = useAppContext();
  const [parseModel, setParseModel] = useState(state.settings.parseModel);
  const [chatModel, setChatModel] = useState(state.settings.chatModel);
  const [graphModel, setGraphModel] = useState(state.settings.graphModel);
  const [homeworkPreferences, setHomeworkPreferences] = useState(state.settings.homeworkPreferences || '');
  
  const [cfWorkerUrl, setCfWorkerUrl] = useState(state.settings.cfWorkerUrl || '');
  const [cfSyncToken, setCfSyncToken] = useState(state.settings.cfSyncToken || '');
  
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState<'push' | 'pull' | null>(null);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { parseModel, chatModel, graphModel, cfWorkerUrl, cfSyncToken, homeworkPreferences },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ais_memory_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedState = JSON.parse(event.target?.result as string);
        if (importedState && importedState.memories && importedState.knowledgeNodes) {
          dispatch({ type: 'LOAD_STATE', payload: importedState });
          setSyncMessage({ type: 'success', text: '本地数据导入成功！' });
        } else {
          throw new Error('Invalid data format');
        }
      } catch (error) {
        setSyncMessage({ type: 'error', text: '导入失败：文件格式不正确' });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleSync = async (type: 'push' | 'pull') => {
    if (!cfWorkerUrl || !cfSyncToken) {
      setSyncMessage({ type: 'error', text: '请先填写 Cloudflare Worker URL 和 Token' });
      return;
    }

    setSyncing(type);
    setSyncMessage(null);

    try {
      if (type === 'push') {
        await pushToCloudflare(state, cfWorkerUrl, cfSyncToken);
        dispatch({ type: 'SET_LAST_SYNCED', payload: Date.now() });
        setSyncMessage({ type: 'success', text: '数据已成功推送到云端' });
      } else {
        const remoteState = await pullFromCloudflare(cfWorkerUrl, cfSyncToken);
        if (remoteState) {
          dispatch({ type: 'LOAD_STATE', payload: remoteState });
          setSyncMessage({ type: 'success', text: '数据已从云端拉取并覆盖本地' });
        } else {
          setSyncMessage({ type: 'success', text: '云端暂无数据' });
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncMessage({ type: 'error', text: `同步失败: ${error instanceof Error ? error.message : '未知错误'}` });
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-blue-500" />
          系统设置
        </h2>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              记忆录入与解析模型
            </label>
            <p className="text-xs text-slate-500 mb-2">用于分析散乱笔记，提取知识点并分类。</p>
            <select
              value={parseModel}
              onChange={(e) => setParseModel(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              AI 答疑辅导模型
            </label>
            <p className="text-xs text-slate-500 mb-2">用于在聊天界面回答你的问题，结合记忆库进行辅导。</p>
            <select
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              知识图谱调整模型
            </label>
            <p className="text-xs text-slate-500 mb-2">用于理解你对知识图谱的修改指令（如“合并节点”、“移动节点”）。</p>
            <select
              value={graphModel}
              onChange={(e) => setGraphModel(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              作业与错题解析偏好 (记忆用户标记)
            </label>
            <p className="text-xs text-slate-500 mb-2">告诉 AI 你在作业上的标记习惯，例如：“+号代表需要加入错题本，打叉代表做错了，波浪线代表不确定”。AI 会根据这些偏好进行精准识别。</p>
            <textarea
              value={homeworkPreferences}
              onChange={(e) => setHomeworkPreferences(e.target.value)}
              placeholder="输入你的标记习惯..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] resize-y"
            />
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              {saved ? '已保存' : '保存设置'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
          <Cloud className="w-5 h-5 text-orange-500" />
          Cloudflare D1 数据同步
        </h2>
        
        <div className="space-y-6">
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-sm text-orange-800">
            <p className="font-medium mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              如何配置同步？
            </p>
            <p className="mb-2">你需要自己部署一个 Cloudflare Worker 并绑定 D1 数据库。部署完成后，将 Worker 的 URL 和你设置的 Token 填入下方。</p>
            <details className="cursor-pointer">
              <summary className="font-medium text-orange-700 hover:text-orange-900">查看 Worker 部署代码 (点击展开)</summary>
              <div className="mt-3 space-y-3 text-xs font-mono bg-white p-3 rounded border border-orange-200 overflow-x-auto">
                <p className="text-slate-500">1. D1 数据库 Schema (schema.sql):</p>
                <pre className="text-slate-700">
{`CREATE TABLE IF NOT EXISTS app_state (
  id TEXT PRIMARY KEY,
  state_json TEXT,
  updated_at INTEGER
);`}
                </pre>
                <p className="text-slate-500 mt-4">2. Worker 代码 (worker.ts):</p>
                <pre className="text-slate-700">
{`export interface Env {
  DB: D1Database;
  SYNC_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const authHeader = request.headers.get('Authorization');
    if (authHeader !== "Bearer " + env.SYNC_TOKEN) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/sync') {
      const { results } = await env.DB.prepare('SELECT state_json FROM app_state WHERE id = ?').bind('main').all();
      if (results.length === 0) return new Response('{}', { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(results[0].state_json as string, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (request.method === 'POST' && url.pathname === '/sync') {
      const body = await request.text();
      await env.DB.prepare('INSERT INTO app_state (id, state_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at')
        .bind('main', body, Date.now()).run();
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response('Not found', { status: 404, headers: corsHeaders });
  }
}`}
                </pre>
              </div>
            </details>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cloudflare Worker URL
              </label>
              <input
                type="text"
                value={cfWorkerUrl}
                onChange={(e) => setCfWorkerUrl(e.target.value)}
                placeholder="https://your-worker.your-subdomain.workers.dev"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sync Token (同步密钥)
              </label>
              <input
                type="password"
                value={cfSyncToken}
                onChange={(e) => setCfSyncToken(e.target.value)}
                placeholder="你在 Worker 环境变量中设置的 SYNC_TOKEN"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          {syncMessage && (
            <div className={syncMessage.type === 'success' ? 'p-3 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200' : 'p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200'}>
              {syncMessage.text}
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => handleSync('push')}
              disabled={syncing !== null}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white rounded-lg font-medium transition-colors"
            >
              {syncing === 'push' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              推送到云端
            </button>
            <button
              onClick={() => handleSync('pull')}
              disabled={syncing !== null}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 disabled:bg-slate-100 text-slate-700 rounded-lg font-medium transition-colors"
            >
              {syncing === 'pull' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              从云端拉取
            </button>
            
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              <FileJson className="w-4 h-4" />
              导出本地备份
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              导入本地备份
            </button>
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImportJSON}
            />

            {state.lastSynced && (
              <span className="text-xs text-slate-500 ml-auto">
                上次同步: {new Date(state.lastSynced).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
