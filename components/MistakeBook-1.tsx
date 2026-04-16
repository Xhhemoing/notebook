'use client';

import { useAppContext } from '@/lib/store';
import { BookX, Trash2, CheckCircle, Info, Edit, Search, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { ImageModal } from './ImageModal';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export function MistakeBook() {
  const { state, dispatch } = useAppContext();
  const [search, setSearch] = useState('');
  const [showAnalysis, setShowAnalysis] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editWrongAnswer, setEditWrongAnswer] = useState('');
  const [editErrorReason, setEditErrorReason] = useState('');
  const [filterReason, setFilterReason] = useState<string>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const allMistakes = state.memories.filter((m) => m.subject === state.currentSubject && m.isMistake);
  const errorReasons = Array.from(new Set(allMistakes.map(m => m.errorReason).filter(Boolean))) as string[];

  const mistakes = allMistakes
    .filter((m) => m.content.toLowerCase().includes(search.toLowerCase()))
    .filter((m) => filterReason === 'all' || m.errorReason === filterReason);

  const totalPages = Math.ceil(mistakes.length / itemsPerPage);
  const paginatedMistakes = mistakes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleEdit = (memory: any) => {
    setEditingId(memory.id);
    setEditContent(memory.content);
    setEditNotes(memory.notes || '');
    setEditWrongAnswer(memory.wrongAnswer || '');
    setEditErrorReason(memory.errorReason || '');
  };

  const handleSaveEdit = (memory: any) => {
    dispatch({
      type: 'UPDATE_MEMORY',
      payload: { 
        ...memory, 
        content: editContent, 
        notes: editNotes,
        wrongAnswer: editWrongAnswer,
        errorReason: editErrorReason
      }
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
    <div className="p-6 h-full flex flex-col max-w-6xl mx-auto text-slate-200 bg-black min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <BookX className="w-6 h-6 text-red-500" />
            </div>
            {state.currentSubject} 错题本
          </h2>
          <p className="text-slate-500 text-sm mt-1">记录薄弱环节，针对性查漏补缺</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-red-500 transition-colors" />
            <input
              type="text"
              placeholder="搜索错题..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-red-500/50 outline-none w-full md:w-64 transition-all"
            />
          </div>
          
          <div className="relative">
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="appearance-none pl-10 pr-8 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-red-500/50 outline-none text-slate-300 cursor-pointer"
            >
              <option value="all">所有错因</option>
              {errorReasons.map(reason => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {paginatedMistakes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-600 border-2 border-dashed border-slate-900 rounded-3xl">
            <BookX className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">暂无错题记录</p>
            <p className="text-sm opacity-60">继续保持，攻克每一个难点！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 pb-10">
            {paginatedMistakes.map((memory) => (
              <div key={memory.id} className="group bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden hover:border-red-500/20 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/5">
                <div className="p-6">
                  {editingId === memory.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">题目内容</label>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-red-500/50 outline-none resize-none h-32"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">错误答案</label>
                          <textarea
                            value={editWrongAnswer}
                            onChange={(e) => setEditWrongAnswer(e.target.value)}
                            className="w-full p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-sm focus:ring-2 focus:ring-red-500/50 outline-none h-24"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">错因分析</label>
                          <textarea
                            value={editErrorReason}
                            onChange={(e) => setEditErrorReason(e.target.value)}
                            className="w-full p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/50 outline-none h-24"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => handleSaveEdit(memory)}
                          className="px-6 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-lg shadow-red-600/20"
                        >
                          保存修改
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed">
                          <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{memory.content}</Markdown>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => toggleMistake(memory.id, memory.isMistake)}
                            className="p-2 text-slate-500 hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-all"
                            title="已掌握"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(memory)}
                            className="p-2 text-slate-500 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all"
                            title="编辑"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => dispatch({ type: 'DELETE_MEMORY', payload: memory.id })}
                            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            title="删除"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {memory.imageUrl && (
                        <div className="relative w-fit group/img">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={memory.imageUrl} 
                            alt="Mistake Source" 
                            className="max-h-64 rounded-xl border border-slate-800 cursor-pointer hover:border-red-500/50 transition-all" 
                            onClick={() => setPreviewImage(memory.imageUrl!)}
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none rounded-xl" />
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {memory.wrongAnswer && (
                          <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              <span className="text-xs font-bold text-red-500/80 uppercase tracking-wider">错误答案</span>
                            </div>
                            <div className="text-sm text-red-200/90 prose prose-invert prose-sm max-w-none">
                              <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{memory.wrongAnswer}</Markdown>
                            </div>
                          </div>
                        )}
                        {memory.errorReason && (
                          <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                              <span className="text-xs font-bold text-orange-500/80 uppercase tracking-wider">错因分析</span>
                            </div>
                            <div className="text-sm text-orange-200/90 prose prose-invert prose-sm max-w-none">
                              <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{memory.errorReason}</Markdown>
                            </div>
                          </div>
                        )}
                      </div>

                      {memory.notes && (
                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">补充说明</span>
                          </div>
                          <div className="text-sm text-slate-400 prose prose-invert prose-sm max-w-none">
                            <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{memory.notes}</Markdown>
                          </div>
                        </div>
                      )}

                      {memory.analysisProcess && (
                        <div>
                          <button
                            onClick={() => setShowAnalysis(showAnalysis === memory.id ? null : memory.id)}
                            className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                          >
                            <Info className="w-3.5 h-3.5" />
                            {showAnalysis === memory.id ? '隐藏 AI 分析过程' : '查看 AI 分析过程'}
                          </button>
                          {showAnalysis === memory.id && (
                            <div className="mt-3 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-xs text-indigo-200/80 leading-relaxed prose prose-invert prose-sm max-w-none animate-in fade-in slide-in-from-top-2">
                              <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{memory.analysisProcess}</Markdown>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800/50">
                        <div className="flex flex-wrap gap-2">
                          {Array.from(new Set(memory.knowledgeNodeIds)).map((id, index) => {
                            const node = state.knowledgeNodes.find(n => n.id === id);
                            if (!node) return null;
                            return (
                              <span key={`${id}-${index}`} className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-medium border border-slate-700">
                                {node.name}
                              </span>
                            );
                          })}
                        </div>
                        <span className="text-[10px] text-slate-600 font-mono">
                          {new Date(memory.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8 pb-8">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-200">{currentPage}</span>
            <span className="text-sm text-slate-600">/</span>
            <span className="text-sm text-slate-500">{totalPages}</span>
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {previewImage && <ImageModal src={previewImage} onClose={() => setPreviewImage(null)} />}
    </div>
  );
}
