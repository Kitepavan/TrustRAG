import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import Card from '../components/Card';

const pipelineSteps = [
  { label: 'Documents', icon: '📄' },
  { label: 'Text Extraction', icon: '🔍' },
  { label: 'Chunking', icon: '✂️' },
  { label: 'Embeddings', icon: '🧮' },
  { label: 'ChromaDB', icon: '🗄️' },
  { label: 'Retrieval', icon: '🔎' },
  { label: 'LLM', icon: '🤖' },
];

export default function Dashboard() {
  const { data: stats, loading, error } = useApi(() => api.getDashboardStats());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Unable to connect to TrustRAG backend. Please ensure the server is running.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">TrustRAG baseline RAG system overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <Card
          title="Documents Indexed"
          value={stats?.documents_indexed ?? 0}
          icon="📄"
        />
        <Card
          title="Chunks Stored"
          value={stats?.chunks_stored ?? 0}
          icon="🧩"
        />
        <Card
          title="Vector Database"
          value={stats?.vector_db_status ?? 'Unknown'}
          subtitle="ChromaDB"
          icon="🗄️"
          status={stats?.vector_db_status === 'online' ? 'online' : 'offline'}
        />
        <Card
          title="Embedding Model"
          value={stats?.embedding_model ?? 'Unknown'}
          subtitle="768 dimensions"
          icon="🧮"
          status="online"
        />
        <Card
          title="RAG Engine"
          value={stats?.rag_status === 'operational' ? 'Ready' : 'Unknown'}
          subtitle={stats?.llm_model ?? ''}
          icon="🤖"
          status={stats?.rag_status === 'operational' ? 'online' : 'offline'}
        />
      </div>

      {/* Pipeline Visualization */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Baseline RAG Pipeline</h2>
        <p className="text-sm text-slate-500 mb-6">Current data flow without security mechanisms</p>

        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {pipelineSteps.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <div className="flex flex-col items-center gap-2 min-w-[90px]">
                <div className="w-14 h-14 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-2xl">
                  {step.icon}
                </div>
                <span className="text-xs font-medium text-slate-600 text-center">
                  {step.label}
                </span>
              </div>
              {i < pipelineSteps.length - 1 && (
                <div className="flex items-center mx-1 mt-[-20px]">
                  <div className="w-8 h-px bg-slate-300" />
                  <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[6px] border-l-slate-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
