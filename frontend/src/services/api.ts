import type { DashboardStats, SystemStatus, DocumentsResponse, UploadResponse, QueryResponse } from '../types';

// Call backend directly via CORS — avoids Vite proxy routing conflicts
const BASE_URL = 'http://localhost:8000';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, options);
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

  // Documents
  getDocuments: () => request<DocumentsResponse>('/documents/'),
  uploadDocument: async (file: File, uploadedBy: string = 'user'): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploaded_by', uploadedBy);
    return request<UploadResponse>('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  },

  // Query
  query: (question: string, topK: number = 3) =>
    request<QueryResponse>('/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, top_k: topK }),
    }),
};
