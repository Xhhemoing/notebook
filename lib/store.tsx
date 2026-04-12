'use client';

import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { AppState, Action, Subject, KnowledgeNode, Memory } from './types';
import { v4 as uuidv4 } from 'uuid';
import { openDB } from 'idb';

const DB_NAME = 'gaokao-ai-db';
const STORE_NAME = 'app-state';
const FILE_STORE_NAME = 'app-files';

async function initDB() {
  return openDB(DB_NAME, 2, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(FILE_STORE_NAME)) {
        db.createObjectStore(FILE_STORE_NAME);
      }
    },
  });
}

export async function saveFile(id: string, data: ArrayBuffer) {
  try {
    const db = await initDB();
    await db.put(FILE_STORE_NAME, data, id);
  } catch (e) {
    console.error('Failed to save file to IDB', e);
  }
}

export async function loadFile(id: string): Promise<ArrayBuffer | null> {
  try {
    const db = await initDB();
    return await db.get(FILE_STORE_NAME, id);
  } catch (e) {
    console.error('Failed to load file from IDB', e);
    return null;
  }
}

export async function deleteFile(id: string) {
  try {
    const db = await initDB();
    await db.delete(FILE_STORE_NAME, id);
  } catch (e) {
    console.error('Failed to delete file from IDB', e);
  }
}

const initialNodes: KnowledgeNode[] = [
  { id: '1', subject: '数学', name: '高中数学', parentId: null, order: 1 },
  { id: '1.1', subject: '数学', name: '代数', parentId: '1', order: 1 },
  { id: '1.2', subject: '数学', name: '几何', parentId: '1', order: 2 },
  { id: '1.1.1', subject: '数学', name: '函数与导数', parentId: '1.1', order: 1 },
  { id: '1.1.2', subject: '数学', name: '数列', parentId: '1.1', order: 2 },
  
  { id: '2', subject: '化学', name: '高中化学', parentId: null, order: 2 },
  { id: '2.1', subject: '化学', name: '有机化学', parentId: '2', order: 1 },
  { id: '2.2', subject: '化学', name: '无机化学', parentId: '2', order: 2 },
  { id: '2.2.1', subject: '化学', name: '元素化合物', parentId: '2.2', order: 1 },
  
  { id: '3', subject: '物理', name: '高中物理', parentId: null, order: 3 },
  { id: '3.1', subject: '物理', name: '力学', parentId: '3', order: 1 },
  { id: '3.2', subject: '物理', name: '电磁学', parentId: '3', order: 2 },

  { id: '4', subject: '语文', name: '高中语文', parentId: null, order: 4 },
  { id: '5', subject: '英语', name: '高中英语', parentId: null, order: 5 },
  { id: '6', subject: '生物', name: '高中生物', parentId: null, order: 6 },
];

const initialMemories: Memory[] = [
  {
    id: uuidv4(),
    subject: '化学',
    content: '标况下为液体：HF',
    functionType: '细碎记忆',
    purposeType: '记忆型',
    knowledgeNodeIds: ['2.2.1'],
    confidence: 40,
    mastery: 20,
    createdAt: Date.now() - 86400000,
    sourceType: 'text',
  },
  {
    id: uuidv4(),
    subject: '化学',
    content: '12g石墨中含有的C-C键数目为1.5Na',
    functionType: '细碎记忆',
    purposeType: '内化型',
    knowledgeNodeIds: ['2.2'],
    confidence: 60,
    mastery: 40,
    createdAt: Date.now() - 172800000,
    sourceType: 'text',
  },
  {
    id: uuidv4(),
    subject: '数学',
    content: '求导后判断单调性，注意定义域的限制。若导数含有参数，需分类讨论参数范围。',
    functionType: '方法论',
    purposeType: '内化型',
    knowledgeNodeIds: ['1.1.1'],
    confidence: 80,
    mastery: 60,
    createdAt: Date.now(),
    sourceType: 'text',
  }
];

