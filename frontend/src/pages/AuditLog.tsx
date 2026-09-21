import { useState } from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import type { AuditEvent, PipelineStep } from '../types';

const EVENT_TYPES = ['', 'QUERY_COMPLETED', 'QUERY_NO_CONTEXT', 'QUERY_FAILED', 'BASELINE_MODE_USED', 'BASELINE_ACCESS_DENIED', 'UPLOAD_COMPLETED', 'UPLOAD_QUARANTINED', 'UPLOAD_REJECTED', 'UPLOAD_FAILED'];

function severityClasses(severity: AuditEvent['severity']): string {
  if (severity === 'error') return 'text-error border-error/40 bg-error-container/20';
  if (severity === 'warning') return 'text-tertiary border-tertiary/40 bg-tertiary-container/20';
  return 'text-secondary border-secondary/40 bg-secondary-container/20';
}

function stageClasses(status: PipelineStep['status']): string {
  if (status === 'blocked' || status === 'error') return 'text-error';
  if (status === 'warning') return 'text-tertiary';
  return 'text-secondary';
}

function stageIcon(status: PipelineStep['status']): string {
  if (status === 'blocked') return 'block';
  if (status === 'error') return 'error';
  if (status === 'warning') return 'warning';
  return 'check_circle';
}

function formatDetails(event: AuditEvent): string {
  const summary = event.details.pipeline_log
    ?.map((step) => `${step.status === 'blocked' || step.status === 'error' ? '✗' : '✓'} ${step.stage}${step.count ? ` (${step.count})` : ''}`)
    .join('  ');
  return summary ?? '';
}

export default function AuditLog() {
  const [eventType, setEventType] = useState('');
  const [severity, setSeverity] = useState('');
  const { data, loading, error, refetch } = useApi(
    () => api.getAuditEvents(50, undefined, eventType || undefined, severity || undefined),
    [eventType, severity],
  );

  return (
    <div className="max-w-[1400px]">
      <PageHeader breadcrumb={<>SECURITY / <span className="text-primary font-bold">AUDIT LOG</span></>} />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[24px] leading-[32px] font-semibold text-on-surface">Security Audit Log</h1>
          <p className="text-[14px] leading-[20px] text-on-surface-variant mt-1">
            Best-effort mutable record of security decisions (not tamper-evident). Prompt text and document contents are never logged.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch({ silent: true })}
          className="flex items-center space-x-2 bg-transparent border border-outline-variant hover:bg-surface-variant text-on-surface py-2 px-4 rounded font-medium transition-colors"
        >
          <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          aria-label="Filter by event type"
          className="bg-surface-variant text-on-surface border border-outline-variant text-[12px] rounded-lg px-2.5 py-2 font-medium focus:outline-none focus:border-primary"
        >
          <option value="">All event types</option>
          {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          aria-label="Filter by severity"
          className="bg-surface-variant text-on-surface border border-outline-variant text-[12px] rounded-lg px-2.5 py-2 font-medium focus:outline-none focus:border-primary"
        >
          <option value="">All severities</option>
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="error">error</option>
        </select>
      </div>

      {loading ? (
        <div className="p-8 text-center text-on-surface-variant">Loading...</div>
      ) : error ? (
        <div className="p-8 text-center text-error">{error}</div>
      ) : !data?.events.length ? (
        <div className="bg-surface-container border border-outline-variant p-8 text-center text-on-surface-variant">
          No security events recorded yet. Run a query or upload a document.
        </div>
      ) : (
        <div className="bg-surface-container border border-outline-variant overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                {['Time', 'Actor', 'Event', 'Severity', 'Trace'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.events.map((event) => (
                <tr key={event.id} className="border-b border-outline-variant hover:bg-surface-variant transition-colors align-top">
                  <td className="py-3 px-4 text-[12px] text-on-surface-variant whitespace-nowrap">
                    {new Date(event.timestamp).toLocaleTimeString()}
                    <div className="text-[10px] opacity-70">{new Date(event.timestamp).toLocaleDateString()}</div>
                  </td>
                  <td className="py-3 px-4 text-[13px] text-on-surface">{event.actor}</td>
                  <td className="py-3 px-4 text-[13px] font-mono text-primary whitespace-nowrap">{event.event_type}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 border rounded ${severityClasses(event.severity)}`}>
                      {event.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {formatDetails(event) ? (
                      <details>
                        <summary className="cursor-pointer text-[12px] text-on-surface-variant hover:text-on-surface">
                          View pipeline trace
                        </summary>
                        <div className="mt-2 space-y-1 font-mono text-[11px]">
                          {event.details.pipeline_log?.map((step, i) => (
                            <div key={i} className={stageClasses(step.status)}>
                              <span className="material-symbols-outlined text-[12px] align-[-2px] mr-1" aria-hidden="true">{stageIcon(step.status)}</span>
                              {step.stage}
                              {typeof step.count === 'number' ? ` (${step.count})` : ''} — {step.message}
                            </div>
                          ))}
                          {event.details.duration_ms !== undefined && (
                            <div className="text-on-surface-variant">duration: {event.details.duration_ms}ms</div>
                          )}
                        </div>
                      </details>
                    ) : (
                      <span className="text-[12px] text-on-surface-variant">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.next_cursor && (
            <div className="p-3 text-center text-[12px] text-on-surface-variant border-t border-outline-variant">
              Older events available (cursor {data.next_cursor}) — refine filters to view.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
