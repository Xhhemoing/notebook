'use client';

import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { AppState, Action, Subject, KnowledgeNode, Memory } from './types';
import { v4 as uuidv4 } from 'uuid';

const initialNodes: KnowledgeNode[] = [
  { id: 'math-root', subject: '数学', name: '高中数学', parentId: null },
  { id: 'math-algebra', subject: '数学', name: '代数', parentId: 'math-root' },
  { id: 'math-geometry', subject: '数学', name: '几何', parentId: 'math-root' },
  { id: 'math-func', subject: '数学', name: '函数与导数', parentId: 'math-algebra' },
  { id: 'math-seq', subject: '数学', name: '数列', parentId: 'math-algebra' },
  
  { id: 'chem-root', subject: '化学', name: '高中化学', parentId: null },
  { id: 'chem-org', subject: '化学', name: '有机化学', parentId: 'chem-root' },
  { id: 'chem-inorg', subject: '化学', name: '无机化学', parentId: 'chem-root' },
  { id: 'chem-elem', subject: '化学', name: '元素化合物', parentId: 'chem-inorg' },
  
  { id: 'phy-root', subject: '物理', name: '高中物理', parentId: null },
  { id: 'phy-mech', subject: '物理', name: '力学', parentId: 'phy-root' },
  { id: 'phy-em', subject: '物理', name: '电磁学', parentId: 'phy-root' },

  { id: 'chi-root', subject: '语文', name: '高中语文', parentId: null },
  { id: 'eng-root', subject: '英语', name: '高中英语', parentId: null },
  { id: 'bio-root', subject: '生物', name: '高中生物', parentId: null },
];

const initialMemories: Memory[] = [
  {
    id: uuidv4(),
    subject: '化学',
    content: '标况下为液体：HF',
    functionType: '细碎记忆',
    purposeType: '记忆型',
    knowledgeNodeIds: ['chem-elem'],
    confidence: 40,
    createdAt: Date.now() - 86400000,
    sourceType: 'text',
  },
  {
    id: uuidv4(),
    subject: '化学',
    content: '12g石墨中含有的C-C键数目为1.5Na',
    functionType: '细碎记忆',
    purposeType: '内化型',
    knowledgeNodeIds: ['chem-inorg'],
    confidence: 60,
    createdAt: Date.now() - 172800000,
    sourceType: 'text',
  },
  {
    id: uuidv4(),
    subject: '数学',
    content: '求导后判断单调性，注意定义域的限制。若导数含有参数，需分类讨论参数范围。',
    functionType: '方法论',
    purposeType: '内化型',
    knowledgeNodeIds: ['math-func'],
    confidence: 80,
    createdAt: Date.now(),
    sourceType: 'text',
  }
];

const initialState: AppState = {
  currentSubject: '数学',
  memories: initialMemories,
  knowledgeNodes: initialNodes,
  settings: {
    parseModel: 'gemini-3-flash-preview',
    chatModel: 'gemini-3-flash-preview',
    graphModel: 'gemini-3-flash-preview',
    homeworkPreferences: '例如：+号代表需要加入错题本，打叉代表做错了，波浪线代表不确定的知识点。请根据这些标记进行分析。',
  }
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SUBJECT':
      return { ...state, currentSubject: action.payload };
    case 'ADD_MEMORY':
      return { ...state, memories: [action.payload, ...state.memories] };
    case 'UPDATE_MEMORY':
      return {
        ...state,
        memories: state.memories.map((m) => (m.id === action.payload.id ? action.payload : m)),
      };
    case 'DELETE_MEMORY':
      return { ...state, memories: state.memories.filter((m) => m.id !== action.payload) };
    case 'ADD_NODE':
      return { ...state, knowledgeNodes: [...state.knowledgeNodes, action.payload] };
    case 'UPDATE_NODE':
      return {
        ...state,
        knowledgeNodes: state.knowledgeNodes.map((n) => (n.id === action.payload.id ? action.payload : n)),
      };
    case 'DELETE_NODE':
      // Also remove this node from any memories
      const updatedMemories = state.memories.map(m => ({
        ...m,
        knowledgeNodeIds: m.knowledgeNodeIds.filter(id => id !== action.payload)
      }));
      return { 
        ...state, 
        knowledgeNodes: state.knowledgeNodes.filter((n) => n.id !== action.payload),
        memories: updatedMemories
      };
    case 'BATCH_ADD_MEMORIES':
      return { ...state, memories: [...action.payload, ...state.memories] };
    case 'BATCH_ADD_NODES':
      return { ...state, knowledgeNodes: [...state.knowledgeNodes, ...action.payload] };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_LAST_SYNCED':
      return { ...state, lastSynced: action.payload };
    case 'LOAD_STATE':
      return { ...initialState, ...action.payload, settings: { ...initialState.settings, ...(action.payload.settings || {}) } };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    const saved = localStorage.getItem('gaokao-ai-state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'LOAD_STATE', payload: parsed });
      } catch (e) {
        console.error('Failed to parse state', e);
      }
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('gaokao-ai-state', JSON.stringify(state));
    }
  }, [state, isMounted]);

  if (!isMounted) return null; // Prevent hydration mismatch

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
