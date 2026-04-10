'use client';

import { useAppContext } from '@/lib/store';
import { Database, Trash2, Edit, Search, FileText, BrainCircuit, Network, HardDrive, CheckSquare, Square, Filter, AlertTriangle, Zap, RefreshCw, Layers, ShieldAlert, Sparkles } from 'lucide-react';
import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { Memory, KnowledgeNode, Textbook, Subject } from '@/lib/types';

export function DataManager() {
  const { state, dispatch } = useAppContext();
  const [activeTab, setActiveTab] = useState<'memories' | 'rag' | 'textbooks' | 'resources'>('memories');
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryContent, setEditingMemoryContent] = useState('');
  
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeContent, setEditingNodeContent] = useState('');

  const toggleCollapse = (id: string) => {
    const newCollapsed = new Set(collapsedItems);
    if (newCollapsed.has(id)) {
      newCollapsed.delete(id);
    } else {
      newCollapsed.add(id);
    }
    setCollapsedItems(newCollapsed);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`确定要删除选中的 ${selectedIds.size} 项数据吗？此操作不可撤销。`)) {
      const ids = Array.from(selectedIds);
      if (activeTab === 'memories') {
        dispatch({ type: 'BATCH_DELETE_MEMORIES', payload: ids });
      } else if (activeTab === 'rag') {
        dispatch({ type: 'BATCH_DELETE_NODES', payload: ids });
      } else if (activeTab === 'textbooks') {
        dispatch({ type: 'BATCH_DELETE_TEXTBOOKS', payload: ids });
      } else if (activeTab === 'resources') {
        ids.forEach(id => dispatch({ type: 'DELETE_RESOURCE', payload: id }));
      }
      setSelectedIds(new Set());
    }
  };

  const filteredMemories = useMemo(() => {
    return state.memories.filter(m => 
      (subjectFilter === 'all' || m.subject === subjectFilter) && 
      (m.content.toLowerCase().includes(searchQuery.toLowerCase()) || m.subject.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [state.memories, subjectFilter, searchQuery]);

  const filteredNodes = useMemo(() => {
    return state.knowledgeNodes.filter(n => 
      (subjectFilter === 'all' || n.subject === subjectFilter) && 
      (n.name.toLowerCase().includes(searchQuery.toLowerCase()) || n.subject.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [state.knowledgeNodes, subjectFilter, searchQuery]);

  const filteredTextbooks = useMemo(() => {
    return state.textbooks.filter(t => 
      (subjectFilter === 'all' || t.subject === subjectFilter) && 
      (t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.subject.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [state.textbooks, subjectFilter, searchQuery]);

  const filteredResources = useMemo(() => {
    return (state.resources || []).filter(r => 
      (subjectFilter === 'all' || r.subject === subjectFilter) && 
      (r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.subject.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [state.resources, subjectFilter, searchQuery]);

  const subjects = Array.from(new Set([
    ...state.memories.map(m => m.subject),
    ...state.knowledgeNodes.map(n => n.subject),
    ...state.textbooks.map(t => t.subject),
    ...(state.resources || []).map(r => r.subject)
  ]));

  const handleSaveMemoryEdit = (id: string) => {
    const memory = state.memories.find(m => m.id === id);
    if (memory) {
      dispatch({ type: 'UPDATE_MEMORY', payload: { ...memory, content: editingMemoryContent } });
    }
    setEditingMemoryId(null);
  };

  const handleDeleteMemory = (id: string) => {
    if (confirm('确定要删除这条记忆吗？')) {
      dispatch({ type: 'DELETE_MEMORY', payload: id });
    }
  };

  const handleSaveNodeEdit = (id: string) => {
    const node = state.knowledgeNodes.find(n => n.id === id);
    if (node) {
      dispatch({ type: 'UPDATE_NODE', payload: { ...node, name: editingNodeContent } });
    }
    setEditingNodeId(null);
  };

  const handleDeleteNode = (id: string) => {
    if (confirm('确定要删除这个知识节点吗？')) {
      dispatch({ type: 'DELETE_NODE', payload: id });
    }
  };

  const handleDeleteTextbook = (id: string) => {
    if (confirm('确定要删除这本课本吗？')) {
      dispatch({ type: 'DELETE_TEXTBOOK', payload: id });
    }
  };

  const getStorageSize = () => {
    try {
      const data = JSON.stringify(state);
      const bytes = new Blob([data]).size;
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    } catch (e) {
      return '未知';
    }
  };

  const handleMassDeleteByFunction = (funcType: string) => {
    if (subjectFilter === 'all') {
      alert('请先选择一个具体学科进行批量删除。');
      return;
    }
    if (confirm(`确定要删除【${subjectFilter}】学科下所有功能为【${funcType}】的记忆点吗？此操作不可撤销。`)) {
      dispatch({ type: 'DELETE_MEMORIES_BY_FUNCTION', payload: { subject: subjectFilter, functionType: funcType } });
    }
  };

  const functionTypes = Array.from(new Set(state.memories.map(m => m.functionType)));

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 text-slate-200 bg-black min-h-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter mb-2 uppercase flex items-center gap-3">
            <Database className="w-8 h-8 text-indigo-500" />
            数据管理中心
          </h2>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">
            管理所有本地存储的数据，当前总占用: <span className="text-indigo-400">{getStorageSize()}</span>
          </p>
        </div>
        <div className="flex gap-2">
        </div>
      </div>

        <div className="flex gap-4 border-b border-slate-800 pb-4 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('memories')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-colors shrink-0",
              activeTab === 'memories' ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800"
            )}
          >
            <BrainCircuit className="w-4 h-4" />
            记忆库 ({state.memories.length})
          </button>
          <button
            onClick={() => setActiveTab('rag')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-colors shrink-0",
              activeTab === 'rag' ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800"
            )}
          >
            <Network className="w-4 h-4" />
            知识图谱/RAG ({state.knowledgeNodes.length})
          </button>
          <button
            onClick={() => setActiveTab('textbooks')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-colors shrink-0",
              activeTab === 'textbooks' ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800"
            )}
          >
            <FileText className="w-4 h-4" />
            文件/课本 ({state.textbooks.length})
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-colors shrink-0",
              activeTab === 'resources' ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800"
            )}
          >
            <Database className="w-4 h-4" />
            资源库 ({(state.resources || []).length})
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="搜索数据..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="all">所有学科</option>
                {subjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBatchDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  批量删除 ({selectedIds.size})
                </button>
              )}
              {activeTab === 'memories' && subjectFilter !== 'all' && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">按功能删除:</span>
              <div className="flex gap-1 overflow-x-auto max-w-[200px] py-1 no-scrollbar">
                {functionTypes.map(ft => (
                  <button
                    key={ft}
                    onClick={() => handleMassDeleteByFunction(ft)}
                    className="px-2 py-0.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded text-[9px] font-bold whitespace-nowrap transition-colors"
                  >
                    {ft}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        {activeTab === 'memories' && (
          <div className="divide-y divide-slate-800 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center gap-3 sticky top-0 z-10">
              <button
                onClick={() => {
                  if (selectedIds.size === filteredMemories.length) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(filteredMemories.map(m => m.id)));
                  }
                }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                {selectedIds.size === filteredMemories.length && filteredMemories.length > 0 ? <CheckSquare className="w-5 h-5 text-indigo-500" /> : <Square className="w-5 h-5" />}
              </button>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">全选 / 已选 {selectedIds.size} 项</span>
            </div>
            {filteredMemories.map(m => (
              <div key={m.id} className={clsx("p-4 hover:bg-slate-800/50 transition-colors flex gap-4", selectedIds.has(m.id) && "bg-indigo-500/5")}>
                <button
                  onClick={() => toggleSelect(m.id)}
                  className="mt-1 text-slate-700 hover:text-indigo-500 transition-colors shrink-0"
                >
                  {selectedIds.has(m.id) ? <CheckSquare className="w-5 h-5 text-indigo-500" /> : <Square className="w-5 h-5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0" onClick={() => toggleCollapse(m.id)}>
                      <div className="flex items-center gap-2 mb-2 cursor-pointer">
                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[10px] font-bold uppercase tracking-widest">
                          {m.subject}
                        </span>
                        <span className="text-xs text-slate-500">{new Date(m.createdAt).toLocaleString()}</span>
                      </div>
                      {editingMemoryId === m.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingMemoryContent}
                            onChange={(e) => setEditingMemoryContent(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); handleSaveMemoryEdit(m.id); }} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700">保存</button>
                            <button onClick={(e) => { e.stopPropagation(); setEditingMemoryId(null); }} className="px-3 py-1.5 bg-slate-700 text-white text-xs font-bold rounded-lg hover:bg-slate-600">取消</button>
                          </div>
                        </div>
                      ) : (
                        <p className={clsx("text-sm text-slate-300", collapsedItems.has(m.id) ? "line-clamp-1" : "")}>{m.content}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditingMemoryId(m.id);
                          setEditingMemoryContent(m.content);
                        }}
                        className="p-2 text-slate-500 hover:text-indigo-400 transition-colors rounded-lg hover:bg-indigo-400/10"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMemory(m.id)}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredMemories.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">暂无匹配的记忆数据</div>
            )}
          </div>
        )}

        {activeTab === 'rag' && (
          <div className="divide-y divide-slate-800 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center gap-3 sticky top-0 z-10">
              <button
                onClick={() => {
                  if (selectedIds.size === filteredNodes.length) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(filteredNodes.map(n => n.id)));
                  }
                }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                {selectedIds.size === filteredNodes.length && filteredNodes.length > 0 ? <CheckSquare className="w-5 h-5 text-indigo-500" /> : <Square className="w-5 h-5" />}
              </button>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">全选 / 已选 {selectedIds.size} 项</span>
            </div>
            {filteredNodes.map(node => (
              <div key={node.id} className={clsx("p-4 hover:bg-slate-800/50 transition-colors flex gap-4", selectedIds.has(node.id) && "bg-indigo-500/5")}>
                <button
                  onClick={() => toggleSelect(node.id)}
                  className="mt-1 text-slate-700 hover:text-indigo-500 transition-colors shrink-0"
                >
                  {selectedIds.has(node.id) ? <CheckSquare className="w-5 h-5 text-indigo-500" /> : <Square className="w-5 h-5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0" onClick={() => toggleCollapse(node.id)}>
                      <div className="flex items-center gap-2 mb-1 cursor-pointer">
                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-[10px] font-bold uppercase tracking-widest">
                          {node.subject}
                        </span>
                        <span className="text-xs text-slate-500">ID: {node.id}</span>
                      </div>
                      {editingNodeId === node.id ? (
                        <div className="flex gap-2 mt-2">
                          <input
                            value={editingNodeContent}
                            onChange={(e) => setEditingNodeContent(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                          <button onClick={(e) => { e.stopPropagation(); handleSaveNodeEdit(node.id); }} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700">保存</button>
                          <button onClick={(e) => { e.stopPropagation(); setEditingNodeId(null); }} className="px-3 py-1.5 bg-slate-700 text-white text-xs font-bold rounded-lg hover:bg-slate-600">取消</button>
                        </div>
                      ) : (
                        <p className={clsx("text-sm font-medium text-slate-200", collapsedItems.has(node.id) ? "truncate" : "")}>{node.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditingNodeId(node.id);
                          setEditingNodeContent(node.name);
                        }}
                        className="p-2 text-slate-500 hover:text-indigo-400 transition-colors rounded-lg hover:bg-indigo-400/10"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNode(node.id)}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredNodes.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">暂无匹配的知识节点</div>
            )}
          </div>
        )}

        {activeTab === 'textbooks' && (
          <div className="divide-y divide-slate-800 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center gap-3 sticky top-0 z-10">
              <button
                onClick={() => {
                  if (selectedIds.size === filteredTextbooks.length) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(filteredTextbooks.map(t => t.id)));
                  }
                }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                {selectedIds.size === filteredTextbooks.length && filteredTextbooks.length > 0 ? <CheckSquare className="w-5 h-5 text-indigo-500" /> : <Square className="w-5 h-5" />}
              </button>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">全选 / 已选 {selectedIds.size} 项</span>
            </div>
            {filteredTextbooks.map(textbook => (
              <div key={textbook.id} className={clsx("p-4 hover:bg-slate-800/50 transition-colors flex items-center gap-4", selectedIds.has(textbook.id) && "bg-indigo-500/5")}>
                <button
                  onClick={() => toggleSelect(textbook.id)}
                  className="text-slate-700 hover:text-indigo-500 transition-colors shrink-0"
                >
                  {selectedIds.has(textbook.id) ? <CheckSquare className="w-5 h-5 text-indigo-500" /> : <Square className="w-5 h-5" />}
                </button>
                <div className="flex items-center gap-4 flex-1 min-w-0" onClick={() => toggleCollapse(textbook.id)}>
                  <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center shrink-0 border border-cyan-500/20">
                    <FileText className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="cursor-pointer">
                    <h4 className="text-sm font-bold text-slate-200">{textbook.name}</h4>
                    <p className={clsx("text-xs text-slate-500 mt-1 uppercase tracking-widest", collapsedItems.has(textbook.id) ? "hidden" : "block")}>
                      {textbook.subject} · {textbook.pages.length} 页 · {new Date(textbook.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteTextbook(textbook.id)}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {filteredTextbooks.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">暂无匹配的课本文件</div>
            )}
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="divide-y divide-slate-800 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center gap-3 sticky top-0 z-10">
              <button
                onClick={() => {
                  if (selectedIds.size === filteredResources.length) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(filteredResources.map(r => r.id)));
                  }
                }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                {selectedIds.size === filteredResources.length && filteredResources.length > 0 ? <CheckSquare className="w-5 h-5 text-indigo-500" /> : <Square className="w-5 h-5" />}
              </button>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">全选 / 已选 {selectedIds.size} 项</span>
            </div>
            {filteredResources.map(resource => (
              <div key={resource.id} className={clsx("p-4 hover:bg-slate-800/50 transition-colors flex items-center gap-4", selectedIds.has(resource.id) && "bg-indigo-500/5")}>
                <button
                  onClick={() => toggleSelect(resource.id)}
                  className="text-slate-700 hover:text-indigo-500 transition-colors shrink-0"
                >
                  {selectedIds.has(resource.id) ? <CheckSquare className="w-5 h-5 text-indigo-500" /> : <Square className="w-5 h-5" />}
                </button>
                <div className="flex items-center gap-4 flex-1 min-w-0" onClick={() => toggleCollapse(resource.id)}>
                  <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center shrink-0 border border-teal-500/20">
                    <Database className="w-5 h-5 text-teal-400" />
                  </div>
                  <div className="cursor-pointer">
                    <h4 className="text-sm font-bold text-slate-200">{resource.name}</h4>
                    <p className={clsx("text-xs text-slate-500 mt-1 uppercase tracking-widest", collapsedItems.has(resource.id) ? "hidden" : "block")}>
                      {resource.subject} · {resource.isFolder ? '文件夹' : '文件'} · {new Date(resource.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if(confirm('确定要删除这个资源吗？')) {
                      dispatch({ type: 'DELETE_RESOURCE', payload: resource.id });
                    }
                  }}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {filteredResources.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">暂无匹配的资源</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
