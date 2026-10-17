import { Fragment, type ReactNode } from 'react';
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

function PipelineNode({ step, index, turnDown = false }: { step: (typeof pipelineSteps)[number]; index: number; turnDown?: boolean }) {
  return (
    <div role="listitem" className="pipeline-step relative flex min-w-0 flex-1 flex-col items-center gap-2" style={{ animationDelay: `${index * 35}ms` }}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-primary transition-colors duration-200 hover:bg-surface-container-highest sm:h-11 sm:w-11">
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{step.icon}</span>
      </div>
      <span className="max-w-full text-center text-[12px] font-medium text-on-surface-variant">{step.label}</span>
      {turnDown && (
        <span className="material-symbols-outlined absolute -bottom-6 right-0 text-[18px] text-primary" aria-hidden="true">
          arrow_downward
        </span>
      )}
    </div>
  );
}

function FlowArrow({ direction }: { direction: 'forward' | 'back' }) {
  return (
    <span className="material-symbols-outlined shrink-0 text-[18px] text-primary" aria-hidden="true">
      {direction === 'forward' ? 'arrow_forward' : 'arrow_back'}
    </span>
  );
}

function Metric({ label, icon, children }: { label: string; icon: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3 border-b border-outline-variant/70 py-4 sm:border-b-0 xl:border-r xl:pr-4 last:border-0">
      <span className="material-symbols-outlined mt-0.5 text-[20px] text-primary" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.09em] text-on-surface-variant">{label}</p>
        <div className="mt-1.5 text-[14px] font-medium leading-5 text-on-surface">{children}</div>
      </div>
    </div>
  );
}

function Status({ healthy, children }: { healthy: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-2 ${healthy ? 'text-secondary' : 'text-error'}`}>
      <span className={`h-2 w-2 rounded-full ${healthy ? 'bg-secondary' : 'bg-error'}`} aria-hidden="true" />
      {children}
    </span>
  );
}

export default function Dashboard() {
  const { data: stats, loading, error } = useApi(() => api.getDashboardStats());
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status" aria-label="Loading dashboard">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary/30 border-t-primary motion-reduce:animate-none" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-enter rounded-lg border border-error/30 bg-error-container/10 p-5 text-[14px] text-error" role="alert">
        Unable to connect to TrustRAG. Check that the backend server is running.
      </div>
    );
  }

  const ragOperational = stats?.rag_status === 'operational';
  const vectorOnline = stats?.vector_db_status === 'online';

  return (
    <div className="page-enter mx-auto max-w-[1440px]">
      <PageHeader breadcrumb={<>Workspace <span className="px-2 text-outline">/</span><span className="font-medium text-on-surface">Dashboard</span></>} />

      <section className="pb-8 pt-3 sm:pb-9" aria-labelledby="dashboard-title">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Trusted AI</p>
        <h1 id="dashboard-title" className="max-w-4xl text-[28px] font-semibold leading-tight tracking-[-0.035em] text-on-surface sm:text-[34px]">
          Secure Retrieval-Augmented Generation
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-6 text-on-surface-variant sm:text-[15px]">
          Verified document retrieval and trust-aware controls for secure LLM responses.
        </p>
      </section>

      <section aria-label="Knowledge base metrics" className="grid grid-cols-1 gap-x-5 sm:grid-cols-2 xl:grid-cols-5 xl:border-y xl:border-outline-variant/70">
        <Metric label="Documents indexed" icon="description">
          <span className="mr-2 text-[22px] font-semibold tracking-tight">{stats?.documents_indexed ?? 0}</span>
          <span className="text-[12px] font-normal text-secondary">Live</span>
        </Metric>
        <Metric label="Chunks stored" icon="database">
          <span className="text-[22px] font-semibold tracking-tight">{(stats?.chunks_stored ?? 0).toLocaleString()}</span>
        </Metric>
        <Metric label="Vector database" icon="storage">
          {vectorOnline ? 'ChromaDB' : 'Offline'}
        </Metric>
        <Metric label="Embedding model" icon="memory">
          <span className="break-words">{stats?.embedding_model ?? 'EmbeddingGemma-300M'}</span>
        </Metric>
        <Metric label="RAG engine" icon="monitor_heart">
          <Status healthy={ragOperational}>{ragOperational ? 'Operational' : 'Unavailable'}</Status>
        </Metric>
      </section>

      <section className="py-8 sm:py-9" aria-labelledby="pipeline-title">
        <div className="mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-[21px] text-primary" aria-hidden="true">account_tree</span>
          <div>
            <h2 id="pipeline-title" className="text-[17px] font-semibold text-on-surface">RAG pipeline</h2>
            <p className="mt-1 text-[13px] text-on-surface-variant">Document processing through secure response generation</p>
          </div>
        </div>

        <div className="hidden items-start justify-between gap-2 xl:flex" role="list" aria-label="RAG pipeline stages">
          {pipelineSteps.map((step, index) => (
            <Fragment key={step.label}>
              <PipelineNode step={step} index={index} />
              {index < pipelineSteps.length - 1 && <FlowArrow direction="forward" />}
            </Fragment>
          ))}
        </div>
        <div className="space-y-7 xl:hidden" role="list" aria-label="RAG pipeline stages">
          <div className="flex items-center justify-between gap-1">
            {pipelineSteps.slice(0, 4).map((step, index) => (
              <Fragment key={step.label}>
                <PipelineNode step={step} index={index} turnDown={index === 3} />
                {index < 3 && <FlowArrow direction="forward" />}
              </Fragment>
            ))}
          </div>
          <div className="flex flex-row-reverse items-center justify-between gap-1">
            {pipelineSteps.slice(4).map((step, index) => (
              <Fragment key={step.label}>
                <PipelineNode step={step} index={index + 4} />
                {index < 3 && <FlowArrow direction="back" />}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-4 border-t border-outline-variant/70 pt-5 sm:flex-row sm:items-center">
          <img src="/trustrag-mark.png" alt="" aria-hidden="true" className="h-9 w-9 shrink-0 object-contain" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-secondary">TrustRAG security layer</p>
            <p className="mt-1 max-w-4xl text-[13px] leading-5 text-on-surface-variant">
              Ed25519 signature verification, SHA-256 integrity, poison and injection detection, trust evaluation, and RBAC-filtered retrieval.
            </p>
          </div>
          <Status healthy={true}>Active</Status>
        </div>
      </section>

      <section className="grid gap-8 border-t border-outline-variant/70 py-7 lg:grid-cols-[1fr_auto] lg:items-center" aria-label="System details and quick actions">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.09em] text-on-surface-variant">LLM provider</p>
            <p className="mt-1 text-[13px] font-medium text-on-surface">{stats?.llm_provider ?? '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.09em] text-on-surface-variant">Answer model</p>
            <p className="mt-1 break-all text-[13px] font-medium text-on-surface">{stats?.llm_model ?? 'Not configured'}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => navigate('/documents')} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-medium text-on-primary transition-all hover:-translate-y-px hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">upload_file</span>
            Add document
          </button>
          <button type="button" onClick={() => navigate('/chat')} className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 text-[13px] font-medium text-on-surface transition-all hover:-translate-y-px hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chat</span>
            Open RAG chat
          </button>
        </div>
      </section>
    </div>
  );
}
