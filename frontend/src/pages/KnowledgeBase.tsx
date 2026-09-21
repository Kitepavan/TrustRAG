import { useState } from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import type { DocumentInfo } from '../types';

export default function KnowledgeBase() {
  const { data, loading, error } = useApi(() => api.getDocuments());
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  return (
    <div className="max-w-[1400px]">
      <PageHeader breadcrumb={<>SYSTEM / <span className="text-primary font-bold">KNOWLEDGE BASE</span></>} />

      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-[24px] leading-[32px] font-semibold text-on-surface">Knowledge Base</h1>
        <p className="text-[14px] leading-[20px] text-on-surface-variant mt-1">
          View authorized document metadata and chunk counts.
        </p>
      </div>

      <div className="bg-surface-container border border-outline-variant overflow-x-auto">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-outline-variant text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase min-w-[900px]">
          <div className="col-span-4">Document</div>
          <div className="col-span-2">Document ID</div>
          <div className="col-span-1 text-center">Pages</div>
          <div className="col-span-1 text-center">Chunks</div>
          <div className="col-span-2">Uploaded</div>
          <div className="col-span-2">SHA-256</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-on-surface-variant">Loading knowledge base...</div>
        ) : error ? (
          <div className="p-8 text-center text-error">{error}</div>
        ) : !data?.documents.length ? (
          <div className="p-8 text-center text-on-surface-variant">
            No documents in the knowledge base. Upload documents from the Documents page.
          </div>
        ) : (
          <div className="divide-y divide-outline-variant min-w-[900px]">
            {data.documents.map((doc) => (
              <DocumentRow
                key={doc.document_id}
                doc={doc}
                expanded={expandedDoc === doc.document_id}
                onToggle={() => setExpandedDoc(expandedDoc === doc.document_id ? null : (doc.document_id ?? null))}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {data && data.documents.length > 0 && (
        <div className="mt-4 text-[14px] leading-[20px] text-on-surface-variant">
          Total: {data.count} documents indexed
        </div>
      )}
    </div>
  );
}

function DocumentRow({ doc, expanded, onToggle }: { doc: DocumentInfo; expanded: boolean; onToggle: () => void }) {
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} details for ${doc.filename}`}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-surface-variant cursor-pointer transition-colors items-center"
      >
        <div className="col-span-4 flex items-center gap-3">
          <span className={`material-symbols-outlined text-[16px] transition-transform ${expanded ? 'rotate-90' : ''} text-on-surface-variant`} aria-hidden="true">chevron_right</span>
          <span className="material-symbols-outlined text-primary" aria-hidden="true">description</span>
          <span className="text-[14px] leading-[20px] font-medium text-on-surface truncate">{doc.filename}</span>
        </div>
        <div className="col-span-2 text-[12px] leading-[16px] text-on-surface-variant font-mono truncate">
          {doc.document_id || '—'}
        </div>
        <div className="col-span-1 text-center text-[14px] leading-[20px] text-on-surface-variant">
          {doc.total_pages ?? '—'}
        </div>
        <div className="col-span-1 text-center text-[14px] leading-[20px] font-medium text-on-surface-variant">
          {doc.total_chunks ?? '—'}
        </div>
        <div className="col-span-2 text-[12px] leading-[16px] text-on-surface-variant">
          {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '—'}
        </div>
        <div className="col-span-2 text-[12px] leading-[16px] text-outline font-mono truncate">
          {doc.sha256 ? `${doc.sha256.substring(0, 12)}...` : '—'}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-6 pb-4 bg-surface-dim border-t border-outline-variant">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
            <DetailItem label="Document ID" value={doc.document_id || '—'} />
            <DetailItem label="Filename" value={doc.filename} />
            <DetailItem label="Pages" value={String(doc.total_pages ?? '—')} />
            <DetailItem label="Chunks" value={String(doc.total_chunks ?? '—')} />
            <DetailItem label="Characters" value={doc.total_chars ? doc.total_chars.toLocaleString() : '—'} />
            <DetailItem label="File Size" value={`${(doc.size_bytes / 1024).toFixed(1)} KB`} />
            <DetailItem label="Uploaded By" value={doc.uploaded_by || '—'} />
            <DetailItem label="Status" value={doc.trust_status || 'Quarantined'} />
          </div>
          {doc.sha256 && (
            <div className="mt-2">
              <p className="text-[12px] leading-[16px] text-outline mb-1">SHA-256 Hash</p>
              <p className="text-[12px] leading-[16px] font-mono text-on-surface-variant bg-surface-container rounded border border-outline-variant p-2 break-all">
                {doc.sha256}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] leading-[16px] text-outline">{label}</p>
      <p className="text-[14px] leading-[20px] text-on-surface font-medium">{value}</p>
    </div>
  );
}