const initialState: AppState = {
  currentSubject: '数学',
  memories: initialMemories,
  knowledgeNodes: initialNodes,
  textbooks: [],
  reviewPlans: [],
  settings: {
    parseModel: 'gemini-3-flash-preview',
    chatModel: 'gemini-3-flash-preview',
    graphModel: 'gemini-3-flash-preview',
    reviewModel: 'gemini-3-flash-preview',
    homeworkPreferences: '例如：+号代表需要加入错题本，打叉代表做错了，波浪线代表不确定的知识点。请根据这些标记进行分析。',
    studentProfile: '该学生目前处于高考复习阶段，理科基础较好，但容易在细节上出错。需要加强对基础概念的内化。',
    dailyReviewLimit: 20,
    reviewBatchSize: 3,
    enableLogging: true,
    minReviewDifficulty: 0,
    maxReviewDifficulty: 10,
  },
  logs: [],
  inputHistory: [],
  resources: []
};

async function saveState(state: AppState) {
  try {
    const db = await initDB();
    await db.put(STORE_NAME, state, 'main-state');
    
    // Sync to D1 if on Cloudflare
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      fetch('/api/sync', {
        method: 'POST',
        body: JSON.stringify({ action: 'push_memories', payload: state.memories })
      }).catch(e => console.error('D1 Sync failed', e));
      
      fetch('/api/sync', {
        method: 'POST',
        body: JSON.stringify({ action: 'push_nodes', payload: state.knowledgeNodes })
      }).catch(e => console.error('D1 Sync failed', e));
    }
  } catch (e) {
    console.error('Failed to save state to IDB', e);
  }
}

