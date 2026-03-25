'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/lib/store';
import { generateQuiz, QuizQuestion } from '@/lib/ai';
import { Memory } from '@/lib/types';
import { GraduationCap, Loader2, CheckCircle2, XCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

export function ReviewSection() {
  const { state, dispatch } = useAppContext();
  const [currentMemory, setCurrentMemory] = useState<Memory | null>(null);
  const [quiz, setQuiz] = useState<QuizQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isEvaluated, setIsEvaluated] = useState(false);

  const memoriesToReview = state.memories
    .filter(m => m.subject === state.currentSubject)
    .sort((a, b) => a.confidence - b.confidence);

  const loadNextReview = async () => {
    if (memoriesToReview.length === 0) return;
    
    // Pick one of the top 5 lowest confidence memories randomly
    const candidates = memoriesToReview.slice(0, 5);
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    
    setCurrentMemory(selected);
    setLoading(true);
    setShowResult(false);
    setIsEvaluated(false);
    setUserAnswer('');
    setQuiz(null);

    try {
      const generatedQuiz = await generateQuiz(selected, state.settings);
      setQuiz(generatedQuiz);
    } catch (error) {
      console.error('Failed to generate quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentMemory && memoriesToReview.length > 0) {
      loadNextReview();
    }
  }, [state.currentSubject]);

  const handleAnswer = (answer: string) => {
    if (!quiz || !currentMemory) return;
    
    if (quiz.type === 'qa') {
      setShowResult(true);
      setUserAnswer(answer);
      return; // Wait for self-evaluation
    }

    const correct = answer === quiz.correctAnswer;
    setIsCorrect(correct);
    setShowResult(true);
    setIsEvaluated(true);
    setUserAnswer(answer);

    updateConfidence(correct);
  };

  const updateConfidence = (correct: boolean) => {
    if (!currentMemory) return;
    const newConfidence = correct 
      ? Math.min(100, currentMemory.confidence + 15)
      : Math.max(0, currentMemory.confidence - 10);

    dispatch({
      type: 'UPDATE_MEMORY',
      payload: {
        ...currentMemory,
        confidence: newConfidence,
        lastReviewed: Date.now()
      }
    });
  };

  const handleSelfEvaluate = (correct: boolean) => {
    setIsCorrect(correct);
    setIsEvaluated(true);
    updateConfidence(correct);
    // Proceed to next question automatically or let them click next
  };

  if (memoriesToReview.length === 0) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-slate-500">
        <GraduationCap className="w-12 h-12 mb-4 text-slate-300" />
        <p>当前科目暂无记忆点可复习</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-indigo-500" />
          AI 智能复习
        </h2>
        <button
          onClick={loadNextReview}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          换一题
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p>AI 正在为您生成专属复习题...</p>
        </div>
      ) : quiz && currentMemory ? (
        <div className="flex-1 flex flex-col">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
            <div className="mb-6">
              <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full mb-4">
                {quiz.type === 'mc' ? '单选题' : quiz.type === 'tf' ? '判断题' : '简答题'}
              </span>
              <h3 className="text-lg font-medium text-slate-800 leading-relaxed">
                {quiz.question}
              </h3>
            </div>

            {!showResult ? (
              <div className="space-y-3">
                {quiz.type === 'mc' && quiz.options?.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(opt)}
                    className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-slate-700"
                  >
                    {opt}
                  </button>
                ))}
                
                {quiz.type === 'tf' && (
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleAnswer('对')}
                      className="flex-1 p-4 rounded-xl border border-slate-200 hover:border-green-500 hover:bg-green-50 transition-colors text-slate-700 font-medium text-center"
                    >
                      对
                    </button>
                    <button
                      onClick={() => handleAnswer('错')}
                      className="flex-1 p-4 rounded-xl border border-slate-200 hover:border-red-500 hover:bg-red-50 transition-colors text-slate-700 font-medium text-center"
                    >
                      错
                    </button>
                  </div>
                )}

                {quiz.type === 'qa' && (
                  <div className="space-y-4">
                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="输入你的答案思路..."
                      className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-slate-700"
                    />
                    <button
                      onClick={() => handleAnswer(userAnswer)}
                      disabled={!userAnswer.trim()}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                      查看解析
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className={clsx(
                  "p-4 rounded-xl flex items-start gap-3",
                  quiz.type === 'qa' && userAnswer ? "bg-blue-50 border border-blue-100" :
                  isCorrect ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"
                )}>
                  {quiz.type !== 'qa' && (
                    isCorrect ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={clsx(
                      "font-medium mb-1",
                      quiz.type === 'qa' ? "text-blue-800" :
                      isCorrect ? "text-green-800" : "text-red-800"
                    )}>
                      {quiz.type === 'qa' ? '参考解析' : isCorrect ? '回答正确！' : '回答错误'}
                    </p>
                    {quiz.type !== 'qa' && !isCorrect && (
                      <p className="text-sm text-red-700 mb-2">正确答案是：{quiz.correctAnswer}</p>
                    )}
                    <p className="text-sm text-slate-700 leading-relaxed">{quiz.explanation}</p>
                  </div>
                </div>

                {quiz.type === 'qa' && userAnswer && !isEvaluated && (
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleSelfEvaluate(true)}
                      className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
                    >
                      我答对了
                    </button>
                    <button
                      onClick={() => handleSelfEvaluate(false)}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                    >
                      我答错了
                    </button>
                  </div>
                )}

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    关联记忆点
                  </h4>
                  <p className="text-sm text-slate-700">{currentMemory.content}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      当前掌握度: <span className="font-medium text-indigo-600">{Math.round(currentMemory.confidence)}%</span>
                    </span>
                  </div>
                </div>

                {isEvaluated && (
                  <button
                    onClick={loadNextReview}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    下一题
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
