import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/PageHeader';
import type { ComponentStatus } from '../types';

const componentLabels: Record<string, { label: string; icon: string }> = {
  backend: { label: 'FastAPI Backend', icon: 'dns' },
  embedding_model: { label: 'Embedding Model', icon: 'scatter_plot' },
  vector_db: { label: 'Vector Database', icon: 'inventory_2' },
  llm: { label: 'LLM Provider', icon: 'psychology' },
  rag_pipeline: { label: 'RAG Pipeline', icon: 'settings' },
};

export default function SystemStatus() {
  const { data, loading, error, refetch } = useApi(() => api.getSystemStatus());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px]">
      <PageHeader breadcrumb={<>SYSTEM / <span className="text-primary font-bold">STATUS</span></>} />

      {/* Page Title */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[24px] leading-[32px] font-semibold text-on-surface">System Status</h1>
          <p className="text-[14px] leading-[20px] text-on-surface-variant mt-1">
            Component health diagnostics.
          </p>
        </div>
        <button
          onClick={() => void refetch({ silent: true })}
          className="flex items-center space-x-2 bg-transparent border border-outline-variant hover:bg-surface-variant text-on-surface py-2 px-4 rounded font-medium transition-colors"
        >
          <span className="material-symbols-outlined">refresh</span>
          <span>{'Refresh'}</span>
        </button>
      </div>

      {error ? (
        <div className="bg-error-container/20 border border-error rounded p-4 text-error">
          <p className="font-medium">Unable to connect to TrustRAG backend</p>
          <p className="text-[14px] leading-[20px] mt-1">Please ensure the FastAPI server is running on port 8000.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(data || {}).map(([key, component]) => (
            <StatusCard
              key={key}
              info={componentLabels[key] || { label: key, icon: 'help' }}
              component={component}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusCard({ info, component }: { info: { label: string; icon: string }; component: ComponentStatus }) {
  return (
    <div className="bg-surface-container border border-outline-variant p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="material-symbols-outlined text-primary">{info.icon}</span>
          <div>
            <p className="text-[14px] leading-[20px] font-semibold text-on-surface">{info.label}</p>
            {component.detail && (
              <p className="text-[12px] leading-[16px] text-outline mt-1">{component.detail}</p>
            )}
          </div>
        </div>
        <StatusBadge status={component.status} size="md" />
      </div>

      <div className="space-y-3 mt-4">
        {component.version && (
          <StatusRow label="Version" value={component.version} />
        )}
        {/* name and model both represent the model identifier — show once to avoid duplicate rows */}
        {(component.name || component.model) && (
          <StatusRow label="Model" value={component.name || component.model || ''} />
        )}
        {component.dimensions && (
          <StatusRow label="Dimensions" value={String(component.dimensions)} />
        )}
        {component.engine && (
          <StatusRow label="Engine" value={component.engine} />
        )}
        {component.metric && (
          <StatusRow label="Similarity" value={component.metric} />
        )}
        {component.chunk_count !== undefined && (
          <StatusRow label="Chunks" value={String(component.chunk_count)} />
        )}
        {component.provider && (
          <StatusRow label="Provider" value={component.provider} />
        )}
      </div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[14px] leading-[20px]">
      <span className="text-outline">{label}</span>
      <span className="text-on-surface font-medium font-mono">{value}</span>
    </div>
  );
}
