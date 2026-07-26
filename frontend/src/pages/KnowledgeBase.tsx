import { useState } from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import type { DocumentInfo } from '../types';

export default function KnowledgeBase() {
  const { data, loading, error } = useApi(() => api.getDocuments());
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Knowledge Base</h1>
        <p className="text-sm text-slate-500 mt-1">View all indexed documents and their chunk data</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="col-span-4">Document</div>
          <div className="col-span-2">Document ID</div>
          <div className="col-span-1 text-center">Pages</div>
          <div className="col-span-1 text-center">Chunks</div>
          <div className="col-span-2">Uploaded</div>
          <div className="col-span-2">SHA-256</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading knowledge base...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : !data?.documents.length ? (
          <div className="p-8 text-center text-slate-400">
            No documents in the knowledge base. Upload documents from the Documents page.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.documents.map((doc) => (
              <DocumentRow
                key={doc.filename}
                doc={doc}
                expanded={expandedDoc === doc.filename}
                onToggle={() => setExpandedDoc(expandedDoc === doc.filename ? null : doc.filename)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {data && data.documents.length > 0 && (
        <div className="mt-4 text-sm text-slate-500">
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
        onClick={onToggle}
        className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors items-center"
      >
        <div className="col-span-4 flex items-center gap-2">
          <span className={`text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}>▸</span>
          <span className="text-lg">📄</span>
          <span className="text-sm font-medium text-slate-900 truncate">{doc.filename}</span>
        </div>
        <div className="col-span-2 text-xs text-slate-500 mono truncate">
          {doc.document_id || '—'}
        </div>
        <div className="col-span-1 text-center text-sm text-slate-700">
          {doc.total_pages ?? '—'}
        </div>
        <div className="col-span-1 text-center text-sm font-medium text-slate-700">
          {doc.total_chunks ?? '—'}
        </div>
        <div className="col-span-2 text-xs text-slate-500">
          {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '—'}
        </div>
        <div className="col-span-2 text-xs text-slate-400 mono truncate">
          {doc.sha256 ? `${doc.sha256.substring(0, 12)}...` : '—'}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-6 pb-4 bg-slate-50 border-t border-slate-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
            <DetailItem label="Document ID" value={doc.document_id || '—'} />
            <DetailItem label="Filename" value={doc.filename} />
            <DetailItem label="Pages" value={String(doc.total_pages ?? '—')} />
            <DetailItem label="Chunks" value={String(doc.total_chunks ?? '—')} />
            <DetailItem label="Characters" value={doc.total_chars ? doc.total_chars.toLocaleString() : '—'} />
            <DetailItem label="File Size" value={`${(doc.size_bytes / 1024).toFixed(1)} KB`} />
            <DetailItem label="Uploaded By" value={doc.uploaded_by || '—'} />
            <DetailItem label="Status" value={doc.status || '—'} />
          </div>
          {doc.sha256 && (
            <div className="mt-2">
              <p className="text-xs text-slate-500 mb-1">SHA-256 Hash</p>
              <p className="text-xs mono text-slate-600 bg-white rounded border border-slate-200 p-2 break-all">
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
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-slate-700 font-medium">{value}</p>
    </div>
  );
}
