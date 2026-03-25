export type Subject = '语文' | '数学' | '英语' | '物理' | '化学' | '生物';

export type MemoryFunction = '细碎记忆' | '方法论' | '关联型记忆' | '系统型';
export type MemoryPurpose = '内化型' | '记忆型' | '补充知识型' | '系统型';

export interface Memory {
  id: string;
  subject: Subject;
  content: string;
  functionType: MemoryFunction;
  purposeType: MemoryPurpose;
  knowledgeNodeIds: string[];
  confidence: number; // 0-100
  createdAt: number;
  lastReviewed?: number;
  notes?: string;
  sourceType: 'text' | 'image';
  imageUrl?: string;
  isMistake?: boolean;
  analysisProcess?: string;
}

export interface KnowledgeNode {
  id: string;
  subject: Subject;
  name: string;
  parentId: string | null;
}

export interface Settings {
  parseModel: string;
  chatModel: string;
  graphModel: string;
  cfWorkerUrl?: string;
  cfSyncToken?: string;
  homeworkPreferences?: string;
}

export interface AppState {
  currentSubject: Subject;
  memories: Memory[];
  knowledgeNodes: KnowledgeNode[];
  settings: Settings;
  lastSynced?: number;
}

export type Action =
  | { type: 'SET_SUBJECT'; payload: Subject }
  | { type: 'ADD_MEMORY'; payload: Memory }
  | { type: 'UPDATE_MEMORY'; payload: Memory }
  | { type: 'DELETE_MEMORY'; payload: string }
  | { type: 'ADD_NODE'; payload: KnowledgeNode }
  | { type: 'UPDATE_NODE'; payload: KnowledgeNode }
  | { type: 'DELETE_NODE'; payload: string }
  | { type: 'BATCH_ADD_MEMORIES'; payload: Memory[] }
  | { type: 'BATCH_ADD_NODES'; payload: KnowledgeNode[] }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'SET_LAST_SYNCED'; payload: number }
  | { type: 'LOAD_STATE'; payload: AppState };
