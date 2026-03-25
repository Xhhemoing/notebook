'use client';

import { useState, useRef } from 'react';
import { useAppContext } from '@/lib/store';
import { parseNotes } from '@/lib/ai';
import { Loader2, UploadCloud, FileText, CheckCircle2, Info } from 'lucide-react';
import { clsx } from 'clsx';

export function InputSection() {
  const { state, dispatch } = useAppContext();
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [explicitFunction, setExplicitFunction] = useState<string>('auto');
  const [explicitPurpose, setExplicitPurpose] = useState<string>('auto');
  const [isMistake, setIsMistake] = useState(false);
  const [supplementaryInstruction, setSupplementaryInstruction] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [analysisProcess, setAnalysisProcess] = useState<string | null>(null);
  const [pendingReview, setPendingReview] = useState<{
    parsedItems: any[];
    newNodes: any[];
    aiAnalysis: string;
  } | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (isRegenerate = false) => {
    if (!input && !image && !isRegenerate) return;
    setLoading(true);
    setSuccess(false);
    setAnalysisProcess(null);

    try {
      const promptInput = supplementaryInstruction 
        ? `${input}\n\n用户补充说明/修改要求：${supplementaryInstruction}`
        : input;

      const { analysisProcess: aiAnalysis, parsedItems, newNodes } = await parseNotes(
        promptInput,
        state.currentSubject,
        state.knowledgeNodes,
        state.settings,
        image || undefined,
        explicitFunction !== 'auto' ? explicitFunction : undefined,
        explicitPurpose !== 'auto' ? explicitPurpose : undefined,
        isRegenerate && pendingReview ? pendingReview.parsedItems : undefined,
        isRegenerate && pendingReview ? pendingReview.aiAnalysis : undefined
      );

      setPendingReview({
        parsedItems,
        newNodes,
        aiAnalysis
      });
      setAnalysisProcess(aiAnalysis);
    } catch (error) {
      console.error('Failed to parse notes:', error);
      alert('解析失败，请检查网络或稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSave = () => {
    if (!pendingReview) return;

    if (pendingReview.newNodes.length > 0) {
      dispatch({ type: 'BATCH_ADD_NODES', payload: pendingReview.newNodes });
    }
    
    if (pendingReview.parsedItems.length > 0) {
      const memories = pendingReview.parsedItems.map(item => ({
        id: crypto.randomUUID(),
        subject: state.currentSubject,
        content: item.content,
        functionType: (explicitFunction !== 'auto' ? explicitFunction : item.functionType) as any,
        purposeType: (explicitPurpose !== 'auto' ? explicitPurpose : item.purposeType) as any,
        knowledgeNodeIds: [item.nodeId],
        confidence: 50,
        createdAt: Date.now(),
        notes: item.notes,
        sourceType: image ? 'image' : 'text' as any,
        imageUrl: image || undefined,
        isMistake: item.isMistake || isMistake,
        analysisProcess: pendingReview.aiAnalysis
      }));
      dispatch({ type: 'BATCH_ADD_MEMORIES', payload: memories });
    }
    
    setSuccess(true);
    setInput('');
    setImage(null);
    setIsMistake(false);
    setSupplementaryInstruction('');
    setPendingReview(null);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleCancelReview = () => {
    setPendingReview(null);
    setSupplementaryInstruction('');
  };

  if (pendingReview) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            AI 解析完成，请审阅
          </h2>
          
          <div className="space-y-4 mb-6">
            <h3 className="text-sm font-medium text-slate-700">解析出的记忆点 ({pendingReview.parsedItems.length})</h3>
            {pendingReview.parsedItems.map((item, index) => (
              <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <textarea
                  value={item.content}
                  onChange={(e) => {
                    const newItems = [...pendingReview.parsedItems];
                    newItems[index].content = e.target.value;
                    setPendingReview({ ...pendingReview, parsedItems: newItems });
                  }}
                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y"
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
                    className="w-full p-2 text-sm border border-amber-200 bg-amber-50 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none resize-y"
                    rows={2}
                    placeholder="补充说明/错因分析"
                  />
                )}
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.isMistake || isMistake}
                      onChange={(e) => {
                        const newItems = [...pendingReview.parsedItems];
                        newItems[index].isMistake = e.target.checked;
                        setPendingReview({ ...pendingReview, parsedItems: newItems });
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    标记为错题
                  </label>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
                    关联节点: {state.knowledgeNodes.find(n => n.id === item.nodeId)?.name || '新节点'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="text-sm font-medium text-slate-700">补充说明 (让 AI 重新生成)</h3>
            <textarea
              value={supplementaryInstruction}
              onChange={(e) => setSupplementaryInstruction(e.target.value)}
              placeholder="如果 AI 解析不准确，请在此输入补充说明，例如：'请把第一点和第二点合并'，然后点击重新生成。"
              className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-y"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              重新生成
            </button>
            <button
              onClick={handleConfirmSave}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              确认并保存
            </button>
            <button
              onClick={handleCancelReview}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-medium transition-colors"
            >
              取消
            </button>
          </div>
        </div>

        {analysisProcess && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              AI 分析过程与意图识别
            </h3>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {analysisProcess}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          录入 {state.currentSubject} 记忆/错题
        </h2>
        
        <div className="space-y-4">
          <div className="space-y-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="在此输入散乱的知识点、错题解析或方法论... (例如：标况下为液体：HF；12g石墨中含有的C-C键数目为1.5Na)"
              className="w-full h-40 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-slate-700"
            />
            
            <textarea
              value={supplementaryInstruction}
              onChange={(e) => setSupplementaryInstruction(e.target.value)}
              placeholder="补充说明/处理要求 (可选)：例如'请只提取图片中打红叉的题目'或'请帮我把这段文字总结成3个要点'"
              className="w-full h-20 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-slate-700 text-sm"
            />
          </div>

          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              上传错题/笔记图片
            </button>
            {image && (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImage(null)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">功能分类 (可选)</label>
              <select 
                value={explicitFunction}
                onChange={(e) => setExplicitFunction(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="auto">自动 (AI 判断)</option>
                <option value="细碎记忆">细碎记忆 (知识点/实例)</option>
                <option value="方法论">方法论 (解题套路)</option>
                <option value="关联型记忆">关联型记忆 (对比/联系)</option>
                <option value="系统型">系统型 (框架)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">目的分类 (可选)</label>
              <select 
                value={explicitPurpose}
                onChange={(e) => setExplicitPurpose(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="auto">自动 (AI 判断)</option>
                <option value="内化型">内化型 (需理解并记忆)</option>
                <option value="记忆型">记忆型 (仅需单独记忆)</option>
                <option value="补充知识型">补充知识型</option>
                <option value="系统型">系统型</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isMistake}
                onChange={(e) => setIsMistake(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              标记为错题
            </label>
          </div>

          <button
            onClick={() => handleSubmit(false)}
            disabled={loading || (!input && !image)}
            className={clsx(
              'w-full py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all mt-4',
              loading || (!input && !image)
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
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
      </div>
      
      {analysisProcess && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            AI 分析过程与意图识别
          </h3>
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {analysisProcess}
          </div>
        </div>
      )}
      
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 border border-blue-100">
        <p className="font-medium mb-1">💡 录入提示：</p>
        <ul className="list-disc list-inside space-y-1 opacity-80">
          <li>支持批量录入，AI会自动拆分独立的知识点。</li>
          <li>上传错题图片时，可以补充文字说明你的易错点或疑惑。</li>
          <li>你可以手动指定分类，让 AI 解析更加精准。</li>
        </ul>
      </div>
    </div>
  );
}
