import type {
  DashboardStats,
  SystemStatus,
  DocumentsResponse,
  UploadResponse,
  QueryResponse,
  Persona,
  EvaluationResponse,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('trustrag_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Demo persona credentials for the RBAC switcher. These are fixed demo accounts
// documented alongside the project; the actual signing secret lives only in the
// backend environment and is never shipped to the client. The /auth/personas
// endpoint deliberately no longer returns passwords.
const DEMO_PASSWORDS: Record<string, string> = {
  emp_user: 'emp123',
  hr_user: 'hr123',
  sec_admin: 'sec123',
  admin: 'admin123',
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = {
    ...getAuthHeader(),
    ...(options?.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE_URL}${url}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Request failed: ${res.status}`);
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
    localStorage.setItem('trustrag_token', data.access_token);
    return data;
  },
  // Persona switcher: log in as one of the fixed demo accounts.
  loginPersona: (username: string) => api.login(username, DEMO_PASSWORDS[username]),

  // Documents
  getDocuments: () => request<DocumentsResponse>('/documents/'),
  uploadDocument: async (
    file: File,
    uploadedBy: string = 'system_admin',
    signatureB64?: string
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploaded_by', uploadedBy);
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
};

// Ensure a demo session exists so authenticated endpoints (/query, /documents)
// don't 401 on first load. Verifies any cached token first, then falls back to a
// standard demo login. Called once during app bootstrap.
export async function ensureDemoLogin(): Promise<void> {
  const token = localStorage.getItem('trustrag_token');
  if (token) {
    try {
      await request<Persona>('/auth/me');
      return;
    } catch {
      localStorage.removeItem('trustrag_token');
    }
  }
  try {
    await api.login('emp_user', DEMO_PASSWORDS.emp_user);
  } catch {
    // Backend unreachable: requests will surface a clean 401/timeout to the user.
  }
}
