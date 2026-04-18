'use client';

import React, { createContext, useContext, useReducer, useEffect, useState, useRef } from 'react';
import { AppState, Action, Subject, KnowledgeNode, Memory, Link, Resource, Textbook } from './types';
import { v4 as uuidv4 } from 'uuid';
import { deleteDB, openDB } from 'idb';

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

async function saveState(state: AppState) {
  try {
    const db = await initDB();
    await db.put(STORE_NAME, state, 'main-state');
  } catch (e) {
    console.error('Failed to save state to IDB', e);
  }
}

async function loadState(): Promise<AppState | null> {
  try {
    const db = await initDB();
    return await db.get(STORE_NAME, 'main-state');
  } catch (e) {
    console.error('Failed to load state from IDB', e);
    return null;
  }
}

export async function clearLocalAppData() {
  try {
    await deleteDB(DB_NAME);
  } catch (e) {
    console.error('Failed to delete main IndexedDB database', e);
  }

  try {
    await deleteDB('ai_study_db');
  } catch (e) {
    console.error('Failed to delete image IndexedDB database', e);
  }

  try {
    localStorage.removeItem('gaokao-ai-state');
    localStorage.removeItem('aistudio_state');
  } catch (e) {
    console.error('Failed to clear localStorage state', e);
  }
}

