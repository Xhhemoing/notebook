'use client';

import { useAppContext } from '@/lib/store';
import { Download, BrainCircuit, Search, Trash2, Edit } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { ImageModal } from './ImageModal';

export function MemoryBank() {
  const { state, dispatch } = useAppContext();
  const [search, setSearch] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const memories = state.memories
    .filter((m) => m.subject === state.currentSubject)
    .filter((m) => m.content.toLowerCase().includes(search.toLowerCase()));

  const handleEdit = (memory: any) => {
    setEditingId(memory.id);
    setEditContent(memory.content);
    setEditNotes(memory.notes || '');
  };

  const handleSaveEdit = (memory: any) => {
    dispatch({
      type: 'UPDATE_MEMORY',
      payload: { ...memory, content: editContent, notes: editNotes }
    });
    setEditingId(null);
  };

  const exportToAnki = () => {
    // Generate simple CSV for Anki import: Front,Back
    const csvContent = memories
      .map((m) => {
        const front = `[${m.functionType}] ${m.content.replace(/"/g, '""')}`;
        const back = `关联节点: ${m.knowledgeNodeIds.map(id => state.knowledgeNodes.find(n => n.id === id)?.name).join(', ')}<br/>分类: ${m.purposeType}<br/>${m.notes || ''}`;
        return `"${front}","${back}"`;
      })
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${state.currentSubject}_anki_export.csv`;
    link.click();
  };

  return (
    <div className="p-6 h-full flex flex-col max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-blue-500" />
          {state.currentSubject} 记忆库
        </h2>
        <button
          onClick={exportToAnki}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          导出为 Anki 卡片
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="搜索记忆点、错题..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-10">
        {memories.length === 0 ? (
          <div className="text-center text-slate-500 py-10">暂无记忆，快去录入吧！</div>
        ) : (
          memories.map((memory) => (
            <div key={memory.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              {editingId === memory.id ? (
                <div className="space-y-3 mb-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                    rows={3}
                  />
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="注意/补充说明"
                    className="w-full p-3 border border-amber-200 bg-amber-50 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-y"
                    rows={2}
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleSaveEdit(memory)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                    >
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <p className="text-slate-800 font-medium leading-relaxed">{memory.content}</p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(memory)}
                        className="text-slate-400 hover:text-blue-500 p-1"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => dispatch({ type: 'DELETE_MEMORY', payload: memory.id })}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {memory.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={memory.imageUrl} 
                      alt="Source" 
                      className="max-h-32 rounded-lg mb-3 border border-slate-100 cursor-pointer hover:opacity-90 transition-opacity" 
                      onClick={() => setPreviewImage(memory.imageUrl!)}
                    />
                  )}

                  {memory.notes && (
                    <div className="bg-amber-50 text-amber-800 text-sm p-3 rounded-lg mb-3 border border-amber-100">
                      <span className="font-semibold">注意：</span>{memory.notes}
                    </div>
                  )}
                </>
              )}

              {memory.analysisProcess && (
                <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg mb-3 border border-blue-100 whitespace-pre-wrap">
                  <span className="font-semibold">AI 分析：</span>{memory.analysisProcess}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                  {memory.functionType}
                </span>
                <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full font-medium">
                  {memory.purposeType}
                </span>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                  节点: {memory.knowledgeNodeIds.map(id => state.knowledgeNodes.find(n => n.id === id)?.name).join(', ')}
                </span>
                
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-slate-500">掌握度:</span>
                  <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        'h-full rounded-full',
                        memory.confidence > 70 ? 'bg-green-500' : memory.confidence > 40 ? 'bg-amber-500' : 'bg-red-500'
                      )}
                      style={{ width: `${memory.confidence}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {previewImage && <ImageModal src={previewImage} onClose={() => setPreviewImage(null)} />}
    </div>
  );
}
