import { useState } from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import FileUpload from '../components/FileUpload';
import StatusBadge from '../components/StatusBadge';
import type { DocumentInfo } from '../types';

export default function Documents() {
  const { data, loading, error, refetch } = useApi(() => api.getDocuments());
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; doc?: DocumentInfo } | null>(null);

  const handleUpload = async (file: File) => {
    const result = await api.uploadDocument(file);
    setUploadResult({
      success: true,
      message: `Successfully indexed "${result.filename}" — ${result.total_chunks} chunks created.`,
      doc: {
        filename: result.filename,
        size_bytes: 0,
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
    refetch();
    setTimeout(() => setUploadResult(null), 8000);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
        <p className="text-sm text-slate-500 mt-1">Upload and manage documents in the knowledge base</p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Upload Document</h2>
        <FileUpload onUpload={handleUpload} />
        {uploadResult && (
          <div className={`mt-3 px-4 py-3 rounded-lg text-sm ${
            uploadResult.success
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
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

      {/* Document List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">
            Indexed Documents ({data?.count ?? 0})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : !data?.documents.length ? (
          <div className="p-8 text-center text-slate-400">
            No documents uploaded yet. Upload a PDF to get started.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.documents.map((doc) => (
              <div key={doc.filename} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📄</span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{doc.filename}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        {doc.document_id && <span className="mono">{doc.document_id}</span>}
                        {doc.total_pages && <span>{doc.total_pages} pages</span>}
                        {doc.total_chunks && <span>{doc.total_chunks} chunks</span>}
                        <span>{(doc.size_bytes / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {doc.uploaded_at && (
                      <span className="text-xs text-slate-400">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </span>
                    )}
                    <StatusBadge status={doc.status || 'processed'} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
