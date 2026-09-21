import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';

const pipelineSteps = [
  { label: 'Document', icon: 'description' },
  { label: 'Extraction', icon: 'search' },
  { label: 'Chunking', icon: 'content_cut' },
  { label: 'Embeddings', icon: 'scatter_plot' },
  { label: 'ChromaDB', icon: 'inventory_2' },
  { label: 'Retrieval', icon: 'manage_search' },
  { label: 'LLM', icon: 'psychology' },
  { label: 'Response', icon: 'chat' },
];

export default function Dashboard() {
  const { data: stats, loading, error } = useApi(() => api.getDashboardStats());
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-container/20 border border-error rounded p-4 text-error">
        Unable to connect to TrustRAG backend. Please ensure the server is running.
      </div>
    );
  }

  const ragOperational = stats?.rag_status === 'operational';
  const vectorOnline = stats?.vector_db_status === 'online';

  return (
    <div className="max-w-[1400px]">
      <PageHeader breadcrumb={<>/ workspace / <span className="text-primary font-bold">dashboard</span></>} />

      {/* Hero Header Section */}
      <section className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <span className="text-[11px] leading-[16px] tracking-[0.05em] font-bold text-primary px-2 py-0.5 bg-primary/10 border border-primary/20 rounded">
            TRUSTED AI
          </span>
          <span className="w-12 h-[1px] bg-outline-variant" aria-hidden="true"></span>
        </div>
        <h1 className="text-[32px] leading-[40px] tracking-[-0.02em] font-bold text-on-surface mb-4">
          Secure Retrieval-Augmented Generation
        </h1>
        <p className="text-[14px] leading-[20px] text-on-surface-variant max-w-2xl">
          TrustRAG bridges the gap between massive document repositories and secure LLM responses through cryptographically verified retrieval and robust isolation mechanisms.
        </p>
      </section>

      {/* Key Metrics (Bento Grid Style) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {/* Documents Indexed */}
        <div className="bg-surface-container border border-outline-variant p-4 flex flex-col justify-between">
          <span className="text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase">
            DOCUMENTS INDEXED
          </span>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-[24px] leading-[32px] font-semibold text-primary">
              {stats?.documents_indexed ?? 0}
            </span>
            <span className="text-[12px] leading-[16px] text-secondary">LIVE</span>
          </div>
        </div>

        {/* Chunks Stored */}
        <div className="bg-surface-container border border-outline-variant p-4 flex flex-col justify-between">
          <span className="text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase">
            CHUNKS STORED
          </span>
          <div className="mt-4">
            <span className="text-[24px] leading-[32px] font-semibold text-on-surface">
              {(stats?.chunks_stored ?? 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Vector DB */}
        <div className="bg-surface-container border border-outline-variant p-4 flex flex-col justify-between">
          <span className="text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase">
            VECTOR DATABASE
          </span>
          <div className="mt-4 flex items-center space-x-2">
            <span className="material-symbols-outlined text-primary" aria-hidden="true">database</span>
            <span className="text-[14px] leading-[20px] font-medium">{vectorOnline ? 'ChromaDB' : 'Offline'}</span>
          </div>
        </div>

        {/* Embedding Model */}
        <div className="bg-surface-container border border-outline-variant p-4 flex flex-col justify-between">
          <span className="text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase">
            EMBEDDING MODEL
          </span>
          <div className="mt-4">
            <span className="text-[14px] leading-[20px] font-medium text-tertiary">
              {stats?.embedding_model ?? 'EmbeddingGemma-300M'}
            </span>
          </div>
        </div>

        {/* RAG Engine Status */}
        <div className="bg-surface-container border border-outline-variant p-4 flex flex-col justify-between">
          <span className="text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase">
            RAG ENGINE
          </span>
          <div className="mt-4 flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${ragOperational ? 'bg-secondary' : 'bg-error'}`}></span>
            <span className={`text-[14px] leading-[20px] font-medium ${ragOperational ? 'text-secondary' : 'text-error'}`}>
              {ragOperational ? 'Operational' : 'Unavailable'}
            </span>
          </div>
        </div>
      </div>

      {/* Pipeline Visualization */}
      <div className="bg-surface-container border border-outline-variant p-6 mb-8">
        <div className="flex items-center space-x-3 mb-6">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">account_tree</span>
          <h2 className="text-[18px] leading-[24px] font-semibold text-on-surface">RAG Pipeline</h2>
        </div>

        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {pipelineSteps.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <div className="flex flex-col items-center gap-3 min-w-[90px]">
                <div className="w-14 h-14 rounded bg-surface-container-high border border-outline-variant flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">{step.icon}</span>
                </div>
                <span className="text-[12px] font-medium text-on-surface-variant text-center">
                  {step.label}
                </span>
              </div>
              {i < pipelineSteps.length - 1 && (
                <div className="flex items-center mx-1 mt-[-20px]">
                  <div className="w-8 h-px bg-outline-variant" />
                  <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[6px] border-l-outline-variant" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Security Layer */}
        <div className="mt-6 p-4 border border-dashed border-outline-variant rounded bg-surface-dim">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="material-symbols-outlined text-secondary" aria-hidden="true">shield</span>
              <div>
                <span className="text-[11px] leading-[16px] tracking-[0.05em] font-bold text-secondary uppercase">
                  TrustRAG Security Layer
                </span>
                <p className="text-[14px] leading-[20px] text-on-surface-variant mt-1">
                  Active defense-in-depth: Ed25519 signature verification, SHA-256 integrity, poison &amp; injection
                  detection, trust evaluation, and RBAC-filtered retrieval.
                </p>
              </div>
            </div>
            <span className="text-[11px] leading-[16px] tracking-[0.05em] font-bold text-secondary px-3 py-1 border border-secondary/40 rounded">
              ACTIVE
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline Components */}
        <div className="lg:col-span-2 bg-surface-container border border-outline-variant p-6">
          <h3 className="text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase mb-4">
            PIPELINE COMPONENTS
          </h3>
          <div className="space-y-3 font-mono text-[12px] leading-[16px]">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Vector Database</span>
              <span className="text-secondary">{vectorOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">RAG Pipeline</span>
              <span className="text-secondary">{ragOperational ? 'OPERATIONAL' : 'DEGRADED'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">LLM Provider</span>
              <span className="text-secondary">{stats?.llm_provider ?? 'OpenRouter'} ({stats?.llm_model ?? 'Not configured'})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Embedding Model</span>
              <span className="text-on-surface-variant">{stats?.embedding_model ?? 'EmbeddingGemma-300M'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Documents Indexed</span>
              <span className="text-on-surface-variant">{stats?.documents_indexed ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Chunks Stored</span>
              <span className="text-on-surface-variant">{(stats?.chunks_stored ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-surface-container border border-outline-variant p-6">
          <h3 className="text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase mb-4">
            QUICK ACTIONS
          </h3>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate('/documents')}
              className="w-full flex items-center justify-center space-x-2 bg-primary hover:bg-primary/90 text-on-primary py-3 px-4 rounded font-medium transition-colors"
            >
              <span className="material-symbols-outlined" aria-hidden="true">upload</span>
              <span>Upload New Document</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="w-full flex items-center justify-center space-x-2 bg-transparent border border-outline-variant hover:bg-surface-variant text-on-surface py-3 px-4 rounded font-medium transition-colors"
            >
              <span className="material-symbols-outlined" aria-hidden="true">search</span>
              <span>Query Knowledge Base</span>
            </button>
          </div>
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[14px] leading-[20px] text-on-surface-variant">Backend Connectivity</span>
              <span className="text-[14px] leading-[20px] font-medium text-secondary">Healthy</span>
            </div>
            <div className="w-full h-2 bg-surface-variant rounded">
              <div className="h-full bg-secondary rounded" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
