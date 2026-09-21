import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { useApi } from '../hooks/useApi';
import type { ChatMessage } from '../types';

let msgCounter = 0;
function nextId() {
  msgCounter += 1;
  return `msg-${Date.now()}-${msgCounter}`;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'secure' | 'baseline'>('secure');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
  const lastSources = lastAssistantMsg?.sources ?? [];

  // Baseline mode bypasses every security filter, so the backend gates it behind
  // Admin / IT_Security; the button is only offered to those roles.
  const { data: currentUser } = useApi(() => api.getCurrentUser(), []);
  const canRunBaseline = currentUser?.role === 'Admin' || currentUser?.role === 'IT_Security';

  useEffect(() => {
    if (mode === 'baseline' && !canRunBaseline) {
      setMode('secure');
    }
  }, [mode, canRunBaseline]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = useCallback(async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.query(trimmed, 3, mode);
      const assistantMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        timestamp: new Date(),
        mode: response.mode,
        pipeline_log: response.pipeline_log,
        request_id: response.request_id,
        duration_ms: response.duration_ms,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Failed to get response'}. Please ensure the backend is running.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, mode]);

  const handleSubmitEvent = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSubmit(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(input);
    }
  };

  const handleCopy = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId((cur) => (cur === msg.id ? null : cur)), 2000);
    } catch {
      // Clipboard API unavailable — ignore
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <PageHeader
          breadcrumb={<>/ workspace / <span className="text-primary font-bold">rag-chat</span></>}
          actions={
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-surface-container border border-outline-variant rounded text-[11px] text-on-surface-variant font-mono">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                <span>OpenRouter · nemotron-3.5</span>
              </div>
              <div className="flex items-center space-x-2 bg-surface-container p-1 rounded-lg border border-outline-variant">
                <button
                  type="button"
                  onClick={() => setMode('secure')}
                  className={`px-3 py-1 text-[11px] font-bold rounded uppercase transition-colors ${
                    mode === 'secure'
                      ? 'bg-secondary text-on-secondary shadow'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  🔒 SECURE TRUSTRAG
                </button>
                {canRunBaseline && (
                  <button
                    type="button"
                    onClick={() => setMode('baseline')}
                    className={`px-3 py-1 text-[11px] font-bold rounded uppercase transition-colors ${
                      mode === 'baseline'
                        ? 'bg-error text-on-error shadow'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    ⚠️ UNFILTERED BASELINE
                  </button>
                )}
              </div>
            </div>
          }
        />

        <h1 className="sr-only">RAG Chat Interface</h1>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto mb-4 p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-on-surface-variant">
              <span className="material-symbols-outlined text-6xl mb-4" aria-hidden="true">chat</span>
              <h2 className="font-medium text-[18px]">Ask a question to get started</h2>
              <p className="text-[14px] mt-1 text-center max-w-md">
                Mode: <span className="font-bold text-primary">{mode.toUpperCase()}</span>. Answers will be generated strictly from authorized enterprise knowledge.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    msg.role === 'user'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container border border-outline-variant text-on-surface'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-2 border-b border-outline-variant/30 pb-1">
                    <span className="text-[10px] font-bold tracking-wider uppercase opacity-75">
                      {msg.role === 'user' ? 'QUERY' : `ANSWER (${(msg.mode || mode).toUpperCase()})`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(msg)}
                      className="text-[12px] opacity-75 hover:opacity-100 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedId === msg.id ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>

                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{msg.content}</p>

                  {msg.pipeline_log && msg.pipeline_log.length > 0 && (
                    <details className="mt-3 border-t border-outline-variant/30 pt-2">
                      <summary className="cursor-pointer text-[10px] font-bold tracking-wider uppercase text-secondary hover:text-on-surface flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">shield</span>
                        Security Trace
                        {msg.duration_ms !== undefined && (
                          <span className="font-normal normal-case text-on-surface-variant">· {msg.duration_ms}ms</span>
                        )}
                      </summary>
                      <div className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed">
                        {msg.pipeline_log.map((step, i) => (
                          <div
                            key={i}
                            className={
                              step.status === 'blocked' || step.status === 'error'
                                ? 'text-error'
                                : step.status === 'warning'
                                  ? 'text-tertiary'
                                  : 'text-secondary'
                            }
                          >
                            <span className="material-symbols-outlined text-[12px] align-[-2px] mr-1" aria-hidden="true">
                              {step.status === 'blocked' ? 'block' : step.status === 'error' ? 'error' : step.status === 'warning' ? 'warning' : 'check_circle'}
                            </span>
                            {step.stage}
                            {typeof step.count === 'number' ? ` (${step.count})` : ''} — {step.message}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex items-center space-x-2 text-on-surface-variant text-[14px] p-4">
              <span className="material-symbols-outlined animate-spin text-primary">sync</span>
              <span>Evaluating trust policy & querying OpenRouter LLM...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Box */}
        <form onSubmit={handleSubmitEvent} className="p-4 bg-surface-container border-t border-outline-variant flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask a question in ${mode.toUpperCase()} RAG mode...`}
            rows={1}
            className="flex-1 bg-surface-variant text-on-surface border border-outline-variant rounded-lg px-4 py-2 text-[14px] focus:outline-none focus:border-primary resize-none"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-5 py-2 bg-primary text-on-primary font-bold text-[13px] rounded-lg hover:brightness-110 disabled:opacity-40 transition-all"
          >
            SEND
          </button>
        </form>
      </div>

      {/* Citations Sidebar */}
      <div className="w-[320px] bg-surface-container border-l border-outline-variant p-4 overflow-y-auto hidden lg:block">
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant mb-4">
          RETRIEVED CITATIONS ({lastSources.length})
        </h3>
        {lastSources.length === 0 ? (
          <p className="text-[12px] text-on-surface-variant italic">No sources retrieved yet.</p>
        ) : (
          <div className="space-y-3">
            {lastSources.map((src, i) => (
              <div key={src.chunk_id || i} className="p-3 bg-surface-variant/50 border border-outline-variant rounded-lg text-[12px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-primary">{src.document_id}</span>
                  <StatusBadge status={src.trust_status || 'Trusted'} size="sm" />
                </div>
                <p className="text-on-surface-variant line-clamp-3 italic">"{src.text_preview}"</p>
                <div className="mt-2 text-[10px] text-on-surface-variant flex justify-between">
                  <span>Page: {src.page}</span>
                  <span>Score: {roundScore(src.score)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function roundScore(sc: number): string {
  return typeof sc === 'number' ? sc.toFixed(3) : 'N/A';
}
