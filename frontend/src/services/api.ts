import type {
  DashboardStats,
  SystemStatus,
  DocumentsResponse,
  UploadResponse,
  QueryResponse,
  Persona,
  EvaluationResponse,
  AuditResponse,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

function getAuthHeader(): Record<string, string> {
  const token = sessionStorage.getItem('trustrag_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function logout() {
  sessionStorage.removeItem('trustrag_token');
  localStorage.removeItem('trustrag_token');
  window.dispatchEvent(new Event('trustrag-logout'));
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = {
    ...getAuthHeader(),
    ...(options?.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE_URL}${url}`, { ...options, headers, signal: options?.signal ?? AbortSignal.timeout(120000) });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    if (res.status === 401) logout();
    throw new Error(typeof error.detail === 'string' ? error.detail : `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Dashboard
  getDashboardStats: () => request<DashboardStats>('/dashboard/stats'),
  getSystemStatus: () => request<SystemStatus>('/status'),
  getHealth: () => request<{ status: string }>('/health'),

  // Authentication & Personas
  getPersonas: () => request<Persona[]>('/auth/personas'),
  getCurrentUser: () => request<Persona>('/auth/me'),
  login: async (username: string, password: string) => {
    const data = await request<{ access_token: string; user: Persona }>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    sessionStorage.setItem('trustrag_token', data.access_token);
    return data;
  },
  // Documents
  getDocuments: () => request<DocumentsResponse>('/documents/'),
  uploadDocument: async (
    file: File,
    accessLevel: string = 'INTERNAL',
    signatureB64?: string
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('access_level', accessLevel);
    if (signatureB64) {
      formData.append('signature_b64', signatureB64);
    }
    return request<UploadResponse>('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  },

  // RAG Query
  query: (question: string, topK: number = 3, mode: 'secure' | 'baseline' = 'secure') =>
    request<QueryResponse>('/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, top_k: topK, mode }),
    }),

  // Academic Evaluation
  runEvaluation: () => request<EvaluationResponse>('/evaluation/run'),

  // Security Audit (Admin / IT_Security)
  getAuditEvents: (limit = 50, before?: number, eventType?: string, severity?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set('before', String(before));
    if (eventType) params.set('event_type', eventType);
    if (severity) params.set('severity', severity);
    return request<AuditResponse>(`/audit/events?${params}`);
  },
};
