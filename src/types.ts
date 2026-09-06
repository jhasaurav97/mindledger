export type ReflectionMode = 'reflect' | 'brainstorm' | 'socratic' | 'action_plan' | 'summarize';

export type ActiveView = 'editor' | 'history' | 'ask_journal' | 'memory_graph' | 'decision_lab';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface ReflectionLocation {
  placeId?: string;
  placeName: string;
  formattedAddress?: string;
  latitude: number;
  longitude: number;
}

export interface InteractionEntry {
  id: string;
  userId: string;
  title: string;
  category: 'personal' | 'work' | 'creative' | 'mindfulness' | 'learning';
  tags: string[];
  messages: ChatMessage[];
  summary?: string;
  keyInsights?: string[];
  actionItems?: string[];
  location?: ReflectionLocation | null;
  notionExport?: {
    pageId: string;
    pageUrl: string;
    exportedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface JournalCitation {
  id: string;
  title: string;
  category: string;
  createdAt: string;
}

export interface AskJournalResponse {
  answer: string;
  citations: JournalCitation[];
  hasSufficientEvidence: boolean;
  entriesAnalyzedCount: number;
  modelUsed?: string;
}

// Memory Graph Types
export type MemoryNodeType =
  | 'Goal'
  | 'Theme'
  | 'Challenge'
  | 'Decision'
  | 'Action'
  | 'Win'
  | 'Habit';

export type MemoryRelationshipType =
  | 'supports'
  | 'relates_to'
  | 'blocks'
  | 'leads_to'
  | 'resolves'
  | 'reinforces'
  | 'part_of';

export type MemoryNodeStatus = 'active' | 'completed' | 'archived' | 'in_progress';

export interface MemoryNode {
  id: string;
  userId: string;
  type: MemoryNodeType;
  title: string;
  description: string;
  confidence: number; // 0.0 - 1.0 (e.g. 0.85)
  sourceEntryIds: string[]; // referenced journal interaction IDs
  sourceQuotes?: string[];
  status: MemoryNodeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryRelationship {
  id: string;
  userId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: MemoryRelationshipType;
  sourceEntryIds: string[];
  explanation?: string;
  createdAt: string;
}

export interface MemoryGraphData {
  nodes: MemoryNode[];
  relationships: MemoryRelationship[];
  lastExtractedAt?: string;
}

export interface ExtractMemoryGraphResponse {
  nodes: MemoryNode[];
  relationships: MemoryRelationship[];
  extractedCount: number;
  relationshipsCount: number;
  summary: string;
  modelUsed?: string;
}

// Decision Lab Types
export interface DecisionOptionInput {
  id: string;
  label: string;
  description?: string;
}

export interface DecisionOptionComparison {
  optionId: string;
  optionLabel: string;
  pros: string[];
  cons: string[];
  viabilityScore?: string; // e.g. "High", "Moderate", "Viable with constraints"
}

export interface DecisionJournalEvidenceItem {
  entryId: string;
  entryTitle: string;
  entryDate?: string;
  relevantQuoteOrFinding: string;
}

export interface DecisionAnalysisResult {
  summary: string;
  optionComparison: DecisionOptionComparison[];
  pros: string[];
  cons: string[];
  risks: string[];
  tradeoffs: string[];
  uncertainties: string[]; // Missing information & unknown variables
  factsFromUser: string[];
  journalEvidence?: DecisionJournalEvidenceItem[];
  assumptions: string[];
  geminiReasoning: string;
  recommendation: string;
  confidenceRating: string; // e.g. "Moderate (70%) - Dependent on market conditions"
  nextStep: string;
  professionalDisclaimer?: string; // Flagged if medical, legal, financial, or high-impact
}

export interface DecisionRecord {
  id: string;
  userId: string;
  question: string;
  context: string;
  options: DecisionOptionInput[];
  criteria: string[];
  useJournalEvidence: boolean;
  analysis: DecisionAnalysisResult;
  sourceEntryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AnalyzeDecisionRequest {
  question: string;
  context: string;
  options: DecisionOptionInput[];
  criteria: string[];
  useJournalEvidence: boolean;
  entries?: InteractionEntry[];
  cachedEntries?: InteractionEntry[];
}

export interface AnalyzeDecisionResponse {
  analysis: DecisionAnalysisResult;
  sourceEntryIds: string[];
  modelUsed?: string;
}

// Notion Integration Types
export interface NotionIntegrationStatus {
  connected: boolean;
  configured: boolean;
  workspaceName?: string;
  workspaceIcon?: string;
  botId?: string;
  destinationPageId?: string;
  destinationPageTitle?: string;
  connectedAt?: string;
}

export interface NotionDestinationPage {
  id: string;
  title: string;
  url: string;
  icon?: string;
  lastEditedTime?: string;
  parentType?: string;
}

export interface NotionExportRecord {
  id: string;
  reflectionId: string;
  notionPageId: string;
  notionPageUrl: string;
  destinationPageId?: string;
  destinationPageTitle?: string;
  exportedAt: string;
}

export interface NotionExportResponse {
  success: boolean;
  pageId: string;
  pageUrl: string;
  alreadyExported?: boolean;
  isUpdate?: boolean;
  message?: string;
}

// Gmail Intelligence Bridge Types
export interface GmailIntegrationStatus {
  connected: boolean;
  configured: boolean;
  emailAddress?: string;
  connectedAt?: string;
  updatedAt?: string;
  scopes?: string[];
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  sender: string;
  date: string;
  snippet: string;
}

export interface GmailMessageDetail {
  id: string;
  threadId: string;
  subject: string;
  sender: string;
  to?: string;
  date: string;
  snippet: string;
  bodyText: string;
}

export interface GmailSourceEmailFacts {
  sender: string;
  subject: string;
  date: string;
  relevantFacts: string[];
}

export interface GmailMindLedgerAnalysis {
  summary: string;
  actionItems: string[];
  deadlines: string[];
  opportunities: string[];
  risks: string[];
  unknowns: string[];
  suggestedNextStep: string;
}

export interface GmailAnalysisResult {
  messageId: string;
  sourceEmail: GmailSourceEmailFacts;
  mindledgerAnalysis: GmailMindLedgerAnalysis;
  modelUsed?: string;
  analyzedAt: string;
}

