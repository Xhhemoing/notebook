'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '@/lib/store';
import { parseNotes, getEmbedding } from '@/lib/ai';
import { Loader2, UploadCloud, FileText, CheckCircle2, Info, ChevronDown, ChevronUp, Trash2, PlusCircle, Sparkles, X, Image as ImageIcon, AlertCircle, History } from 'lucide-react';
import { clsx } from 'clsx';
import { getInitialFSRSData } from '@/lib/fsrs';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { v4 as uuidv4 } from 'uuid';
import { InputHistoryItem } from '@/lib/types';

import { saveImage } from '@/lib/db';

export function InputSection() {
  const { state, dispatch } = useAppContext();
  const [input, setInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isScanMode, setIsScanMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [explicitFunction, setExplicitFunction] = useState<string>('auto');
  const [explicitPurpose, setExplicitPurpose] = useState<string>('auto');
  const [isMistake, setIsMistake] = useState(false);
  const [supplementaryInstruction, setSupplementaryInstruction] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [analysisProcess, setAnalysisProcess] = useState<string | null>(null);
  const [pendingReview, setPendingReview] = useState<{
    parsedItems: any[];
    newNodes: any[];
    deletedNodeIds: string[];
    aiAnalysis: string;
    identifiedSubject: string;
  } | null>(null);
  const [collapsedItems, setCollapsedItems] = useState<Set<number>>(new Set());
  const [showHistory, setShowHistory] = useState(false);

  const processImageToScan = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64);
          return;
        }
        
        // Resize if too large to keep performance
        const maxDim = 2000;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else {
            width = (width / height) * maxDim;
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Grayscale
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          
          // Contrast enhancement (simple linear)
          // Map [50, 200] to [0, 255]
          let value = (gray - 50) * (255 / (200 - 50));
          value = Math.max(0, Math.min(255, value));
          
          data[i] = data[i + 1] = data[i + 2] = value;
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(base64);
      img.src = base64;
    });
  };

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement> | File) => {
    const files = e instanceof File ? [e] : Array.from(e.target.files || []);
    if (files.length > 0) {
      const newImages: string[] = [];
      for (const file of files) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        
        if (isScanMode) {
          const scanned = await processImageToScan(base64);
          newImages.push(scanned);
        } else {
          newImages.push(base64);
        }
      }
      setImages(prev => [...prev, ...newImages]);
    }
  }, [isScanMode]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      let hasImage = false;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleImageUpload(file);
            hasImage = true;
          }
        }
      }
      
      // If we handled an image and the target is not a textarea/input, prevent default
      // Actually, if we handled an image, we might want to prevent default to avoid double pasting in some editors
      // But since we use a standard textarea, letting it paste text is fine.
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [isScanMode, handleImageUpload]);

  const handleSubmit = async (isRegenerate = false) => {
    if (!input && images.length === 0 && !isRegenerate) return;
    setLoading(true);
    setSuccess(false);
    setAnalysisProcess(null);

    try {
      const promptInput = supplementaryInstruction 
        ? `${input}\n\n用户补充说明/修改要求：${supplementaryInstruction}`
        : input;

      const existingFunctionTypes = Array.from(new Set(state.memories.map(m => m.functionType)));
      if (existingFunctionTypes.length === 0) existingFunctionTypes.push('细碎记忆', '方法论', '关联型记忆', '系统型');
      
      const existingPurposeTypes = Array.from(new Set(state.memories.map(m => m.purposeType)));
      if (existingPurposeTypes.length === 0) existingPurposeTypes.push('内化型', '记忆型', '补充知识型', '系统型');

      const { analysisProcess: aiAnalysis, parsedItems, newNodes, deletedNodeIds, identifiedSubject } = await parseNotes(
        promptInput,
        state.currentSubject,
        state.knowledgeNodes,
        state.settings,
        images.length > 0 ? images : undefined,
        explicitFunction !== 'auto' ? explicitFunction : undefined,
        explicitPurpose !== 'auto' ? explicitPurpose : undefined,
        isRegenerate && pendingReview ? pendingReview.parsedItems : undefined,
        isRegenerate && pendingReview ? pendingReview.aiAnalysis : undefined,
        existingFunctionTypes,
        existingPurposeTypes,
        (log) => {
          if (state.settings.enableLogging) {
            dispatch({
              type: 'ADD_LOG',
              payload: {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: Date.now(),
                ...log
              }
            });
          }
        }
      );

      setPendingReview({
        parsedItems,
        newNodes,
        deletedNodeIds,
        aiAnalysis,
        identifiedSubject
      });

      // Save to history
      const historyItem: InputHistoryItem = {
        id: uuidv4(),
        timestamp: Date.now(),
        subject: state.currentSubject,
        input,
        images: [...images],
        parsedItems,
        newNodes,
        deletedNodeIds,
        aiAnalysis,
        identifiedSubject
      };
      dispatch({ type: 'ADD_INPUT_HISTORY', payload: historyItem });

      setAnalysisProcess(aiAnalysis);
    } catch (error) {
      console.error('Failed to parse notes:', error);
      alert('解析失败，请检查网络或稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!pendingReview) return;

    if (pendingReview.identifiedSubject !== state.currentSubject) {
      dispatch({ type: 'SET_SUBJECT', payload: pendingReview.identifiedSubject });
    }

    if (pendingReview.newNodes.length > 0) {
      dispatch({ type: 'BATCH_ADD_NODES', payload: pendingReview.newNodes });
    }

    if (pendingReview.deletedNodeIds && pendingReview.deletedNodeIds.length > 0) {
      dispatch({ type: 'BATCH_DELETE_NODES', payload: pendingReview.deletedNodeIds });
    }
    
    if (pendingReview.parsedItems.length > 0) {
      const memories = await Promise.all(pendingReview.parsedItems.map(async item => {
        const memoryId = uuidv4();
        
        // Save images to IndexedDB if exist
        if (images.length > 0) {
          try {
            await Promise.all(images.map((img, idx) => saveImage(`${memoryId}_${idx}`, img)));
          } catch (e) {
            console.error('Failed to save images to IndexedDB:', e);
          }
        }

        return {
          id: memoryId,
          subject: pendingReview.identifiedSubject,
          content: item.content,
          correctAnswer: item.correctAnswer,
          questionType: item.questionType,
          source: item.source,
          region: item.region,
          functionType: (explicitFunction !== 'auto' ? explicitFunction : item.functionType) as any,
          purposeType: (explicitPurpose !== 'auto' ? explicitPurpose : item.purposeType) as any,
          knowledgeNodeIds: item.nodeIds || (item.nodeId ? [item.nodeId] : []),
          confidence: 50,
          createdAt: Date.now(),
          notes: item.notes,
          sourceType: images.length > 0 ? 'image' : 'text' as any,
          imageUrl: images[0] || undefined, // Primary image
          imageUrls: images.length > 0 ? images.map((_, idx) => `${memoryId}_${idx}`) : undefined,
          isMistake: item.isMistake || isMistake,
          wrongAnswer: item.wrongAnswer,
          errorReason: item.errorReason,
          visualDescription: item.visualDescription,
          analysisProcess: pendingReview.aiAnalysis,
          fsrs: getInitialFSRSData(),
          mastery: 0.01
        };
      }));
      dispatch({ type: 'BATCH_ADD_MEMORIES', payload: memories });
    }
    
    setSuccess(true);
    setInput('');
    setImages([]);
    setIsMistake(false);
    setSupplementaryInstruction('');
    setPendingReview(null);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleSaveSingleItem = async (index: number) => {
    if (!pendingReview) return;
    const item = pendingReview.parsedItems[index];
    
    if (pendingReview.identifiedSubject !== state.currentSubject) {
      dispatch({ type: 'SET_SUBJECT', payload: pendingReview.identifiedSubject });
    }

    if (pendingReview.newNodes.length > 0) {
      dispatch({ type: 'BATCH_ADD_NODES', payload: pendingReview.newNodes });
    }

    if (pendingReview.deletedNodeIds && pendingReview.deletedNodeIds.length > 0) {
      dispatch({ type: 'BATCH_DELETE_NODES', payload: pendingReview.deletedNodeIds });
    }

    const memoryId = uuidv4();
    if (images.length > 0) {
      try {
        await Promise.all(images.map((img, idx) => saveImage(`${memoryId}_${idx}`, img)));
      } catch (e) {
        console.error('Failed to save images to IndexedDB:', e);
      }
    }

    const memory = {
      id: memoryId,
      subject: pendingReview.identifiedSubject,
      content: item.content,
      correctAnswer: item.correctAnswer,
      questionType: item.questionType,
      source: item.source,
      region: item.region,
      functionType: (explicitFunction !== 'auto' ? explicitFunction : item.functionType) as any,
      purposeType: (explicitPurpose !== 'auto' ? explicitPurpose : item.purposeType) as any,
      knowledgeNodeIds: item.nodeIds || (item.nodeId ? [item.nodeId] : []),
      confidence: 50,
      createdAt: Date.now(),
      notes: item.notes,
      sourceType: images.length > 0 ? 'image' : 'text' as any,
      imageUrl: images[0] || undefined,
      imageUrls: images.length > 0 ? images.map((_, idx) => `${memoryId}_${idx}`) : undefined,
      isMistake: item.isMistake || isMistake,
      wrongAnswer: item.wrongAnswer,
      errorReason: item.errorReason,
      visualDescription: item.visualDescription,
      analysisProcess: pendingReview.aiAnalysis,
      fsrs: getInitialFSRSData(),
      mastery: 0.01
    };

    dispatch({ type: 'ADD_MEMORY', payload: memory });
    
    // Remove from pending
    const newItems = pendingReview.parsedItems.filter((_, i) => i !== index);
    if (newItems.length === 0) {
      setPendingReview(null);
      setImages([]);
      setInput('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setPendingReview({ ...pendingReview, parsedItems: newItems });
    }
  };

  const handleCancelReview = () => {
    setPendingReview(null);
    setSupplementaryInstruction('');
    setInput('');
    setImages([]);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            <h2 className="text-xl font-semibold text-slate-100">AI 正在深度解析...</h2>
          </div>
          
          {analysisProcess && (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <p className="text-sm text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                {analysisProcess}
                <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse"></span>
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="h-4 bg-slate-800 rounded w-1/4 animate-pulse"></div>
            <div className="space-y-3">
              <div className="h-24 bg-slate-800 rounded-xl animate-pulse"></div>
              <div className="h-24 bg-slate-800 rounded-xl animate-pulse opacity-75"></div>
              <div className="h-24 bg-slate-800 rounded-xl animate-pulse opacity-50"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pendingReview) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6 text-slate-200">
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6">
          <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            AI 解析完成，请审阅
          </h2>
          
          <div className="space-y-4 mb-6">
            <h3 className="text-sm font-medium text-slate-300">解析出的记忆点 ({pendingReview.parsedItems.length})</h3>
            {pendingReview.parsedItems.map((item, index) => {
              const isCollapsed = collapsedItems.has(index);
              return (
              <div key={index} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-slate-800 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newCollapsed = new Set(collapsedItems);
                        if (isCollapsed) newCollapsed.delete(index);
                        else newCollapsed.add(index);
                        setCollapsedItems(newCollapsed);
                      }}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400"
                    >
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                    <span className="text-sm font-medium text-slate-200">
                      记忆点 {index + 1} {item.isMistake ? '(错题)' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveSingleItem(index)}
                      className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded text-xs font-medium hover:bg-emerald-500/30 transition-colors border border-emerald-500/30"
                    >
                      保存此条
                    </button>
                    <button
                      onClick={() => {
                        const newItems = pendingReview.parsedItems.filter((_, i) => i !== index);
                        setPendingReview({ ...pendingReview, parsedItems: newItems });
                      }}
                      className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                      title="删除此记忆点"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {!isCollapsed && (
                <div className="p-4 space-y-3">
                  <textarea
                    value={item.content}
                    onChange={(e) => {
                      const newItems = [...pendingReview.parsedItems];
                      newItems[index].content = e.target.value;
                      setPendingReview({ ...pendingReview, parsedItems: newItems });
                    }}
                    className="w-full p-2 text-sm border border-slate-700 bg-slate-800 text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
                    rows={3}
                  />
                  {item.notes && (
                    <textarea
                      value={item.notes}
                      onChange={(e) => {
                        const newItems = [...pendingReview.parsedItems];
                        newItems[index].notes = e.target.value;
                        setPendingReview({ ...pendingReview, parsedItems: newItems });
                      }}
                      className="w-full p-2 text-sm border border-slate-700 bg-slate-800 text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
                      rows={2}
                      placeholder="补充说明"
                    />
                  )}
                  {(item.isMistake || isMistake) && (
                    <div className="space-y-3">
                      <textarea
                        value={item.visualDescription || ''}
                        onChange={(e) => {
                          const newItems = [...pendingReview.parsedItems];
                          newItems[index].visualDescription = e.target.value;
                          setPendingReview({ ...pendingReview, parsedItems: newItems });
                        }}
                        className="w-full p-2 text-sm border border-slate-700 bg-slate-800 text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
                        rows={2}
                        placeholder="图片视觉描述 (如：包含一个抛物线 y=x^2 和一条直线...)"
                      />
                      <textarea
                        value={item.correctAnswer || ''}
                        onChange={(e) => {
                          const newItems = [...pendingReview.parsedItems];
                          newItems[index].correctAnswer = e.target.value;
                          setPendingReview({ ...pendingReview, parsedItems: newItems });
                        }}
                        className="w-full p-2 text-sm border border-emerald-900/50 bg-emerald-900/20 text-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-y"
                        rows={2}
                        placeholder="标准答案 (AI提取或手动输入)"
                      />
                      <textarea
                        value={item.wrongAnswer || ''}
                        onChange={(e) => {
                          const newItems = [...pendingReview.parsedItems];
                          newItems[index].wrongAnswer = e.target.value;
                          setPendingReview({ ...pendingReview, parsedItems: newItems });
                        }}
                        className="w-full p-2 text-sm border border-red-900/50 bg-red-900/20 text-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-y"
                        rows={2}
                        placeholder="你的错误答案 (原笔迹提取)"
                      />
                      <textarea
                        value={item.errorReason || ''}
                        onChange={(e) => {
                          const newItems = [...pendingReview.parsedItems];
                          newItems[index].errorReason = e.target.value;
                          setPendingReview({ ...pendingReview, parsedItems: newItems });
                        }}
                        className="w-full p-2 text-sm border border-orange-900/50 bg-orange-900/20 text-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-y"
                        rows={2}
                        placeholder="错误原因分析 (如：概念混淆、计算错误)"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs flex-wrap">
                    <label className="flex items-center gap-1 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={item.isMistake || isMistake}
                        onChange={(e) => {
                          const newItems = [...pendingReview.parsedItems];
                          newItems[index].isMistake = e.target.checked;
                          setPendingReview({ ...pendingReview, parsedItems: newItems });
                        }}
                        className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                      />
                      标记为错题
                    </label>
                    <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-md border border-indigo-500/30">
                      关联标签: {(item.nodeIds || (item.nodeId ? [item.nodeId] : [])).map((id: string) => state.knowledgeNodes.find(n => n.id === id)?.name || '新标签').join(', ')}
                    </span>
                    <select
                      value={item.questionType || ''}
                      onChange={(e) => {
                        const newItems = [...pendingReview.parsedItems];
                        newItems[index].questionType = e.target.value;
                        setPendingReview({ ...pendingReview, parsedItems: newItems });
                      }}
                      className="px-2 py-1 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-800 text-slate-200"
                    >
                      <option value="">选择题型...</option>
                      <option value="multiple-choice">选择题</option>
                      <option value="fill-in-the-blank">填空题</option>
                      <option value="essay">解答题</option>
                    </select>
                    <input
                      type="text"
                      value={item.source || ''}
                      onChange={(e) => {
                        const newItems = [...pendingReview.parsedItems];
                        newItems[index].source = e.target.value;
                        setPendingReview({ ...pendingReview, parsedItems: newItems });
                      }}
                      placeholder="题目来源 (如: 期中考试)"
                      className="px-2 py-1 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none w-32 bg-slate-800 text-slate-200"
                    />
                    <input
                      type="text"
                      value={item.region || ''}
                      onChange={(e) => {
                        const newItems = [...pendingReview.parsedItems];
                        newItems[index].region = e.target.value;
                        setPendingReview({ ...pendingReview, parsedItems: newItems });
                      }}
                      placeholder="区域/试卷 (如: 北京)"
                      className="px-2 py-1 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none w-32 bg-slate-800 text-slate-200"
                    />
                    <select
                      value={item.functionType}
                      onChange={(e) => {
                        const newItems = [...pendingReview.parsedItems];
                        newItems[index].functionType = e.target.value;
                        setPendingReview({ ...pendingReview, parsedItems: newItems });
                      }}
                      className="px-2 py-1 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-800 text-slate-200"
                    >
                      {['细碎记忆', '方法论', '关联型记忆', '系统型', ...Array.from(new Set(state.memories.map(m => m.functionType))).filter(t => t && !['细碎记忆', '方法论', '关联型记忆', '系统型'].includes(t))].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <select
                      value={item.purposeType}
                      onChange={(e) => {
                        const newItems = [...pendingReview.parsedItems];
                        newItems[index].purposeType = e.target.value;
                        setPendingReview({ ...pendingReview, parsedItems: newItems });
                      }}
                      className="px-2 py-1 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-800 text-slate-200"
                    >
                      {['内化型', '记忆型', '补充知识型', '系统型', ...Array.from(new Set(state.memories.map(m => m.purposeType))).filter(t => t && !['内化型', '记忆型', '补充知识型', '系统型'].includes(t))].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                )}
              </div>
            )})}
          </div>

          {(pendingReview.newNodes.length > 0 || (pendingReview.deletedNodeIds && pendingReview.deletedNodeIds.length > 0)) && (
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-400" />
                知识图谱调整预览
              </h3>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
                {pendingReview.newNodes.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">新增节点</p>
                    <ul className="space-y-1">
                      {pendingReview.newNodes.map(node => (
                        <li key={node.id} className="text-sm text-emerald-300 flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {node.name} <span className="text-emerald-500/70 text-xs">(父节点: {state.knowledgeNodes.find(n => n.id === node.parentId)?.name || node.parentId || '根节点'})</span>
                          </div>
                          {node.testingMethods && node.testingMethods.length > 0 && (
                            <div className="pl-3.5 text-xs text-emerald-400/80">
                              <span className="font-medium">考法:</span> {node.testingMethods.join('、')}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {pendingReview.deletedNodeIds && pendingReview.deletedNodeIds.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wider">建议删除节点</p>
                    <ul className="space-y-1">
                      {pendingReview.deletedNodeIds.map(id => {
                        const node = state.knowledgeNodes.find(n => n.id === id);
                        return (
                          <li key={id} className="text-sm text-red-300 flex items-center gap-2 line-through">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            {node?.name || id}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <h3 className="text-sm font-medium text-slate-300">补充说明 (让 AI 重新生成)</h3>
            <textarea
              value={supplementaryInstruction}
              onChange={(e) => setSupplementaryInstruction(e.target.value)}
              placeholder="如果 AI 解析不准确，请在此输入补充说明，例如：'请把第一点和第二点合并'，然后点击重新生成。"
              className="w-full p-3 text-sm border border-slate-700 bg-slate-800 text-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              重新生成
            </button>
            <button
              onClick={handleConfirmSave}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
            >
              确认并保存
            </button>
            <button
              onClick={handleCancelReview}
              className="px-4 py-2.5 bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-400 rounded-xl font-medium transition-colors"
            >
              取消
            </button>
          </div>
        </div>

        {analysisProcess && (
          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400" />
              AI 分析过程与意图识别
            </h3>
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-slate-300 whitespace-pre-wrap leading-relaxed prose prose-sm prose-invert max-w-none">
              <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{analysisProcess}</Markdown>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-3 space-y-3 text-slate-200">
      <div className="bg-slate-900 rounded-lg shadow-sm border border-slate-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            录入 {state.currentSubject} 记忆/错题
          </h2>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={clsx(
              "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-colors",
              showHistory ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            )}
          >
            <History className="w-3 h-3" />
            历史记录
          </button>
        </div>

        {showHistory && (
          <div className="mb-4 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">最近录入历史 ({state.currentSubject})</span>
              <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-800">
              {state.inputHistory
                .filter(h => h.subject === state.currentSubject)
                .map(item => (
                  <div key={item.id} className="p-3 hover:bg-slate-900 transition-colors group">
                    <div className="flex items-start justify-between gap-3">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          setPendingReview({
                            parsedItems: item.parsedItems,
                            newNodes: item.newNodes,
                            deletedNodeIds: item.deletedNodeIds,
                            aiAnalysis: item.aiAnalysis,
                            identifiedSubject: item.identifiedSubject
                          });
                          setInput(item.input);
                          setImages(item.images);
                          setShowHistory(false);
                        }}
                      >
                        <p className="text-xs text-slate-300 line-clamp-1 mb-1">{item.input || (item.images.length > 0 ? `[图片录入: ${item.images.length}张]` : '无文字内容')}</p>
                        <span className="text-[9px] text-slate-600 font-medium">{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: 'DELETE_INPUT_HISTORY', payload: item.id });
                        }}
                        className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        title="删除历史记录"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              {state.inputHistory.filter(h => h.subject === state.currentSubject).length === 0 && (
                <div className="p-8 text-center text-slate-600 text-[10px] uppercase tracking-widest">暂无历史记录</div>
              )}
            </div>
          </div>
        )}
        
        <div 
          className={clsx(
            "space-y-3 p-3 rounded-xl border-2 border-dashed transition-all duration-200",
            isDragging ? "border-indigo-400 bg-indigo-500/10 scale-[1.01]" : "border-transparent"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="在此输入散乱的知识点、错题解析或方法论... (例如：标况下为液体：HF；12g石墨中含有的C-C键数目为1.5Na)"
              className="w-full h-32 p-3 rounded-lg border border-slate-700 bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-slate-200 text-xs"
            />
            
            <textarea
              value={supplementaryInstruction}
              onChange={(e) => setSupplementaryInstruction(e.target.value)}
              placeholder="补充说明/处理要求 (可选)：例如'请只提取图片中打红叉的题目'或'请帮我把这段文字总结成3个要点'"
              className="w-full h-16 p-2 rounded-lg border border-slate-700 bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-slate-300 text-[10px]"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors text-[10px]",
                isDragging ? "border-indigo-400 text-indigo-400 bg-indigo-500/10" : "border-slate-700 text-slate-400 hover:bg-slate-800"
              )}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              {isDragging ? "松开鼠标以上传图片" : "上传错题/笔记图片 (支持多张)"}
            </button>
            <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer hover:text-indigo-400 transition-colors">
              <input
                type="checkbox"
                checked={isScanMode}
                onChange={(e) => setIsScanMode(e.target.checked)}
                className="w-3.5 h-3.5 text-indigo-500 rounded border-slate-700 bg-slate-800 focus:ring-indigo-500"
              />
              扫描模式 (增强清晰度)
            </label>
            {images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 max-w-md">
                {images.map((img, idx) => (
                  <div key={idx} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">功能分类 (可选)</label>
              <select 
                value={explicitFunction}
                onChange={(e) => setExplicitFunction(e.target.value)}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="auto">自动 (AI 判断)</option>
                {['细碎记忆', '方法论', '关联型记忆', '系统型', ...Array.from(new Set(state.memories.map(m => m.functionType))).filter(t => t && !['细碎记忆', '方法论', '关联型记忆', '系统型'].includes(t))].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">目的分类 (可选)</label>
              <select 
                value={explicitPurpose}
                onChange={(e) => setExplicitPurpose(e.target.value)}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="auto">自动 (AI 判断)</option>
                {['内化型', '记忆型', '补充知识型', '系统型', ...Array.from(new Set(state.memories.map(m => m.purposeType))).filter(t => t && !['内化型', '记忆型', '补充知识型', '系统型'].includes(t))].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isMistake}
                onChange={(e) => setIsMistake(e.target.checked)}
                className="w-4 h-4 text-indigo-500 rounded border-slate-700 bg-slate-800 focus:ring-indigo-500"
              />
              标记为错题
            </label>
          </div>
        </div>

        <button
          onClick={() => handleSubmit(false)}
          disabled={loading || (!input && images.length === 0)}
          className={clsx(
            'w-full py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all mt-4',
            loading || (!input && images.length === 0)
              ? 'bg-indigo-500/50 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              AI 正在深度解析并关联知识图谱...
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              录入成功！已自动分类并关联知识点
            </>
          ) : (
            '一键 AI 整理并存入记忆库'
          )}
        </button>
      </div>
      
      {analysisProcess && (
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-400" />
            AI 分析过程与意图识别
          </h3>
          <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-slate-300 whitespace-pre-wrap leading-relaxed prose prose-sm prose-invert max-w-none">
            <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{analysisProcess}</Markdown>
          </div>
        </div>
      )}
      
      <div className="bg-indigo-900/20 rounded-xl p-4 text-sm text-indigo-300 border border-indigo-500/20">
        <p className="font-medium mb-1">💡 录入提示：</p>
        <ul className="list-disc list-inside space-y-1 opacity-80">
          <li>支持批量录入，AI会自动拆分独立的知识点。</li>
          <li>上传错题图片时，可以补充文字说明你的易错点或疑惑。</li>
          <li>你可以手动指定分类，让 AI 解析更加精准。</li>
        </ul>
      </div>

      {state.memories.length > 0 && (
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 mt-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-400" />
            最近录入历史
          </h3>
          <div className="space-y-3">
            {state.memories
              .sort((a, b) => b.createdAt - a.createdAt)
              .slice(0, 5)
              .map(memory => (
                <div key={memory.id} className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                      {memory.subject} · {memory.functionType}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(memory.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 line-clamp-2">{memory.content}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
