import { useRef, useState } from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import FileUpload from '../components/FileUpload';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/PageHeader';
import type { DocumentInfo } from '../types';

const PAGE_SIZE = 5;

export default function Documents() {
  const { data, loading, error, refetch } = useApi(() => api.getDocuments());
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; doc?: DocumentInfo } | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const uploadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUpload = async (file: File) => {
    const result = await api.uploadDocument(file);
    setUploadResult({
      success: true,
      message: `Successfully indexed "${result.filename}" — ${result.total_chunks} chunks created.`,
      doc: {
        filename: result.filename,
        size_bytes: file.size,
        document_id: result.document_id,
        sha256: result.sha256,
        uploaded_by: result.uploaded_by,
        uploaded_at: result.uploaded_at,
        total_pages: result.total_pages,
        total_chars: result.total_chars,
        total_chunks: result.total_chunks,
        status: result.status,
      },
    });
    void refetch();
    if (uploadTimerRef.current) clearTimeout(uploadTimerRef.current);
    uploadTimerRef.current = setTimeout(() => setUploadResult(null), 8000);
  };

  const allDocuments = data?.documents ?? [];
  const filtered = search.trim()
    ? allDocuments.filter((doc) => doc.filename.toLowerCase().includes(search.trim().toLowerCase()))
    : allDocuments;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedDocs = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalChunks = allDocuments.reduce((acc, doc) => acc + (doc.total_chunks || 0), 0);
  const totalPagesCount = allDocuments.reduce((acc, doc) => acc + (doc.total_pages || 0), 0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="max-w-[1400px]">
      <PageHeader breadcrumb={<>FILE_SYSTEM / <span className="text-primary font-bold">DOCUMENTS</span></>} />

      {/* Page Title */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[24px] leading-[32px] font-semibold text-on-surface">Documents</h1>
          <p className="text-[14px] leading-[20px] text-on-surface-variant mt-1">
            Manage documents used by the TrustRAG knowledge base.
          </p>
        </div>
        <button
          type="button"
          onClick={() => searchInputRef.current?.focus()}
          className="flex items-center space-x-2 bg-transparent border border-outline-variant hover:bg-surface-variant text-on-surface py-2 px-4 rounded font-medium transition-colors"
        >
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <span>Search</span>
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Upload Section */}
        <div className="bg-surface-container border border-outline-variant p-6">
          <FileUpload onUpload={handleUpload} />
          {uploadResult && (
            <div className={`mt-4 px-4 py-3 rounded text-sm ${
              uploadResult.success
                ? 'bg-secondary-container/20 border border-secondary text-secondary'
                : 'bg-error-container/20 border border-error text-error'
            }`}>
              {uploadResult.message}
              {uploadResult.doc && (
                <div className="mt-2 text-xs opacity-75">
                  Document ID: {uploadResult.doc.document_id} |
                  Pages: {uploadResult.doc.total_pages} |
                  SHA-256: {uploadResult.doc.sha256?.substring(0, 16)}...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active Knowledge Inventory */}
        <div className="bg-surface-container border border-outline-variant p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase">
              ACTIVE KNOWLEDGE INVENTORY
            </h3>
            <div className="relative">
              <label htmlFor="knowledge-search" className="sr-only">Search knowledge</label>
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" aria-hidden="true">search</span>
              <input
                id="knowledge-search"
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search knowledge..."
                className="bg-surface-dim border border-outline-variant rounded py-2 pl-10 pr-4 text-[14px] text-on-surface placeholder-outline focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-on-surface-variant">Loading...</div>
          ) : error ? (
            <div className="p-8 text-center text-error">{error}</div>
          ) : !allDocuments.length ? (
            <div className="p-8 text-center text-on-surface-variant">
              No documents uploaded yet. Upload a PDF to get started.
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant">
              No documents match "{search}".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="text-left py-3 px-4 text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase">
                      Document Name
                    </th>
                    <th className="text-left py-3 px-4 text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase">
                      Pages
                    </th>
                    <th className="text-left py-3 px-4 text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase">
                      Chunks
                    </th>
                    <th className="text-left py-3 px-4 text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase">
                      Indexed At
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedDocs.map((doc) => (
                    <tr key={doc.filename} className="border-b border-outline-variant hover:bg-surface-variant transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <span className="material-symbols-outlined text-primary" aria-hidden="true">description</span>
                          <span className="text-[14px] leading-[20px] text-on-surface">{doc.filename}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={doc.status || 'processed'} />
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[14px] leading-[20px] text-on-surface-variant">
                          {doc.total_pages || 0} pages
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[14px] leading-[20px] text-on-surface-variant">
                          {doc.total_chunks || 0} chunks
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[14px] leading-[20px] text-on-surface-variant">
                          {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between mt-4">
                <span className="text-[14px] leading-[20px] text-on-surface-variant">
                  Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} documents
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-2 border border-outline-variant rounded hover:bg-surface-variant text-on-surface-variant disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
                  </button>
                  <span className="text-[14px] leading-[20px] text-on-surface-variant px-2">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-2 border border-outline-variant rounded hover:bg-surface-variant text-on-surface-variant disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Storage Metrics — derived from live inventory data */}
      <div className="bg-surface-container border border-outline-variant p-6 mb-6">
        <h3 className="text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase mb-4">
          KNOWLEDGE BASE SUMMARY
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[14px] leading-[20px] text-on-surface-variant">Documents Indexed</span>
              <span className="text-[14px] leading-[20px] font-medium text-primary">{data?.count ?? 0}</span>
            </div>
            <div className="w-full h-2 bg-surface-variant rounded">
              <div className="h-full bg-primary rounded" style={{ width: '100%' }}></div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[14px] leading-[20px] text-on-surface-variant">Chunks Stored</span>
              <span className="text-[14px] leading-[20px] font-medium text-secondary">{totalChunks.toLocaleString()}</span>
            </div>
            <div className="w-full h-2 bg-surface-variant rounded">
              <div className="h-full bg-secondary rounded" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Metrics — derived from live inventory data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-container border border-outline-variant p-6">
          <div className="flex items-center space-x-3">
            <span className="material-symbols-outlined text-primary" aria-hidden="true">inventory</span>
            <div>
              <span className="text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase">
                TOTAL CHUNKS
              </span>
              <p className="text-[24px] leading-[32px] font-semibold text-on-surface mt-1">
                {totalChunks.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container border border-outline-variant p-6">
          <div className="flex items-center space-x-3">
            <span className="material-symbols-outlined text-secondary" aria-hidden="true">description</span>
            <div>
              <span className="text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase">
                DOCUMENTS INDEXED
              </span>
              <p className="text-[24px] leading-[32px] font-semibold text-on-surface mt-1">
                {data?.count ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container border border-outline-variant p-6">
          <div className="flex items-center space-x-3">
            <span className="material-symbols-outlined text-tertiary" aria-hidden="true">menu_book</span>
            <div>
              <span className="text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase">
                PAGES PROCESSED
              </span>
              <p className="text-[24px] leading-[32px] font-semibold text-on-surface mt-1">
                {totalPagesCount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
