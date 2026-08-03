import { useState, useRef, type DragEvent, type KeyboardEvent } from 'react';

const MAX_SIZE_MB = 50;

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

export default function FileUpload({ onUpload, disabled }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(ext || '')) {
      setError('Unsupported file type. Allowed: PDF, DOCX, TXT');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size: ${MAX_SIZE_MB}MB`);
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-label="Upload a document (PDF, DOCX, or TXT up to 50MB)"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
          isDragging
            ? 'border-primary bg-primary/10'
            : 'border-outline-variant hover:border-outline hover:bg-surface-variant'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-[14px] leading-[20px] text-on-surface-variant">Uploading and indexing...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-[48px] text-primary" aria-hidden="true">cloud_upload</span>
            <div>
              <p className="text-[18px] leading-[24px] font-semibold text-on-surface">
                Upload Knowledge
              </p>
              <p className="text-[14px] leading-[20px] text-on-surface-variant mt-2">
                Drag and drop a PDF here or <span className="text-primary underline">Browse Files</span>
              </p>
              <p className="text-[12px] leading-[16px] text-outline mt-2 uppercase tracking-wider">
                MAX {MAX_SIZE_MB}MB PER FILE
              </p>
            </div>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-3 px-4 py-3 bg-error-container/20 border border-error rounded text-[14px] leading-[20px] text-error">
          {error}
        </div>
      )}
    </div>
  );
}
