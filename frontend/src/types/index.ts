// API response types for TrustRAG

export interface DashboardStats {
  documents_indexed: number;
  chunks_stored: number;
  vector_db_status: string;
  embedding_model: string;
  llm_model: string;
  rag_status: string;
}

export interface ComponentStatus {
  status: string;
  version?: string;
  detail?: string;
  name?: string;
  dimensions?: number;
  engine?: string;
  metric?: string;
  provider?: string;
  model?: string;
  chunk_count?: number;
}

export interface SystemStatus {
  backend: ComponentStatus;
  embedding_model: ComponentStatus;
  vector_db: ComponentStatus;
  llm: ComponentStatus;
  rag_pipeline: ComponentStatus;
}

export interface DocumentInfo {
  filename: string;
  size_bytes: number;
  document_id?: string;
  sha256?: string;
  is_signed?: boolean;
  signature_valid?: boolean;
  trust_status?: 'Trusted' | 'Suspicious' | 'Quarantined';
  uploaded_by?: string;
  uploaded_at?: string;
  total_pages?: number;
  total_chars?: number;
  total_chunks?: number;
  status?: string;
}

export interface DocumentsResponse {
  documents: DocumentInfo[];
  count: number;
}

export interface UploadResponse {
  document_id: string;
  filename: string;
  sha256: string;
  is_signed: boolean;
  signature_valid: boolean;
  trust_status: 'Trusted' | 'Suspicious' | 'Quarantined';
  uploaded_by: string;
  uploaded_at: string;
  total_pages: number;
  total_chars: number;
  total_chunks: number;
  status: string;
}

export interface SourceChunk {
  chunk_id: string;
  document_id: string;
  page: number | string;
  trust_status?: 'Trusted' | 'Suspicious' | 'Quarantined';
  score: number;
  text_preview: string;
}

export interface QueryResponse {
  answer: string;
  sources: SourceChunk[];
  mode?: string;
  user_role?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceChunk[];
  timestamp: Date;
  mode?: string;
}

export interface Persona {
  username: string;
  full_name: string;
  role: string;
  clearance_tags: string[];
}

export interface EvaluationScenario {
  scenario: string;
  attack_vector: string;
  baseline_result: string;
  trustrag_result: string;
  baseline_passed: boolean;
  trustrag_passed: boolean;
}

export interface EvaluationSummary {
  total_scenarios: number;
  baseline_protection_rate: number;
  trustrag_protection_rate: number;
  tampered_detection_rate: number;
  prompt_injection_block_rate: number;
  knowledge_poison_detection_rate: number;
  unauthorized_rbac_block_rate: number;
  latency_overhead_ms: number;
}

export interface EvaluationResponse {
  summary: EvaluationSummary;
  scenarios: EvaluationScenario[];
}
