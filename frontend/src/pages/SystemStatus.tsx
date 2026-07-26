import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import StatusBadge from '../components/StatusBadge';
import type { ComponentStatus } from '../types';

const componentLabels: Record<string, { label: string; icon: string }> = {
  backend: { label: 'FastAPI Backend', icon: '🚀' },
  embedding_model: { label: 'Embedding Model', icon: '🧮' },
  vector_db: { label: 'Vector Database', icon: '🗄️' },
  llm: { label: 'LLM Provider', icon: '🤖' },
  rag_pipeline: { label: 'RAG Pipeline', icon: '⚙️' },
};

export default function SystemStatus() {
  const { data, loading, error, refetch } = useApi(() => api.getSystemStatus());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Status</h1>
          <p className="text-sm text-slate-500 mt-1">Component health diagnostics</p>
        </div>
        <button
          onClick={refetch}
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Unable to connect to TrustRAG backend</p>
          <p className="text-sm mt-1">Please ensure the FastAPI server is running on port 8000.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(data || {}).map(([key, component]) => (
            <StatusCard
              key={key}
              info={componentLabels[key] || { label: key, icon: '❓' }}
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
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{info.icon}</span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{info.label}</p>
            {component.detail && (
              <p className="text-xs text-slate-400">{component.detail}</p>
            )}
          </div>
        </div>
        <StatusBadge status={component.status} size="md" />
      </div>

      <div className="space-y-2 mt-4">
        {component.version && (
          <StatusRow label="Version" value={component.version} />
        )}
        {component.name && (
          <StatusRow label="Model" value={component.name} />
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
        {component.model && (
          <StatusRow label="Model" value={component.model} />
        )}
      </div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-700 font-medium mono">{value}</span>
    </div>
  );
}