async function loadState(): Promise<AppState | null> {
  try {
    const db = await initDB();
    const localState = await db.get(STORE_NAME, 'main-state');
    
    // Try to pull from D1 if on Cloudflare
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          body: JSON.stringify({ action: 'pull' })
        });
        if (res.ok) {
          const { data } = await res.json();
          if (data) {
            // Merge D1 data with local state
            return {
              ...(localState || initialState),
              ...data,
              // Prefer D1 data for core entities
              memories: data.memories || localState?.memories || [],
              knowledgeNodes: data.knowledgeNodes || localState?.knowledgeNodes || [],
              textbooks: data.textbooks || localState?.textbooks || [],
              resources: data.resources || localState?.resources || []
            };
          }
        }
      } catch (e) {
        console.error('Failed to pull from D1', e);
      }
    }
    
    return localState;
  } catch (e) {
    console.error('Failed to load state from IDB', e);
    return null;
  }
}

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
      if (state.knowledgeNodes.some(n => n.id === action.payload.id)) return state;
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
      const newNodes = action.payload.filter(newNode => !state.knowledgeNodes.some(existingNode => existingNode.id === newNode.id));
      return { ...state, knowledgeNodes: [...state.knowledgeNodes, ...newNodes] };
    case 'BATCH_DELETE_NODES':
      const updatedMemoriesBatch = state.memories.map(m => ({
        ...m,
        knowledgeNodeIds: m.knowledgeNodeIds.filter(id => !action.payload.includes(id))
      }));
      return { 
        ...state, 
        knowledgeNodes: state.knowledgeNodes.filter((n) => !action.payload.includes(n.id)),
        memories: updatedMemoriesBatch
      };
    case 'ADD_TEXTBOOK':
      return { ...state, textbooks: [...state.textbooks, action.payload] };
    case 'UPDATE_TEXTBOOK':
      return {
        ...state,
        textbooks: state.textbooks.map(t => t.id === action.payload.id ? action.payload : t)
      };
    case 'DELETE_TEXTBOOK':
      return { ...state, textbooks: state.textbooks.filter(t => t.id !== action.payload) };
    case 'ADD_REVIEW_PLAN':
      return { ...state, reviewPlans: [action.payload, ...state.reviewPlans] };
    case 'UPDATE_REVIEW_PLAN':
      return {
        ...state,
        reviewPlans: state.reviewPlans.map(p => p.id === action.payload.id ? action.payload : p)
      };
    case 'DELETE_REVIEW_PLAN':
      return { ...state, reviewPlans: state.reviewPlans.filter(p => p.id !== action.payload) };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_CORRELATIONS':
      return { ...state, knowledgeNodes: action.payload };
    case 'SET_LAST_SYNCED':
      return { ...state, lastSynced: action.payload };
    case 'LOAD_STATE':
      return { 
        ...initialState, 
        ...action.payload, 
        settings: { ...initialState.settings, ...(action.payload.settings || {}) }, 
        logs: action.payload.logs || [],
        textbooks: action.payload.textbooks || [],
        reviewPlans: action.payload.reviewPlans || [],
        inputHistory: action.payload.inputHistory || [],
        resources: action.payload.resources || []
      };
    case 'ADD_LOG':
      const logWithMetadata = {
        timestamp: Date.now(),
        ...action.payload,
        id: uuidv4(), // Always generate a new unique ID to fix React key warning
      };
      return { ...state, logs: [logWithMetadata, ...state.logs].slice(0, 500) }; // Keep last 500 logs
    case 'CLEAR_LOGS':
      return { ...state, logs: [] };
    case 'SAVE_NODES_STATE':
      return { ...state, lastNodesState: [...state.knowledgeNodes] };
    case 'UNDO_NODES':
      if (!state.lastNodesState) return state;
      return { ...state, knowledgeNodes: state.lastNodesState, lastNodesState: undefined };
    case 'ADD_INPUT_HISTORY':
      return { ...state, inputHistory: [action.payload, ...state.inputHistory].slice(0, 50) };
    case 'DELETE_INPUT_HISTORY':
      return { ...state, inputHistory: state.inputHistory.filter(h => h.id !== action.payload) };
    case 'DELETE_MEMORIES_BY_FUNCTION':
      return {
        ...state,
        memories: state.memories.filter(m => 
          !(m.subject === action.payload.subject && m.functionType === action.payload.functionType)
        )
      };
    case 'BATCH_DELETE_MEMORIES':
      return {
        ...state,
        memories: state.memories.filter(m => !action.payload.includes(m.id))
      };
    case 'BATCH_DELETE_TEXTBOOKS':
      return {
        ...state,
        textbooks: state.textbooks.filter(t => !action.payload.includes(t.id))
      };
    case 'DELETE_SUBJECT_DATA':
      return {
        ...state,
        memories: state.memories.filter(m => m.subject !== action.payload.subject),
        knowledgeNodes: state.knowledgeNodes.filter(n => n.subject !== action.payload.subject),
        textbooks: state.textbooks.filter(t => t.subject !== action.payload.subject),
        inputHistory: state.inputHistory.filter(h => h.subject !== action.payload.subject)
      };
    case 'DELETE_SUBJECT_NODES':
      const subjectNodesToDelete = new Set(state.knowledgeNodes.filter(n => n.subject === action.payload.subject).map(n => n.id));
      const memoriesAfterSubjectNodeDelete = state.memories.map(m => ({
        ...m,
        knowledgeNodeIds: m.knowledgeNodeIds.filter(id => !subjectNodesToDelete.has(id))
      }));
      return {
        ...state,
        knowledgeNodes: state.knowledgeNodes.filter(n => n.subject !== action.payload.subject),
        memories: memoriesAfterSubjectNodeDelete
      };
    case 'DELETE_SUBJECT_MISTAKES':
      return {
        ...state,
        memories: state.memories.filter(m => !(m.subject === action.payload.subject && m.isMistake))
      };
    case 'DELETE_SUBJECT_TEXTBOOKS':
      return {
        ...state,
        textbooks: state.textbooks.filter(t => t.subject !== action.payload.subject)
      };
    case 'UPDATE_DRAFT':
      return {
        ...state,
        ...action.payload
      };
    case 'ADD_RESOURCE':
      return { ...state, resources: [action.payload, ...state.resources] };
    case 'DELETE_RESOURCE':
      return { ...state, resources: state.resources.filter(r => r.id !== action.payload) };
    case 'SET_RESOURCES':
      return { ...state, resources: action.payload };
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
    async function load() {
      try {
        const idbState = await loadState();
        if (idbState) {
          dispatch({ type: 'LOAD_STATE', payload: idbState });
        } else {
          // Fallback to localStorage migration
          const saved = localStorage.getItem('gaokao-ai-state');
          if (saved) {
            const parsed = JSON.parse(saved);
            dispatch({ type: 'LOAD_STATE', payload: parsed });
            // Save to IDB and remove from localStorage to free up space
            await saveState(parsed);
            localStorage.removeItem('gaokao-ai-state');
          }
        }
      } catch (e) {
        console.error('Failed to load state', e);
      } finally {
        setIsMounted(true);
      }
    }
    
    load();
  }, []);

  useEffect(() => {
    if (isMounted) {
      const timeoutId = setTimeout(() => {
        saveState(state);
      }, 1000); // Debounce save by 1 second
      return () => clearTimeout(timeoutId);
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
