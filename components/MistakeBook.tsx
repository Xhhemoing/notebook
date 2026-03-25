'use client';

import { useAppContext } from '@/lib/store';
import { BookX, Trash2, CheckCircle, Info, Edit } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { ImageModal } from './ImageModal';

export function MistakeBook() {
  const { state, dispatch } = useAppContext();
  const [search, setSearch] = useState('');
  const [showAnalysis, setShowAnalysis] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const mistakes = state.memories
    .filter((m) => m.subject === state.currentSubject && m.isMistake)
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

  const toggleMistake = (id: string, currentStatus: boolean | undefined) => {
    const memory = state.memories.find(m => m.id === id);
    if (memory) {
      dispatch({ type: 'UPDATE_MEMORY', payload: { ...memory, isMistake: !currentStatus } });
    }
  };

  return (
    <div className="p-6 h-full flex flex-col max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <BookX className="w-5 h-5 text-red-500" />
          {state.currentSubject} 错题本
        </h2>
      </div>

      <div className="relative mb-6">
        <input
          type="text"
          placeholder="搜索错题内容..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-10">
        {mistakes.length === 0 ? (
          <div className="text-center text-slate-500 py-10">暂无错题，继续保持！</div>
        ) : (
          mistakes.map((memory) => (
            <div key={memory.id} className="bg-white p-5 rounded-xl border border-red-100 shadow-sm hover:shadow-md transition-shadow">
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
                    placeholder="错因分析/注意"
                    className="w-full p-3 border border-red-200 bg-red-50 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none resize-y"
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleMistake(memory.id, memory.isMistake)}
                        className="text-slate-400 hover:text-green-600 p-1 flex items-center gap-1 text-xs font-medium bg-slate-50 hover:bg-green-50 rounded-md px-2"
                        title="已掌握，移出错题本"
                      >
                        <CheckCircle className="w-4 h-4" />
                        已掌握
                      </button>
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
                      className="max-h-48 rounded-lg mb-3 border border-slate-100 cursor-pointer hover:opacity-90 transition-opacity" 
                      onClick={() => setPreviewImage(memory.imageUrl!)}
                    />
                  )}

                  {memory.notes && (
                    <div className="bg-red-50 text-red-800 text-sm p-3 rounded-lg mb-3 border border-red-100">
                      <span className="font-semibold">错因分析/注意：</span>{memory.notes}
                    </div>
                  )}
                </>
              )}

              {memory.analysisProcess && (
                <div className="mb-3">
                  <button
                    onClick={() => setShowAnalysis(showAnalysis === memory.id ? null : memory.id)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Info className="w-3.5 h-3.5" />
                    {showAnalysis === memory.id ? '隐藏 AI 分析过程' : '查看 AI 分析过程'}
                  </button>
                  {showAnalysis === memory.id && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 whitespace-pre-wrap leading-relaxed">
                      {memory.analysisProcess}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                  关联节点: {memory.knowledgeNodeIds.map(id => state.knowledgeNodes.find(n => n.id === id)?.name).join(', ')}
                </span>
                <span className="text-slate-400 ml-auto">{new Date(memory.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
      {previewImage && <ImageModal src={previewImage} onClose={() => setPreviewImage(null)} />}
    </div>
  );
}
