'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppContext } from '@/lib/store';
import { chatWithAI } from '@/lib/ai';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

export function AIChat() {
  const { state } = useAppContext();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'ai', content: `你好！我是你的${state.currentSubject} AI辅导老师。有什么问题可以随时问我，我会结合你的记忆库为你解答。` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset chat when subject changes
  useEffect(() => {
    setMessages([
      { id: Date.now().toString(), role: 'ai', content: `你好！我是你的${state.currentSubject} AI辅导老师。有什么问题可以随时问我，我会结合你的记忆库为你解答。` }
    ]);
  }, [state.currentSubject]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Get relevant memories for current subject
      const subjectMemories = state.memories.filter(m => m.subject === state.currentSubject);
      
      // Simple keyword matching for relevance (in a real app, use vector embeddings)
      const keywords = input.split(' ');
      const relevantMemories = subjectMemories.filter(m => 
        keywords.some(kw => m.content.includes(kw) || m.notes?.includes(kw))
      ).slice(0, 5); // Limit to top 5 to save tokens

      const response = await chatWithAI(input, state.currentSubject, relevantMemories, state.knowledgeNodes, state.settings);
      
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: response };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: '抱歉，网络出现问题，请稍后再试。' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-6">
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Bot className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-slate-800">AI 辅导老师 ({state.currentSubject})</h3>
            <p className="text-xs text-slate-500">深度结合你的记忆库进行答疑</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={clsx('flex gap-4', msg.role === 'user' ? 'flex-row-reverse' : '')}>
              <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                msg.role === 'user' ? 'bg-slate-800' : 'bg-blue-100'
              )}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-blue-600" />}
              </div>
              <div className={clsx(
                'max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed',
                msg.role === 'user' 
                  ? 'bg-slate-800 text-white rounded-tr-none' 
                  : 'bg-slate-100 text-slate-800 rounded-tl-none'
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
              <div className="bg-slate-100 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                <span className="text-sm text-slate-500">正在思考并检索记忆库...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-100">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="输入你的问题，例如：帮我复习一下刚才录入的函数单调性知识点..."
              className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="absolute right-2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
