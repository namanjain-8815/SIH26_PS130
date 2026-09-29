'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
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
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Layers,
} from 'lucide-react';
import { guidanceApi } from '@/lib/api';
import type { ContextualGuidancePayload, GuidanceQuestionAnswer } from '@/types/api';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text?: string;
  answer?: GuidanceQuestionAnswer;
  timestamp: string;
}

function ApplicationGuidanceAssistantContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine active route context
  const appMatch = pathname.match(/\/app\/applications\/([a-zA-Z0-9_-]+)/);
  const pathAppId = appMatch && appMatch[1] !== 'new' ? appMatch[1] : undefined;
  const projMatch = pathname.match(/\/app\/projects\/([a-zA-Z0-9_-]+)/);
  const pathProjId = projMatch ? projMatch[1] : undefined;

  const activeProjectId = searchParams.get('projectId') || pathProjId || undefined;
  const activeApplicationId = searchParams.get('applicationId') || pathAppId || undefined;

  let pageTag = 'dashboard';
  let contextLabel = 'Applicant Dashboard';
  if (pathname.includes('/app/applications')) {
    pageTag = 'applications';
    contextLabel = 'Application Workspace';
  } else if (pathname.includes('/app/approvals') || pathname.includes('/app/approval-directory')) {
    pageTag = 'approvals';
    contextLabel = 'Permissions & Approvals';
  } else if (pathname.includes('/app/documents')) {
    pageTag = 'documents';
    contextLabel = 'Document Vault';
  } else if (pathname.includes('/app/compliance')) {
    pageTag = 'compliance';
    contextLabel = 'Compliance & Renewals';
  } else if (pathname.includes('/app/inspections')) {
    pageTag = 'inspections';
    contextLabel = 'Site Inspections';
  } else if (pathname.includes('/app/incentives')) {
    pageTag = 'incentives';
    contextLabel = 'Incentive Schemes';
  } else if (pathname.includes('/app/assistance')) {
    pageTag = 'assistance';
    contextLabel = 'Investor Assistance';
  } else if (pathname.includes('/app/projects')) {
    pageTag = 'projects';
    contextLabel = 'Investment Proposals';
  }

  // Fetch live contextual guidance from database
  const { data: guidanceData, isLoading } = useQuery({
    queryKey: ['contextual-guidance', { page: pageTag, project_id: activeProjectId, application_id: activeApplicationId }],
    queryFn: () =>
      guidanceApi.getContextual({
        page: pageTag,
        project_id: activeProjectId,
        application_id: activeApplicationId,
      }),
    staleTime: 15_000,
  });

  // Suggested questions from server, or sensible statutory fallbacks
  const suggestedQuestions = guidanceData?.suggested_questions || [
    { id: 'why_required', question: 'Why is this permission required?', category: 'statutory' },
    { id: 'documents_needed', question: 'What documents are needed?', category: 'readiness' },
    { id: 'what_next', question: 'What should I do next?', category: 'process' },
    { id: 'eligible_approvals', question: 'Which approvals can start now?', category: 'dependencies' },
  ];

  // Set greeting on first load or context reset
  useEffect(() => {
    if (messages.length === 0 && guidanceData) {
      const projName = guidanceData.context.project_name || 'Active Investment Proposal';
      const appName = guidanceData.context.approval_name;
      const appNumber = guidanceData.context.application_number;
      const status = guidanceData.context.status;

      let greetingText = `Hello! I am your Single Window **Contextual Guidance Assistant**.\n\nI provide 100% deterministic, live database-grounded answers for **${projName}**.`;
      if (appName) {
        greetingText += `\n\n📌 Currently reviewing: **${appName}** ${appNumber ? `(${appNumber})` : ''} · Status: \`${status || 'ACTIVE'}\`.`;
      }
      greetingText += `\n\nClick any suggested question below or type your statutory question to get instant guidance on approvals, missing documents, queries, and service timelines.`;

      setMessages([
        {
          id: 'msg-welcome',
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          answer: {
            question_id: 'welcome',
            question: 'Context Overview',
            category: 'general',
            title: 'Single Window Regulatory Advisor',
            answer: greetingText,
            actions: [
              { label: 'Check Document Vault', href: '/app/documents' },
              { label: 'View All Clearances', href: '/app/approvals' },
              { label: 'Joint Inspection Planner', href: '/app/inspections' },
            ],
            suggested_follow_ups: suggestedQuestions.slice(0, 3).map((q) => q.question),
          },
        },
      ]);
    }
  }, [messages.length, guidanceData, suggestedQuestions]);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Handle question click or submission
  const handleAsk = async (questionText: string, questionId?: string) => {
    const qText = questionText.trim();
    if (!qText) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: qText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');

    // Check if we have an exact cached answer in the active guidance payload
    if (questionId && guidanceData?.answers[questionId]) {
      const cached = guidanceData.answers[questionId];
      const assistantMsg: Message = {
        id: `ast-${Date.now() + 1}`,
        sender: 'assistant',
        answer: cached,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      return;
    }

    // Otherwise, fetch live query response from the backend endpoint
    setIsSearching(true);
    try {
      const response = await guidanceApi.getContextual({
        page: pageTag,
        project_id: activeProjectId,
        application_id: activeApplicationId,
        query_text: qText,
      });

      const matchedAnswer =
        response.search_match ||
        Object.values(response.answers)[0] || {
          question_id: 'custom',
          question: qText,
          category: 'statutory',
          title: 'Regulatory Guidance Result',
          answer: `Here is the current regulatory information related to your request for ${
            response.context.project_name || 'your project'
          }.`,
          actions: [{ label: 'View Permissions', href: '/app/approvals' }],
          suggested_follow_ups: response.suggested_questions.slice(0, 2).map((sq) => sq.question),
        };

      const assistantMsg: Message = {
        id: `ast-${Date.now() + 1}`,
        sender: 'assistant',
        answer: matchedAnswer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const fallbackMsg: Message = {
        id: `ast-${Date.now() + 1}`,
        sender: 'assistant',
        answer: {
          question_id: 'error_fallback',
          question: qText,
          category: 'statutory',
          title: 'Statutory Resolution Guidance',
          answer: `For formal statutory assistance regarding "${qText}", you can raise an expedited ticket with the Single Window Nodal Facilitation Officer or inspect your active applications.`,
          actions: [
            { label: 'Submit Facilitation Request', href: '/app/assistance' },
            { label: 'Check Document Vault', href: '/app/documents' },
          ],
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Floating Launcher Button - Logo Only */}
      <div className="fixed bottom-22 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group w-12 h-12 rounded-full bg-gradient-to-tr from-primary-800 to-primary-700 hover:from-primary-900 hover:to-primary-800 text-white shadow-xl hover:shadow-2xl transition-all duration-200 border-2 border-primary-500/30 flex items-center justify-center active:scale-95 relative"
          title="Open Guidance Assistant"
        >
          <Sparkles className="w-5 h-5 text-amber-300 group-hover:rotate-12 transition-transform" />
          <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full animate-pulse" />
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
                        Live Grounded
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">Single Window Statutory Advisor</p>
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
              <div className="mt-3 px-3 py-2 bg-slate-800/90 rounded-lg space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Active Screen:</span>
                  <span className="font-semibold text-primary-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                    {contextLabel}
                  </span>
                </div>
                {guidanceData?.context?.project_name && (
                  <div className="flex items-center justify-between border-t border-slate-700/50 pt-1 text-[10px]">
                    <span className="text-slate-400">Proposal:</span>
                    <span className="text-slate-200 truncate font-medium max-w-[200px]">
                      {guidanceData.context.project_name}
                    </span>
                  </div>
                )}
                {guidanceData?.context?.approval_name && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Clearance:</span>
                    <span className="text-amber-300 truncate font-semibold max-w-[200px]">
                      {guidanceData.context.approval_name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Suggested Question Chips Ribbon */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-gray-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex-shrink-0">
                Suggested:
              </span>
              {suggestedQuestions.map((sq) => (
                <button
                  key={sq.id}
                  type="button"
                  onClick={() => handleAsk(sq.question, sq.id)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-primary-50 text-gray-700 hover:text-primary-800 border border-gray-200 rounded-full flex-shrink-0 transition-colors shadow-xs"
                >
                  {sq.question}
                </button>
              ))}
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {isLoading && messages.length === 0 && (
                <div className="flex items-center justify-center p-8 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span>Loading regulatory context...</span>
                </div>
              )}

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
                        {msg.answer && (
                          <>
                            <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                              <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
                                {msg.answer.title}
                              </h4>
                              <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                            </div>

                            {/* Formatted grounded text */}
                            <div className="text-gray-700 space-y-2 leading-relaxed whitespace-pre-line">
                              {msg.answer.answer}
                            </div>

                            {/* Direct Action Links */}
                            {msg.answer.actions && msg.answer.actions.length > 0 && (
                              <div className="pt-2 border-t border-gray-200/60 flex flex-wrap gap-1.5">
                                {msg.answer.actions.map((act, idx) => (
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
                            {msg.answer.suggested_follow_ups && msg.answer.suggested_follow_ups.length > 0 && (
                              <div className="pt-2 border-t border-dashed border-gray-200 flex flex-wrap gap-1">
                                {msg.answer.suggested_follow_ups.map((fu, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleAsk(fu)}
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

              {isSearching && (
                <div className="flex items-center gap-2 text-xs text-gray-500 italic p-2 bg-gray-50 rounded-lg">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />
                  <span>Evaluating statutory rules against active database state...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <div className="p-3 bg-white border-t border-gray-200 space-y-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAsk(inputQuery);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ask about required documents, blockers, or SLA..."
                  className="input-base text-xs py-2 flex-1"
                />
                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isSearching}
                  className="p-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-40 text-white rounded-lg transition-colors flex-shrink-0"
                  title="Send Question"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* Statutory Disclaimer & Facilitation Bridge */}
              <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 pt-1">
                <span>LLM integration is future work</span>
                <Link
                  href="/app/assistance"
                  onClick={() => setIsOpen(false)}
                  className="text-primary-600 hover:underline flex items-center gap-0.5 font-medium"
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

export function ApplicationGuidanceAssistant() {
  return (
    <Suspense fallback={null}>
      <ApplicationGuidanceAssistantContent />
    </Suspense>
  );
}
