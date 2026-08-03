import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import PageHeader from '../components/PageHeader';
import type { ChatMessage, SourceChunk } from '../types';

let msgCounter = 0;
function nextId() {
  msgCounter += 1;
  return `msg-${Date.now()}-${msgCounter}`;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
  const lastSources = lastAssistantMsg?.sources ?? [];

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
      const response = await api.query(trimmed);
      const assistantMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        timestamp: new Date(),
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
  }, [isLoading]);

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
      // Clipboard API unavailable — ignore silently
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <PageHeader breadcrumb={<>/ workspace / <span className="text-primary font-bold">rag-chat</span></>} />

        {/* Visually hidden page title for accessibility */}
        <h1 className="sr-only">RAG Chat Interface</h1>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto mb-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-on-surface-variant">
              <span className="material-symbols-outlined text-6xl mb-4" aria-hidden="true">chat</span>
              <h2 className="font-medium text-[18px]">Ask a question to get started</h2>
              <p className="text-[14px] mt-2">The RAG pipeline will search your documents for relevant context</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                    {/* Message header */}
                    <div className="flex items-center space-x-2 mb-2">
                      {msg.role === 'assistant' && (
                        <span className="material-symbols-outlined text-primary" aria-hidden="true">smart_toy</span>
                      )}
                      <span className="text-[14px] leading-[20px] font-medium text-on-surface">
                        {msg.role === 'user' ? 'SEC_OPERATOR_04' : 'TrustRAG CORE'}
                      </span>
                      <span className="text-[12px] leading-[16px] text-on-surface-variant">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Message bubble */}
                    <div className={`rounded px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-surface-variant text-on-surface border border-outline-variant'
                        : 'bg-surface-container text-on-surface border border-outline-variant'
                    }`}>
                      <p className="text-[14px] leading-[20px] whitespace-pre-wrap">{msg.content}</p>
                    </div>

                    {/* Sources (only for assistant messages) */}
                    {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                      <SourcesPanel sources={msg.sources} />
                    )}

                    {/* Action buttons for assistant messages */}
                    {msg.role === 'assistant' && (
                      <div className="flex items-center space-x-4 mt-3">
                        <button
                          type="button"
                          aria-label="Mark response as helpful"
                          className="flex items-center space-x-2 text-[14px] text-on-surface-variant hover:text-primary"
                        >
                          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">thumb_up</span>
                          <span>Helpful</span>
                        </button>
                        <button
                          type="button"
                          aria-label="Mark response as inaccurate"
                          className="flex items-center space-x-2 text-[14px] text-on-surface-variant hover:text-primary"
                        >
                          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">thumb_down</span>
                          <span>Inaccurate</span>
                        </button>
                        <button
                          type="button"
                          aria-label="Copy response"
                          onClick={() => void handleCopy(msg)}
                          className="flex items-center space-x-2 text-[14px] text-on-surface-variant hover:text-primary"
                        >
                          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">content_copy</span>
                          <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface-container border border-outline-variant rounded px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmitEvent} className="flex gap-3">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" aria-hidden="true">
              attach_file
            </span>
            <label htmlFor="chat-input" className="sr-only">Ask TrustRAG a question</label>
            <textarea
              id="chat-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask TrustRAG..."
              rows={1}
              className="w-full resize-none rounded bg-surface-container border border-outline-variant pl-12 pr-4 py-3 text-[14px] text-on-surface placeholder-outline focus:outline-none focus:border-primary"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-on-primary px-6 py-3 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>SEND</span>
            <span className="material-symbols-outlined" aria-hidden="true">send</span>
          </button>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-center space-x-6 mt-4 text-[12px] leading-[16px] text-outline">
          <span>CONTEXT WINDOW: 32K TOKENS</span>
          <span>{lastAssistantMsg ? 'SOURCES: VERIFIED RETRIEVAL' : 'AWAITING QUERY'}</span>
        </div>
      </div>

      {/* Sources Sidebar */}
      <div className="w-[350px] ml-6 border-l border-outline-variant pl-6 overflow-y-auto shrink-0">
        <div className="flex items-center justify-between mb-6">
          <h2 className="flex items-center space-x-2 text-[18px] leading-[24px] font-semibold text-on-surface">
            <span className="material-symbols-outlined text-primary" aria-hidden="true">source</span>
            <span>Sources</span>
          </h2>
          <span className="text-[12px] leading-[16px] text-on-surface-variant bg-surface-variant px-2 py-1 rounded">
            {lastSources.length} Retrieved
          </span>
        </div>

        {/* Source Cards — rendered from actual retrieval results */}
        {lastSources.length === 0 ? (
          <div className="bg-surface-container border border-outline-variant p-6 text-center">
            <span className="material-symbols-outlined text-4xl text-outline-variant" aria-hidden="true">source</span>
            <p className="text-[14px] leading-[20px] text-on-surface-variant mt-3">
              Sources from the most recent answer will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {lastSources.map((src) => (
              <div key={src.chunk_id} className="bg-surface-container border border-outline-variant p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="material-symbols-outlined text-primary" aria-hidden="true">description</span>
                    <span className="text-[14px] leading-[20px] font-medium text-on-surface truncate">
                      {src.document_id || 'Untitled document'}
                    </span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-[14px] leading-[20px] font-medium text-secondary">
                      {src.score.toFixed(2)} SIM
                    </span>
                    <p className="text-[12px] leading-[16px] text-on-surface-variant">
                      {src.page ? `Page ${src.page}` : 'Chunk'}
                    </p>
                  </div>
                </div>
                <p className="text-[14px] leading-[20px] text-on-surface-variant font-mono">
                  "{src.text_preview}"
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Knowledge Visualization */}
        <div className="mt-6">
          <h3 className="text-[11px] leading-[16px] tracking-[0.05em] font-bold text-on-surface-variant uppercase mb-4">
            KNOWLEDGE VISUALIZATION
          </h3>
          <div className="bg-surface-container border border-outline-variant p-4 h-[200px] flex items-center justify-center">
            <div className="text-center">
              <span className="material-symbols-outlined text-4xl text-outline-variant" aria-hidden="true">hub</span>
              <p className="text-[12px] leading-[16px] text-outline mt-2">SIMILARITY CLUSTER MAP</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SourcesPanel({ sources }: { sources: SourceChunk[] }) {
  return (
    <div className="mt-3 space-y-2">
      {sources.map((src) => (
        <div key={src.chunk_id} className="bg-surface-dim border border-outline-variant rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 min-w-0">
              <span className="material-symbols-outlined text-primary text-[16px]" aria-hidden="true">description</span>
              <span className="text-[12px] leading-[16px] font-medium text-on-surface truncate">{src.document_id || 'Untitled document'}</span>
            </div>
            <span className="text-[12px] leading-[16px] text-on-surface-variant shrink-0 ml-2">Page {src.page}</span>
          </div>
          <p className="text-[12px] leading-[16px] text-on-surface-variant font-mono">
            "{src.text_preview}"
          </p>
          <div className="flex items-center justify-end mt-2">
            <span className="text-[12px] leading-[16px] text-secondary">
              {src.score.toFixed(2)} SIM
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
