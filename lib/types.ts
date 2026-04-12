export type Subject = string;

export type MemoryFunction = string;
export type MemoryPurpose = string;

export interface FSRSData {
  due: number; // timestamp
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
}

export interface Memory {
  id: string;
  subject: Subject;
  region?: string; // e.g., 'Beijing', 'National Paper 1'
  content: string; // Question stem or knowledge point
  correctAnswer?: string; // Standard answer
  questionType?: string; // e.g., 'multiple-choice', 'fill-in-the-blank', 'essay'
  source?: string; // e.g., '2023 Midterm Exam'
  functionType: MemoryFunction;
  purposeType: MemoryPurpose;
  knowledgeNodeIds: string[];
  confidence: number; // 0-100, maps to FSRS retrievability
  mastery: number; // 0-100, maps to FSRS stability
  createdAt: number;
  lastReviewed?: number;
  notes?: string;
  sourceType: 'text' | 'image';
  imageUrl?: string;
  imageUrls?: string[];
  isMistake?: boolean;
  wrongAnswer?: string;
  errorReason?: string;
  visualDescription?: string;
  visualDescriptions?: string[];
  analysisProcess?: string;
  fsrs?: FSRSData;
  embedding?: number[]; // For RAG
  type?: 'concept' | 'qa' | 'vocabulary';
  collectionId?: string; // For grouping into "books" like Vocabulary Book
  collectionName?: string;
  vocabularyData?: {
    context?: string;
    meaning?: string;
    usage?: string;
    mnemonics?: string;
    synonyms?: string[];
  };
}

export interface KnowledgeNode {
  id: string; // Hierarchical ID like "1.2.1"
  subject: Subject;
  name: string;
  parentId: string | null;
  order: number; // Order within siblings
  correlation?: { [targetId: string]: number }; // Correlation score 0-1 with other nodes
  testingMethods?: string[]; // 考法
}

export interface CustomProvider {
  id: string;
  name: string;
  type: 'openai' | 'gemini';
  baseUrl?: string;
  apiKey: string;
  models: { id: string; name: string }[];
}

export interface CustomModel {
  id: string;
  name: string;
  provider: 'openai' | 'gemini';
  apiKey: string;
  baseUrl?: string;
  modelId: string;
}

export interface Settings {
  parseModel: string;
  chatModel: string;
  graphModel: string;
  reviewModel: string;
  embeddingModel?: string;
  cloudflareEndpoint?: string;
  cloudflareToken?: string;
  homeworkPreferences?: string;
  userSymbols?: string; // Meaning of user symbols
  studentProfile?: string; // AI's perception of the student
  dailyReviewLimit: number;
  reviewBatchSize: number;
  enableLogging: boolean;
  minReviewDifficulty: number;
  maxReviewDifficulty: number;
  fontSize?: 'small' | 'base' | 'medium' | 'large';
  fsrsUpdateFrequency?: string;
  customModels?: CustomModel[]; // Legacy
  customProviders?: CustomProvider[];
  syncInterval: number; // in seconds, 0 means manual only
  enableAutoSync: boolean;
}

export interface AILog {
  id: string;
  timestamp: number;
  type: 'parse' | 'chat' | 'graph' | 'review';
  model: string;
  prompt: string;
  response: string;
}

export interface TextbookPage {
  id: string;
  pageNumber: number;
  content: string;
  imageUrl: string;
  embedding?: number[];
}

export interface Textbook {
  id: string;
  name: string;
  subject: Subject;
  fileId?: string; // IDB key for the raw file
  fileType?: string; // e.g., 'application/pdf'
  totalPages?: number;
  pages: TextbookPage[]; // Cached pages or pre-rendered pages
  framework?: KnowledgeNode[]; // AI generated framework
  createdAt: number;
}

export interface ReviewPlanItem {
  id: string;
  title: string;
  content: string;
  type: 'knowledge' | 'exercise' | 'summary';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
  relatedNodeIds: string[];
}

export interface ReviewPlan {
  id: string;
  subject: Subject;
  createdAt: number;
  items: ReviewPlanItem[];
  analysis: string; // AI's analysis of weak points
}

export interface InputHistoryItem {
  id: string;
  timestamp: number;
  subject: Subject;
  input: string;
  images: string[];
  parsedItems: any[];
  newNodes: any[];
  deletedNodeIds: string[];
  aiAnalysis: string;
  identifiedSubject: string;
}

export interface Resource {
  id: string;
  name: string;
  type: string; // 'folder', 'pdf', 'image', 'doc', 'other'
  size: number;
  createdAt: number;
  data?: string; // base64 for local, URL for remote
  subject: Subject;
  tags?: string[];
  parentId?: string | null;
  isFolder?: boolean;
}

export interface AppState {
  currentSubject: Subject;
  memories: Memory[];
  knowledgeNodes: KnowledgeNode[];
  textbooks: Textbook[];
  reviewPlans: ReviewPlan[];
  settings: Settings;
  lastSynced?: number;
  logs: AILog[];
  lastNodesState?: KnowledgeNode[]; // For one-level undo
  inputHistory: InputHistoryItem[];
  draftInput?: string;
  draftImages?: string[];
  resources: Resource[];
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
  | { type: 'BATCH_DELETE_NODES'; payload: string[] }
  | { type: 'ADD_TEXTBOOK'; payload: Textbook }
  | { type: 'UPDATE_TEXTBOOK'; payload: Textbook }
  | { type: 'DELETE_TEXTBOOK'; payload: string }
  | { type: 'ADD_REVIEW_PLAN'; payload: ReviewPlan }
  | { type: 'UPDATE_REVIEW_PLAN'; payload: ReviewPlan }
  | { type: 'DELETE_REVIEW_PLAN'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'SET_CORRELATIONS'; payload: KnowledgeNode[] }
  | { type: 'SET_LAST_SYNCED'; payload: number }
  | { type: 'SET_LAST_SYNC'; payload: number }
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'ADD_LOG'; payload: Omit<AILog, 'id' | 'timestamp'> & { id?: string; timestamp?: number } }
  | { type: 'CLEAR_LOGS' }
  | { type: 'SAVE_NODES_STATE' }
  | { type: 'UNDO_NODES' }
  | { type: 'ADD_INPUT_HISTORY'; payload: InputHistoryItem }
  | { type: 'DELETE_INPUT_HISTORY'; payload: string }
  | { type: 'DELETE_MEMORIES_BY_FUNCTION'; payload: { subject: Subject; functionType: string } }
  | { type: 'BATCH_DELETE_MEMORIES'; payload: string[] }
  | { type: 'BATCH_DELETE_TEXTBOOKS'; payload: string[] }
  | { type: 'DELETE_SUBJECT_DATA'; payload: { subject: Subject } }
  | { type: 'DELETE_SUBJECT_NODES'; payload: { subject: Subject } }
  | { type: 'DELETE_SUBJECT_MISTAKES'; payload: { subject: Subject } }
  | { type: 'DELETE_SUBJECT_TEXTBOOKS'; payload: { subject: Subject } }
  | { type: 'UPDATE_DRAFT'; payload: { draftInput?: string; draftImages?: string[] } }
  | { type: 'ADD_RESOURCE'; payload: Resource }
  | { type: 'DELETE_RESOURCE'; payload: string }
  | { type: 'SET_RESOURCES'; payload: Resource[] };
