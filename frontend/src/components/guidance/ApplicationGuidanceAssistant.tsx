'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  X,
  Send,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  Building2,
  FileText,
  Clock,
  ChevronRight,
  LifeBuoy,
} from 'lucide-react';
import {
  resolveGuidanceQuestion,
  getSuggestedPromptsForContext,
  type GuidanceContext,
  type GuidanceResponse,
  CURRENT_GUIDANCE_PROVIDER,
} from '@/lib/guidanceEngine';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text?: string;
  response?: GuidanceResponse;
  timestamp: string;
}

export function ApplicationGuidanceAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Extract context from route
  const isApplication = pathname.includes('/app/applications/');
  const isApprovals = pathname.includes('/app/approvals');
  const isDocuments = pathname.includes('/app/documents');
  const isCompliance = pathname.includes('/app/compliance');
  const isProjects = pathname.includes('/app/projects');
  const isAssistance = pathname.includes('/app/assistance');

  const contextLabel = isApplication
    ? 'Application Workspace'
    : isApprovals
    ? 'Permissions & Approvals'
    : isDocuments
    ? 'Document Vault'
    : isCompliance
    ? 'Compliance & Renewals'
    : isProjects
    ? 'Investment Proposals'
    : isAssistance
    ? 'Investor Assistance'
    : 'Applicant Dashboard';

  const guidanceContext: GuidanceContext = {
    pathname,
    projectId: 'proj-abc-foods-001',
    projectData: {
      name: 'ABC Foods Dairy Processing Unit',
      sector: 'Food Processing',
      stage: 'Pre-Establishment',
      district: 'Pune',
    },
    applicationData: {
      application_number: isApplication ? 'APP-2026-0042' : undefined,
      approval_name: isApplication ? 'Consent to Establish (CTE - Red)' : undefined,
      authority: isApplication ? 'Maharashtra Pollution Control Board (MPCB)' : undefined,
      status: 'IN_PREPARATION',
      open_queries_count: 0,
      sla_status: 'ON_TRACK',
    },
  };

  const suggestedPrompts = getSuggestedPromptsForContext(guidanceContext);

  // Initialize initial greeting when opened first time
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'msg-welcome',
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          response: {
            intentId: 'welcome',
            title: 'Welcome to Application Guidance',
            answer: `Hello! I am your Single Window **Contextual Guidance Assistant**.\n\nI provide deterministic answers regarding Maharashtra statutory approvals, missing documents, readiness checks, queries, and service timelines for your investment proposal.`,
            actions: [
              { label: 'Check Missing Documents', href: '/app/documents' },
              { label: 'Start Eligible Clearances', href: '/app/approvals' },
            ],
            suggestedFollowUps: suggestedPrompts.slice(0, 3),
          },
        },
      ]);
    }
  }, [messages.length, suggestedPrompts]);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const guidanceRes = resolveGuidanceQuestion(query, guidanceContext);

    const assistantMsg: Message = {
      id: `ast-${Date.now() + 1}`,
      sender: 'assistant',
      response: guidanceRes,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInputQuery('');
  };

  const handleReset = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-2.5 bg-primary-800 hover:bg-primary-900 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border border-primary-700/80 active:scale-95"
          title="Open Contextual Application Guidance Assistant"
        >
          <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 group-hover:rotate-12 transition-transform">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          </div>
          <span className="text-xs font-bold tracking-wide">Guidance Assistant</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      </div>

      {/* Slide-over Drawer Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-[2px] flex justify-end animate-fade-in">
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl border-l border-gray-200 flex flex-col animate-slide-left"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex-shrink-0 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      Guidance Assistant
                      <span className="text-[10px] font-semibold bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-700/50">
                        Rule Engine
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">Contextual Single Window Statutory Advisor</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Clear Conversation History"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Close Assistant"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Active Context Banner */}
              <div className="mt-3 px-3 py-1.5 bg-slate-800/80 rounded-lg flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Active Screen:</span>
                <span className="font-semibold text-primary-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                  {contextLabel}
                </span>
              </div>
            </div>

            {/* Quick Context Prompts Ribbon */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-gray-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex-shrink-0">
                Suggested:
              </span>
              {suggestedPrompts.slice(0, 4).map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-primary-50 text-gray-700 hover:text-primary-800 border border-gray-200 rounded-full flex-shrink-0 transition-colors shadow-xs"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-1">
                  {msg.sender === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-primary-700 text-white p-3 rounded-2xl rounded-tr-xs shadow-sm">
                        <p className="leading-relaxed">{msg.text}</p>
                        <p className="text-[9px] text-primary-200 text-right mt-1">{msg.timestamp}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className="max-w-[95%] bg-gray-50 border border-gray-200/90 rounded-2xl rounded-tl-xs p-3.5 space-y-2.5 shadow-xs">
                        {msg.response && (
                          <>
                            <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                              <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
                                {msg.response.title}
                              </h4>
                              <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                            </div>

                            {/* Formatted response text */}
                            <div className="text-gray-700 space-y-2 leading-relaxed whitespace-pre-line">
                              {msg.response.answer}
                            </div>

                            {/* Direct Action Links */}
                            {msg.response.actions && msg.response.actions.length > 0 && (
                              <div className="pt-2 border-t border-gray-200/60 flex flex-wrap gap-1.5">
                                {msg.response.actions.map((act, idx) => (
                                  <Link
                                    key={idx}
                                    href={act.href}
                                    onClick={() => setIsOpen(false)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-white border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors"
                                  >
                                    <span>{act.label}</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </Link>
                                ))}
                              </div>
                            )}

                            {/* Suggested follow-up chips */}
                            {msg.response.suggestedFollowUps && msg.response.suggestedFollowUps.length > 0 && (
                              <div className="pt-2 border-t border-dashed border-gray-200 flex flex-wrap gap-1">
                                {msg.response.suggestedFollowUps.map((fu, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleSend(fu)}
                                    className="text-[10px] font-medium text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md text-left transition-colors"
                                  >
                                    → {fu}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <div className="p-3 bg-white border-t border-gray-200 space-y-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ask about required documents, readiness, or SLA..."
                  className="input-base text-xs py-2 flex-1"
                />
                <button
                  type="submit"
                  disabled={!inputQuery.trim()}
                  className="p-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-40 text-white rounded-lg transition-colors flex-shrink-0"
                  title="Send Question"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* Statutory Disclaimer & Facilitation Bridge */}
              <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 pt-1">
                <span>Deterministic rules · No external LLM</span>
                <Link
                  href="/app/assistance"
                  onClick={() => setIsOpen(false)}
                  className="text-primary-600 hover:underline flex items-center gap-0.5"
                >
                  <LifeBuoy className="w-3 h-3" />
                  Nodal Assistance
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