export async function syncWithD1(state: AppState, dispatch: React.Dispatch<Action>) {
  if (typeof window === 'undefined' || window.location.hostname === 'localhost') return;

  try {
    const authToken = state.settings.cloudflareToken?.trim();
    const syncKey = state.settings.syncKey?.trim();

    if (!authToken || !syncKey) {
      console.warn('D1 Sync skipped: missing cloudflareToken or syncKey');
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    // 1. Pull incremental changes
    const pullRes = await fetch('/api/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'pull',
        payload: { lastSynced: state.lastSynced || 0 },
        syncKey,
      })
    });
    
    if (pullRes.ok) {
      const contentType = pullRes.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const { data, serverTime } = await pullRes.json();
        if (data) {
          if (data.memories?.length > 0) dispatch({ type: 'BATCH_ADD_MEMORIES', payload: data.memories });
          if (data.knowledgeNodes?.length > 0) dispatch({ type: 'BATCH_ADD_NODES', payload: data.knowledgeNodes });
          dispatch({ type: 'SET_LAST_SYNC', payload: serverTime });
        }
      } else {
        console.warn('D1 Sync Pull: Expected JSON but got', contentType);
      }
    } else {
      console.warn('D1 Sync Pull failed with status:', pullRes.status);
    }

    // 2. Push local changes
    const pushMemories = state.memories.filter(m => (m.updatedAt || m.createdAt) > (state.lastSynced || 0));
    if (pushMemories.length > 0) {
      const pushRes = await fetch('/api/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'push_memories', payload: pushMemories, syncKey })
      });
      if (!pushRes.ok) console.warn('D1 Sync Push Memories failed:', pushRes.status);
    }

    const pushNodes = state.knowledgeNodes.filter(n => (n.updatedAt || 0) > (state.lastSynced || 0));
    if (pushNodes.length > 0) {
      const pushRes = await fetch('/api/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'push_nodes', payload: pushNodes, syncKey })
      });
      if (!pushRes.ok) console.warn('D1 Sync Push Nodes failed:', pushRes.status);
    }

  } catch (e) {
    console.error('D1 Sync failed', e);
    // Don't throw to prevent crashing the UI, just log it
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

function buildDerivedLinks(
  memories: Memory[],
  knowledgeNodes: KnowledgeNode[],
  resources: Resource[],
  textbooks: Textbook[],
  prevLinks: Link[] = []
): Link[] {
  const now = Date.now();
  const prevMap = new Map(prevLinks.filter(link => link.isDerived).map(link => [link.id, link]));
  const nodeIdSet = new Set(knowledgeNodes.map(node => node.id));
  const resourceIdSet = new Set(resources.map(resource => resource.id));
  const textbookIdSet = new Set(textbooks.map(textbook => textbook.id));
  const links: Link[] = [];

  for (const memory of memories) {
    for (const nodeId of Array.from(new Set(memory.knowledgeNodeIds || []))) {
      if (!nodeIdSet.has(nodeId)) continue;
      const id = `derived:memory-node:${memory.id}:${nodeId}`;
      const prev = prevMap.get(id);
      links.push({
        id,
        fromType: 'memory',
        fromId: memory.id,
        toType: 'node',
        toId: nodeId,
        relationType: 'memory_node',
        score: 1,
        isDerived: true,
        source: 'system',
        createdAt: prev?.createdAt || now,
        updatedAt: now,
      });
    }

    if (memory.sourceTextbookId && textbookIdSet.has(memory.sourceTextbookId)) {
      const pagePart = memory.sourceTextbookPage ? `:${memory.sourceTextbookPage}` : '';
      const id = `derived:memory-textbook:${memory.id}:${memory.sourceTextbookId}${pagePart}`;
      const prev = prevMap.get(id);
      links.push({
        id,
        fromType: 'memory',
        fromId: memory.id,
        toType: 'textbook',
        toId: memory.sourceTextbookId,
        relationType: 'memory_textbook',
        score: 0.9,
        isDerived: true,
        source: 'system',
        createdAt: prev?.createdAt || now,
        updatedAt: now,
      });
    }

    for (const resourceId of Array.from(new Set(memory.sourceResourceIds || []))) {
      if (!resourceIdSet.has(resourceId)) continue;
      const id = `derived:memory-resource:${memory.id}:${resourceId}`;
      const prev = prevMap.get(id);
      links.push({
        id,
        fromType: 'memory',
        fromId: memory.id,
        toType: 'resource',
        toId: resourceId,
        relationType: 'memory_resource',
        score: 0.85,
        isDerived: true,
        source: 'system',
        createdAt: prev?.createdAt || now,
        updatedAt: now,
      });
    }
  }

  for (const node of knowledgeNodes) {
    if (!node.parentId || !nodeIdSet.has(node.parentId)) continue;
    const id = `derived:node-parent:${node.id}:${node.parentId}`;
    const prev = prevMap.get(id);
    links.push({
      id,
      fromType: 'node',
      fromId: node.id,
      toType: 'node',
      toId: node.parentId,
      relationType: 'node_parent',
      score: 1,
      isDerived: true,
      source: 'system',
      createdAt: prev?.createdAt || now,
      updatedAt: now,
    });
  }

  return links;
}

function mergeLinksWithDerived(
  existingLinks: Link[],
  memories: Memory[],
  knowledgeNodes: KnowledgeNode[],
  resources: Resource[],
  textbooks: Textbook[]
): Link[] {
  const manualLinks = (existingLinks || []).filter(link => !link.isDerived);
  const derivedLinks = buildDerivedLinks(memories, knowledgeNodes, resources, textbooks, existingLinks || []);
  const manualIds = new Set(manualLinks.map(link => link.id));
  return [...manualLinks, ...derivedLinks.filter(link => !manualIds.has(link.id))];
}

function withDerivedLinks(state: AppState): AppState {
  return {
    ...state,
    links: mergeLinksWithDerived(
      state.links || [],
      state.memories || [],
      state.knowledgeNodes || [],
      state.resources || [],
      state.textbooks || []
    )
  };
}

const initialState: AppState = {
  currentSubject: '数学',
  memories: initialMemories,
  knowledgeNodes: initialNodes,
  links: buildDerivedLinks(initialMemories, initialNodes, [], [], []),
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
    syncInterval: 300, // 5 minutes
    enableAutoSync: true,
  },
  logs: [],
  inputHistory: [],
  resources: [],
  lastSynced: 0
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SUBJECT':
      return { ...state, currentSubject: action.payload };
    case 'ADD_MEMORY':
      return withDerivedLinks({
        ...state,
        memories: [{
          ...action.payload,
          version: action.payload.version || 1,
          status: action.payload.status || 'active',
          dataSource: action.payload.dataSource || 'manual',
          updatedAt: action.payload.updatedAt || Date.now()
        }, ...state.memories],
      });
    case 'UPDATE_MEMORY':
      return withDerivedLinks({
        ...state,
        memories: state.memories.map((m) =>
          m.id === action.payload.id ? {
            ...action.payload,
            version: (m.version || 1) + 1,
            status: action.payload.status || 'active',
            dataSource: action.payload.dataSource || m.dataSource || 'manual',
            updatedAt: Date.now()
          } : m
        ),
      });
    case 'DELETE_MEMORY':
      return withDerivedLinks({ ...state, memories: state.memories.filter((m) => m.id !== action.payload) });
    case 'ADD_NODE':
      if (state.knowledgeNodes.some(n => n.id === action.payload.id)) return state;
      return withDerivedLinks({
        ...state,
        knowledgeNodes: [...state.knowledgeNodes, {
          ...action.payload,
          version: action.payload.version || 1,
          status: action.payload.status || 'active',
          dataSource: action.payload.dataSource || 'manual',
          updatedAt: action.payload.updatedAt || Date.now()
        }],
      });
    case 'UPDATE_NODE':
      return withDerivedLinks({
        ...state,
        knowledgeNodes: state.knowledgeNodes.map((n) =>
          n.id === action.payload.id ? {
            ...action.payload,
            version: (n.version || 1) + 1,
            status: action.payload.status || 'active',
            dataSource: action.payload.dataSource || n.dataSource || 'manual',
            updatedAt: Date.now()
          } : n
        ),
      });
    case 'DELETE_NODE':
      // Also remove this node from any memories
      const updatedMemories = state.memories.map(m => ({
        ...m,
        knowledgeNodeIds: m.knowledgeNodeIds.filter(id => id !== action.payload)
      }));
      return withDerivedLinks({ 
        ...state, 
        knowledgeNodes: state.knowledgeNodes.filter((n) => n.id !== action.payload),
        memories: updatedMemories
      });
    case 'BATCH_ADD_MEMORIES':
      return withDerivedLinks({
        ...state,
        memories: [
          ...action.payload.map(memory => ({
            ...memory,
            version: memory.version || 1,
            status: memory.status || 'active',
            dataSource: memory.dataSource || 'manual',
            updatedAt: memory.updatedAt || memory.createdAt || Date.now(),
          })),
          ...state.memories,
        ],
      });
    case 'BATCH_ADD_NODES':
      const newNodes = action.payload.filter(newNode => !state.knowledgeNodes.some(existingNode => existingNode.id === newNode.id));
      return withDerivedLinks({
        ...state,
        knowledgeNodes: [
          ...state.knowledgeNodes,
          ...newNodes.map(node => ({
            ...node,
            version: node.version || 1,
            status: node.status || 'active',
            dataSource: node.dataSource || 'manual',
            updatedAt: node.updatedAt || Date.now()
          })),
        ],
      });
    case 'BATCH_DELETE_NODES':
      const updatedMemoriesBatch = state.memories.map(m => ({
        ...m,
        knowledgeNodeIds: m.knowledgeNodeIds.filter(id => !action.payload.includes(id))
      }));
      return withDerivedLinks({ 
        ...state, 
        knowledgeNodes: state.knowledgeNodes.filter((n) => !action.payload.includes(n.id)),
        memories: updatedMemoriesBatch
      });
    case 'ADD_TEXTBOOK':
      return withDerivedLinks({
        ...state,
        textbooks: [...state.textbooks, {
          ...action.payload,
          version: action.payload.version || 1,
          status: action.payload.status || 'active',
          dataSource: action.payload.dataSource || 'manual',
          updatedAt: action.payload.updatedAt || Date.now()
        }]
      });
    case 'UPDATE_TEXTBOOK':
      return withDerivedLinks({
        ...state,
        textbooks: state.textbooks.map(t => t.id === action.payload.id ? {
          ...action.payload,
          version: (t.version || 1) + 1,
          status: action.payload.status || 'active',
          dataSource: action.payload.dataSource || t.dataSource || 'manual',
          updatedAt: Date.now()
        } : t)
      });
    case 'DELETE_TEXTBOOK':
      return withDerivedLinks({ ...state, textbooks: state.textbooks.filter(t => t.id !== action.payload) });
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
    case 'SET_LAST_SYNC':
      return { ...state, lastSynced: action.payload };
    case 'LOAD_STATE':
      return withDerivedLinks({ 
        ...initialState, 
        ...action.payload, 
        settings: { ...initialState.settings, ...(action.payload.settings || {}) }, 
        logs: action.payload.logs || [],
        textbooks: action.payload.textbooks || [],
        reviewPlans: action.payload.reviewPlans || [],
        inputHistory: action.payload.inputHistory || [],
        resources: action.payload.resources || [],
        links: action.payload.links || []
      });
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
      return withDerivedLinks({
        ...state,
        memories: state.memories.filter(m => 
          !(m.subject === action.payload.subject && m.functionType === action.payload.functionType)
        )
      });
    case 'BATCH_DELETE_MEMORIES':
      return withDerivedLinks({
        ...state,
        memories: state.memories.filter(m => !action.payload.includes(m.id))
      });
    case 'BATCH_DELETE_TEXTBOOKS':
      return withDerivedLinks({
        ...state,
        textbooks: state.textbooks.filter(t => !action.payload.includes(t.id))
      });
    case 'DELETE_SUBJECT_DATA':
      return withDerivedLinks({
        ...state,
        memories: state.memories.filter(m => m.subject !== action.payload.subject),
        knowledgeNodes: state.knowledgeNodes.filter(n => n.subject !== action.payload.subject),
        textbooks: state.textbooks.filter(t => t.subject !== action.payload.subject),
        inputHistory: state.inputHistory.filter(h => h.subject !== action.payload.subject)
      });
    case 'DELETE_SUBJECT_NODES':
      const subjectNodesToDelete = new Set(state.knowledgeNodes.filter(n => n.subject === action.payload.subject).map(n => n.id));
      const memoriesAfterSubjectNodeDelete = state.memories.map(m => ({
        ...m,
        knowledgeNodeIds: m.knowledgeNodeIds.filter(id => !subjectNodesToDelete.has(id))
      }));
      return withDerivedLinks({
        ...state,
        knowledgeNodes: state.knowledgeNodes.filter(n => n.subject !== action.payload.subject),
        memories: memoriesAfterSubjectNodeDelete
      });
    case 'DELETE_SUBJECT_MISTAKES':
      return withDerivedLinks({
        ...state,
        memories: state.memories.filter(m => !(m.subject === action.payload.subject && m.isMistake))
      });
    case 'DELETE_SUBJECT_TEXTBOOKS':
      return withDerivedLinks({
        ...state,
        textbooks: state.textbooks.filter(t => t.subject !== action.payload.subject)
      });
    case 'UPDATE_DRAFT':
      return {
        ...state,
        ...action.payload
      };
    case 'ADD_RESOURCE':
      return withDerivedLinks({
        ...state,
        resources: [{
          ...action.payload,
          version: action.payload.version || 1,
          status: action.payload.status || 'active',
          dataSource: action.payload.dataSource || 'manual',
          updatedAt: action.payload.updatedAt || Date.now()
        }, ...state.resources]
      });
    case 'DELETE_RESOURCE':
      return withDerivedLinks({ ...state, resources: state.resources.filter(r => r.id !== action.payload) });
    case 'SET_RESOURCES':
      return withDerivedLinks({
        ...state,
        resources: action.payload.map(resource => ({
          ...resource,
          version: resource.version || 1,
          status: resource.status || 'active',
          dataSource: resource.dataSource || 'manual',
          updatedAt: resource.updatedAt || resource.createdAt || Date.now()
        }))
      });
    case 'ADD_LINK':
      return withDerivedLinks({
        ...state,
        links: [
          ...state.links.filter(link => link.id !== action.payload.id),
          {
            ...action.payload,
            isDerived: action.payload.isDerived || false,
            source: action.payload.source || 'manual',
            updatedAt: Date.now()
          }
        ]
      });
    case 'BATCH_ADD_LINKS':
      return withDerivedLinks({
        ...state,
        links: [
          ...state.links.filter(existing => !action.payload.some(item => item.id === existing.id)),
          ...action.payload.map(link => ({
            ...link,
            isDerived: link.isDerived || false,
            source: link.source || 'manual',
            updatedAt: Date.now()
          }))
        ]
      });
    case 'DELETE_LINK':
      return withDerivedLinks({
        ...state,
        links: state.links.filter(link => link.isDerived || link.id !== action.payload)
      });
    case 'REMOVE_DRAFT_PROPOSAL':
      return {
        ...state,
        memories: state.memories.map(m => {
          if (m.id === action.payload) {
             const { draftProposal, ...rest } = m as any;
             return rest as Memory;
          }
          return m;
        })
      };
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

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (isMounted && state.settings.enableAutoSync && state.settings.syncInterval > 0) {
      const interval = setInterval(() => {
        syncWithD1(stateRef.current, dispatch).catch(() => {});
      }, state.settings.syncInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [isMounted, state.settings.enableAutoSync, state.settings.syncInterval, dispatch]);

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
