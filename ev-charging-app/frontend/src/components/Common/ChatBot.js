import { useState, useRef, useEffect, useCallback } from 'react';

const WELCOME = {
  role: 'assistant',
  content: "Hi! I'm Voltova AI ⚡ I can help with EV charging stations, connector types, charging time estimates, route planning tips, and general EV questions. What would you like to know?",
};

const SUGGESTED = ['What connector types are in AU?', 'How long to charge to 80%?', 'Tips for a long EV trip'];

const ChatBot = () => {
  const [isOpen, setIsOpen]       = useState(false);
  const [messages, setMessages]   = useState([WELCOME]);
  const [input, setInput]         = useState('');
  const [streaming, setStreaming] = useState(false);

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const abortRef    = useRef(null);
  const textareaRef = useRef(null);

  // Scroll to latest message
  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 160);
  }, [isOpen]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [input]);

  const close = useCallback(() => {
    abortRef.current?.abort();
    setIsOpen(false);
  }, []);

  const sendMessage = useCallback(async (text) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;

    const userMsg  = { role: 'user', content };
    const history  = [...messages, userMsg];
    const assistantIdx = history.length;

    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch('/api/v1/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: history }),
        signal:  controller.signal,
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // hold incomplete last line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          try {
            const { content: token } = JSON.parse(payload);
            if (token) {
              setMessages((prev) => {
                const copy = [...prev];
                copy[assistantIdx] = {
                  ...copy[assistantIdx],
                  content: copy[assistantIdx].content + token,
                };
                return copy;
              });
            }
          } catch (_) { /* ignore malformed chunk */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => {
          const copy = [...prev];
          copy[assistantIdx] = { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' };
          return copy;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, messages, streaming]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const isTyping = streaming && messages[messages.length - 1]?.content === '';

  return (
    <>
      {/* ── Chat panel ─────────────────────────────────── */}
      <div
        className={`fixed top-[368px] right-3 z-50 flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-200 ease-out ${
          isOpen
            ? 'opacity-100 translate-y-0 scale-100 shadow-panel'
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none shadow-none'
        }`}
        style={{ width: 380, height: 520, maxHeight: 'calc(100vh - 380px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-primary-600 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">Voltova AI Assistant</p>
              <p className="text-[10px] text-white/65 mt-0.5">Powered by Groq · EV Charging Expert</p>
            </div>
          </div>
          <button
            onClick={close}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
          {messages.map((msg, i) => {
            const isUser  = msg.role === 'user';
            const isEmpty = !isUser && msg.content === '' && i === messages.length - 1 && streaming;

            return (
              <div key={i} className={`flex items-end gap-1.5 animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}>
                {/* Bot avatar */}
                {!isUser && (
                  <div className="w-5 h-5 rounded-md bg-primary-100 flex items-center justify-center flex-shrink-0 mb-0.5">
                    <svg className="w-3 h-3 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                )}

                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-primary-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {isEmpty ? (
                    /* Typing dots */
                    <span className="flex gap-1 items-center h-4">
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </span>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts — only while at the welcome message */}
        {messages.length === 1 && !streaming && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
            {SUGGESTED.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="px-2.5 py-1 text-[11px] font-medium bg-primary-50 text-primary-700 rounded-full border border-primary-200 hover:bg-primary-100 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="px-3 pb-3 pt-2 border-t border-gray-100 flex-shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={(el) => { inputRef.current = el; textareaRef.current = el; }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about EV charging…"
              rows={1}
              disabled={streaming}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:opacity-60 overflow-y-auto"
              style={{ lineHeight: '1.45', maxHeight: 96 }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={streaming || !input.trim()}
              className="w-9 h-9 flex-shrink-0 bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Send"
            >
              {streaming ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                  <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5 text-center">
            AI may make mistakes — verify station details on the map.
          </p>
        </div>
      </div>

      {/* ── Floating action button ───────────────────── */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className={`fixed top-[300px] right-3 z-50 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg ${
          isOpen
            ? 'bg-gray-700 hover:bg-gray-800'
            : 'bg-primary-600 hover:bg-primary-700 hover:scale-105 shadow-blue-glow hover:shadow-blue-glow-lg'
        }`}
        title={isOpen ? 'Close AI chat' : 'Open Voltova AI'}
      >
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-0' : 'rotate-0'}`}>
          {isOpen ? (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          )}
        </div>

        {/* Pulse ring when closed — draws attention */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-2xl bg-primary-400 opacity-30 animate-ping" style={{ animationDuration: '2.5s' }} />
        )}
      </button>
    </>
  );
};

export default ChatBot;
