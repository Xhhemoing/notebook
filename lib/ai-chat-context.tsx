'use client';

import React, { createContext, useContext } from 'react';
import { useChat } from '@ai-sdk/react';
import { useAppContext } from './store';
import { v4 as uuidv4 } from 'uuid';
import { Memory } from './types';

type GlobalAIChatContextType = ReturnType<typeof useChat> & {
  startMistakeAnalysis: (images: string[]) => void;
  startGraphAnalysis: (text: string, images?: string[]) => void;
  clearChat: () => void;
};

const GlobalAIChatContext = createContext<GlobalAIChatContextType | null>(null);

export function GlobalAIChatProvider({ children }: { children: React.ReactNode }) {
  const { state, dispatch } = useAppContext();
  
  const chat = useChat({
    api: '/api/chat',
    onToolCall({ toolCall }) {
      if (toolCall.toolName === 'proposeGraphChanges') {
        const { changes, analysis } = toolCall.args as any;
        console.log('Got graph changes tool call:', changes);
        // Translate changes directly into draftGraphProposal operations
        const operations = changes.map((c: any) => {
          if (c.action === 'ADD_NODE') {
             return { action: 'add', name: c.targetName, parentId: null };
          } else if (c.action === 'ADD_RELATION') {
             return { action: 'move', nodeId: c.targetName, parentId: null }; 
             // Just an approximation since we don't know the exact IDs in the tool call 
             // But actually, we just pass what we can so the human-in-the-loop catches it.
          }
          return null;
        }).filter(Boolean);

        dispatch({ 
          type: 'UPDATE_DRAFT', 
          payload: { 
            draftGraphProposal: { reasoning: analysis, operations: operations } 
          } 
        });
      } else if (toolCall.toolName === 'storeMistake') {
        const payload = toolCall.args as any;
        
        const mistakeMemory: Memory = {
          id: uuidv4(),
          subject: state.currentSubject,
          content: payload.originalQuestion || 'Unknown Question',
          sourceType: 'image',
          functionType: '错题收录',
          purposeType: '记忆型',
          knowledgeNodeIds: [],
          confidence: 0,
          mastery: 0,
          createdAt: Date.now(),
          isMistake: true,
          wrongAnswer: payload.studentAnswer,
          correctAnswer: payload.correctAnswer,
          errorReason: payload.explanation,
          visualDescription: payload.coreConcept
        };
        
        dispatch({ type: 'ADD_MEMORY', payload: mistakeMemory });
        console.log('Mistake memory added via AI tool call!');
      }
    }
  });

  const startMistakeAnalysis = (images: string[]) => {
    chat.append({
      role: 'user',
      content: [
        { type: 'text', text: '请分析这张错题截图，提取原题、我的错解、正确答案，并指出核心概念和我的错因。完成分析后请自动调用存储错题(storeMistake) 的工具保存！如果有图谱推荐也请调用 proposeGraphChanges。' },
        ...images.map(img => ({ type: 'image', image: img }))
      ] as any
    });
  };

  const startGraphAnalysis = (text: string, images?: string[]) => {
    chat.append({
      role: 'user',
      content: [
        { type: 'text', text: `请根据以下资料更新我的知识图谱: ${text}` },
        ...(images ? images.map(img => ({ type: 'image', image: img })) : [])
      ] as any
    });
  };

  const clearChat = () => {
    chat.setMessages([]);
  };

  return (
    <GlobalAIChatContext.Provider value={{ ...chat, startMistakeAnalysis, startGraphAnalysis, clearChat }}>
      {children}
    </GlobalAIChatContext.Provider>
  );
}

export function useGlobalAIChat() {
  const ctx = useContext(GlobalAIChatContext);
  if (!ctx) throw new Error('useGlobalAIChat must be used within GlobalAIChatProvider');
  return ctx;
}
