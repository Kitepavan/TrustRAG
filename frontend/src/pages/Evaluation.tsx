import { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { api } from '../services/api';
import type { EvaluationResponse } from '../types';

export default function Evaluation() {
  const [data, setData] = useState<EvaluationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBenchmark = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.runEvaluation();
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to run security benchmark evaluation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBenchmark();
  }, []);

  return (
    <div className="max-w-[1400px]">
      <PageHeader
        breadcrumb={<>/ workspace / <span className="text-primary font-bold">academic-security-benchmark</span></>}
        actions={
          <button
            onClick={fetchBenchmark}
            disabled={loading}
            className="flex items-center px-4 py-1.5 bg-primary text-on-primary text-[12px] font-bold tracking-wider uppercase rounded hover:brightness-110 transition-all shadow disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] mr-1.5 ${loading ? 'animate-spin' : ''}`}>
              {loading ? 'sync' : 'security_update_good'}
            </span>
            {loading ? 'RUNNING...' : 'RE-RUN BENCHMARK'}
          </button>
        }
      />

      <div className="mb-8">
        <h1 className="text-[24px] leading-[32px] font-semibold text-on-surface">Academic Security Benchmark</h1>
        <p className="text-[14px] leading-[20px] text-on-surface-variant mt-1">
          Synthetic component checks; not an end-to-end LLM attack evaluation.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-error-container/20 border border-error text-error text-[14px] rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Metrics Banner */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-5 bg-surface-container border border-secondary/40 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <span className="material-symbols-outlined text-[64px] text-secondary">verified_user</span>
            </div>
            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">TrustRAG Protection Rate</p>
            <p className="text-[32px] font-extrabold text-secondary mt-1">
              {data.summary.trustrag_protection_rate}%
            </p>
            <p className="text-[12px] text-secondary/80 mt-1">{data.scenarios.filter(s => s.trustrag_passed).length} of {data.scenarios.length} checks passed</p>
          </div>

          <div className="p-5 bg-surface-container border border-error/40 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <span className="material-symbols-outlined text-[64px] text-error">gpp_maybe</span>
            </div>
            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Baseline RAG Protection</p>
            <p className="text-[32px] font-extrabold text-error mt-1">
              {data.summary.baseline_protection_rate}%
            </p>
            <p className="text-[12px] text-error/80 mt-1">Unfiltered-control assumptions</p>
          </div>

          <div className="p-5 bg-surface-container border border-outline-variant rounded-xl shadow-lg">
            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Prompt Injection Block Rate</p>
            <p className="text-[32px] font-extrabold text-primary mt-1">
              {data.summary.prompt_injection_block_rate}%
            </p>
            <p className="text-[12px] text-on-surface-variant mt-1">Ingestion & Retrieval scan</p>
          </div>

          <div className="p-5 bg-surface-container border border-outline-variant rounded-xl shadow-lg">
            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Suite Duration</p>
            <p className="text-[32px] font-extrabold text-on-surface mt-1">
              {data.summary.suite_duration_ms} ms
            </p>
            <p className="text-[12px] text-on-surface-variant mt-1">Not pipeline latency overhead</p>
          </div>
        </div>
      )}

      {/* Scenario Attack Matrix */}
      {data && (
        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-xl mb-8">
          <div className="p-6 border-b border-outline-variant flex items-center justify-between">
            <div>
              <h2 className="text-[18px] font-bold text-on-surface">Attack Benchmark Scenarios ({data.scenarios.length})</h2>
              <p className="text-[12px] text-on-surface-variant mt-0.5">
                Fixed synthetic cases; no measured LLM attack success rate
              </p>
            </div>
            <span className="px-3 py-1 bg-surface-variant text-primary text-[11px] font-bold rounded-full uppercase tracking-wider">
              Component checks
            </span>
          </div>

          <div className="divide-y divide-outline-variant">
            {data.scenarios.map((sc, idx) => (
              <div key={idx} className="p-6 hover:bg-surface-variant/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="px-2.5 py-0.5 bg-outline-variant/50 text-on-surface text-[11px] font-bold rounded">
                        SCENARIO #{idx + 1}
                      </span>
                      <h3 className="text-[16px] font-bold text-on-surface">{sc.scenario}</h3>
                    </div>
                    <p className="text-[13px] text-on-surface-variant mt-1">
                      <span className="font-semibold text-primary">Attack Vector:</span> {sc.attack_vector}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Baseline result */}
                  <div className="p-4 bg-error-container/10 border border-error/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-bold text-error uppercase tracking-wider">Baseline RAG</span>
                      <span className="px-2 py-0.5 bg-error/20 text-error text-[10px] font-bold rounded uppercase">
                        {sc.baseline_passed ? 'PASSED' : 'NOT BLOCKED'}
                      </span>
                    </div>
                    <p className="text-[13px] text-on-surface-variant">{sc.baseline_result}</p>
                  </div>

                  {/* TrustRAG result */}
                  <div className="p-4 bg-secondary-container/10 border border-secondary/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-bold text-secondary uppercase tracking-wider">TrustRAG Framework</span>
                      <span className="px-2 py-0.5 bg-secondary/20 text-secondary text-[10px] font-bold rounded uppercase">
                        {sc.trustrag_passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                    <p className="text-[13px] text-on-surface-variant">{sc.trustrag_result}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
