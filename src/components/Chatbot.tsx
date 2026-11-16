import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Bot,
  Send,
  X,
  Minimize2,
  Maximize2,
  Trash2,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  MapPin,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  PhoneCall
} from 'lucide-react';
import type { Shelter, Alert } from '../types';
import { useAuth } from '../context/AuthContext';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isError?: boolean;
}

interface ChatbotProps {
  shelters: Shelter[];
  alerts: Alert[];
}

const SUGGESTED_QUESTIONS = [
  'Where is my nearest shelter?',
  'How do I request emergency assistance?',
  'What does a critical flood alert mean?',
  'How can I find medical assistance?',
  'How do I contact the rescue team?'
];

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome_01',
  role: 'assistant',
  content: `Hello! I am **SAFEHUB AI**, your intelligent emergency shelter & disaster response guide.\n\nI can check live shelter occupancy, interpret active flood warnings, guide evacuation routes, or direct you to emergency medical help.\n\n*How can I assist you right now?*`,
  timestamp: Date.now()
};

export const Chatbot: React.FC<ChatbotProps> = ({ shelters, alerts }) => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME_MESSAGE]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    setErrorMessage(null);
    const userMsg: ChatMessage = {
      id: 'msg_user_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage('');
    setIsLoading(true);

    // Prepare contextual snapshot (sanitized to avoid leaking private credentials)
    const contextSnapshot = {
      shelters: shelters.slice(0, 10).map(s => ({
        name: s.name,
        address: s.address,
        capacity: s.capacity,
        currentOccupancy: s.currentOccupancy,
        status: s.status,
        medicalAvailable: s.medicalAvailable,
        contactPhone: s.contactPhone,
        facilities: s.facilities
      })),
      alerts: alerts.slice(0, 5).map(a => ({
        title: a.title,
        category: a.category,
        severity: a.severity,
        description: a.description,
        affectedArea: a.affectedArea
      })),
      userRole: profile?.role || 'citizen'
    };

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: newHistory.filter(m => m.id !== 'welcome_01').map(m => ({
            role: m.role,
            content: m.content
          })),
          context: contextSnapshot
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: 'msg_ai_' + Date.now(),
        role: 'assistant',
        content: data.reply || 'I processed your request, but received an empty response. Please try asking again.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('[SAFEHUB Chatbot Error]', err);
      const fallbackMsg: ChatMessage = {
        id: 'msg_err_' + Date.now(),
        role: 'assistant',
        content: `⚠️ **SAFEHUB AI Notice**: ${err.message || 'Unable to connect to the AI assistant service at this moment.'}\n\nFor critical life emergencies, please dial **112** or click the **EMERGENCY SOS** button in the header.`,
        timestamp: Date.now(),
        isError: true
      };
      setMessages(prev => [...prev, fallbackMsg]);
      setErrorMessage(err.message || 'Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
    setErrorMessage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Helper to render bold text and bullet points nicely in message bubbles
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Check for bullet line
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const cleanLine = isBullet ? line.trim().replace(/^[-*]\s+/, '') : line;

      // Simple regex replacement for **bold** text
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={pIdx} className="px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300">{part.slice(1, -1)}</code>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-200 my-0.5 leading-relaxed">
            {renderedParts}
          </li>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-slate-200 my-0.5 leading-relaxed">
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <>
      {/* ─── Floating Chat Trigger Button ──────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          aria-label="Open SAFEHUB AI Chatbot"
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-3 px-4 py-3 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-bold shadow-2xl shadow-red-950/80 hover:shadow-red-600/40 hover:scale-105 active:scale-95 transition-all duration-200 border border-red-400/30"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white animate-bounce" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950" />
          </div>
          <span className="text-sm tracking-wide font-extrabold uppercase hidden sm:inline">
            SAFEHUB AI
          </span>
          <span className="text-[10px] bg-red-950/80 text-red-200 border border-red-800/80 px-2 py-0.5 rounded-full font-mono">
            LIVE
          </span>
        </button>
      )}

      {/* ─── Modern Chat Window ────────────────────────────────────────── */}
      {isOpen && (
        <div
          className={`fixed right-4 sm:right-6 bottom-4 sm:bottom-6 z-40 flex flex-col bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 transition-all duration-300 overflow-hidden ${
            isMinimized
              ? 'w-72 sm:w-80 h-14'
              : 'w-[calc(100vw-32px)] sm:w-[420px] h-[550px] max-h-[85vh]'
          }`}
        >
          {/* Header Bar */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border-b border-slate-800 flex items-center justify-between select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-white tracking-wide">
                    SAFEHUB AI
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  Disaster Grid & Shelter Assistant
                </p>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1 text-slate-400">
              <button
                onClick={handleClearChat}
                title="Clear Conversation"
                className="p-1.5 hover:text-white hover:bg-slate-800/70 rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand Chat' : 'Minimize Chat'}
                className="p-1.5 hover:text-white hover:bg-slate-800/70 rounded-lg transition"
              >
                {isMinimized ? (
                  <Maximize2 className="w-3.5 h-3.5" />
                ) : (
                  <Minimize2 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Chat"
                className="p-1.5 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Body (Hidden when minimized) */}
          {!isMinimized && (
            <>
              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs sm:text-sm">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-start gap-2 max-w-[88%]">
                      {msg.role === 'assistant' && (
                        <div className="w-6 h-6 rounded-md bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 shadow-md ${
                          msg.role === 'user'
                            ? 'bg-red-600 text-white rounded-tr-none'
                            : msg.isError
                            ? 'bg-red-950/50 border border-red-800/80 text-red-200 rounded-tl-none'
                            : 'bg-slate-900/90 border border-slate-800/90 text-slate-100 rounded-tl-none'
                        }`}
                      >
                        {renderFormattedContent(msg.content)}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isLoading && (
                  <div className="flex items-start gap-2 max-w-[88%]">
                    <div className="w-6 h-6 rounded-md bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5 shadow-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}

                {/* Suggested Questions (only displayed when exactly 1 welcome message exists) */}
                {messages.length === 1 && !isLoading && (
                  <div className="pt-2">
                    <p className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-red-400" /> Suggested Inquiries
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {SUGGESTED_QUESTIONS.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(q)}
                          className="text-left text-xs px-3 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition active:scale-[0.98] flex items-center justify-between group"
                        >
                          <span>{q}</span>
                          <span className="text-slate-500 group-hover:text-red-400 transition">→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Error Notice Banner */}
              {errorMessage && (
                <div className="px-3 py-1.5 bg-red-950/60 border-t border-red-900/60 text-[11px] text-red-300 flex items-center justify-between">
                  <span className="truncate">{errorMessage}</span>
                  <button
                    onClick={() => handleSendMessage()}
                    className="text-red-400 hover:text-white font-bold ml-2 underline text-[10px]"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Bottom Input Field */}
              <div className="p-3 bg-slate-900/90 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={e => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    placeholder="Ask SAFEHUB AI about shelters, alerts..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition disabled:opacity-50"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={isLoading || !inputMessage.trim()}
                    aria-label="Send message"
                    className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 disabled:opacity-40 disabled:hover:bg-red-600 text-white font-bold transition shadow-md shadow-red-950/80 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 px-1">
                  <span>For immediate rescue dispatch, press <strong>SOS</strong></span>
                  <span className="text-slate-600">Enter ↵</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
