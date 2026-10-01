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
  MessageSquare,
  Gift,
  Coins,
} from 'lucide-react';
import { guidanceApi } from '@/lib/api';
import { resolveGuidanceQuestion, getSuggestedPromptsForContext } from '@/lib/guidanceEngine';
import type { ContextualGuidancePayload, GuidanceQuestionAnswer } from '@/types/api';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text?: string;
  answer?: GuidanceQuestionAnswer;
  timestamp: string;
}

const QUICK_TOPICS = [
  { label: 'Check Status', query: 'How do I track my application status?' },
  { label: 'Statutory Fees', query: 'What are the statutory fees?' },
  { label: 'Missing Docs', query: 'Which documents are required?' },
  { label: 'Parallel Approvals', query: 'Which permissions can I start now?' },
  { label: 'Joint Inspections', query: 'How do joint site inspections work?' },
  { label: 'Subsidies (PSI 2019)', query: 'What subsidies am I eligible for?' },
  { label: 'RTS Timelines', query: 'When is the statutory timeline due?' },
];

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
  let contextLabel = 'Investor Dashboard';
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
    contextLabel = 'Compliance Calendar';
  } else if (pathname.includes('/app/inspections')) {
    pageTag = 'inspections';
    contextLabel = 'Site Inspections';
  } else if (pathname.includes('/app/incentives')) {
    pageTag = 'incentives';
    contextLabel = 'Incentives & Schemes';
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
    staleTime: 30_000,
  });

  // Suggested questions tailored to screen context
  const suggestedQuestions = guidanceData?.suggested_questions || [
    { id: 'start_now', question: 'Which permissions can I start now?', category: 'process' },
    { id: 'documents_needed', question: 'What documents are needed?', category: 'readiness' },
    { id: 'fees', question: 'What are the statutory fees?', category: 'fees' },
    { id: 'status_check', question: 'How do I track my application status?', category: 'tracking' },
  ];

  // Set greeting on first load or context reset
  useEffect(() => {
    if (messages.length === 0 && guidanceData) {
      const projName = guidanceData.context.project_name || 'ABC Foods Pvt Ltd';
      const appName = guidanceData.context.approval_name;
      const appNumber = guidanceData.context.application_number;
      const status = guidanceData.context.status;

      let greetingText = `Hello! Welcome to **Udyog Setu Guidance Assistant**.\n\nI provide natural, live-grounded answers for **${projName}** regarding statutory permissions, required proofs, fees, and service turnaround.`;
      if (appName) {
        greetingText += `\n\n📌 Active Clearance: **${appName}** ${appNumber ? `(${appNumber})` : ''} · Status: \`${status || 'ACTIVE'}\`.`;
      }
      greetingText += `\n\nType any greeting or question below, or select a suggested topic to get started!`;

      setMessages([
        {
          id: 'msg-welcome',
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          answer: {
            question_id: 'welcome',
            question: 'Context Overview',
            category: 'general',
            title: 'Single Window Statutory Advisor',
            answer: greetingText,
            actions: [
              { label: 'Check Document Vault', href: '/app/documents' },
              { label: 'View All Clearances', href: '/app/approvals' },
              { label: 'Matched Incentives', href: '/app/incentives' },
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

    // 1. First, check cached backend answer if ID was provided
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

    // 2. Evaluate using local natural language guidance engine for zero latency
    const localResolved = resolveGuidanceQuestion(qText, {
      pathname,
      projectId: activeProjectId,
      applicationId: activeApplicationId,
      projectData: { name: guidanceData?.context?.project_name || 'ABC Foods Pvt Ltd' },
      applicationData: {
        approval_name: guidanceData?.context?.approval_name || undefined,
        authority: guidanceData?.context?.authority || undefined,
        application_number: guidanceData?.context?.application_number || undefined,
        status: guidanceData?.context?.status || undefined,
      },
    });

    // If local intent was explicitly identified (not generic fallback), deliver instant natural response
    if (localResolved.intentId !== 'general_guidance') {
      const assistantMsg: Message = {
        id: `ast-${Date.now() + 1}`,
        sender: 'assistant',
        answer: {
          question_id: localResolved.intentId,
          question: qText,
          category: 'Natural Guidance',
          title: localResolved.title,
          answer: localResolved.answer,
          actions: localResolved.actions || [],
          suggested_follow_ups: localResolved.suggestedFollowUps || [],
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      return;
    }

    // 3. Otherwise, query backend endpoint for live database rules
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
          title: localResolved.title,
          answer: localResolved.answer,
          actions: localResolved.actions || [{ label: 'View Permissions', href: '/app/approvals' }],
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
          question_id: 'local_fallback',
          question: qText,
          category: 'statutory',
          title: localResolved.title,
          answer: localResolved.answer,
          actions: localResolved.actions || [
            { label: 'Submit Facilitation Request', href: '/app/assistance' },
            { label: 'Check Document Vault', href: '/app/documents' },
          ],
          suggested_follow_ups: localResolved.suggestedFollowUps,
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
      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border border-emerald-400/40 active:scale-95 cursor-pointer"
          title="Open Statutory Guidance Assistant"
        >
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 group-hover:rotate-12 transition-transform">
            <Sparkles className="w-3 h-3 text-amber-300" />
          </div>
          <span className="text-xs font-bold tracking-wide">Assistant</span>
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
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
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      Guidance Assistant
                      <span className="text-[10px] font-semibold bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-700/50">
                        Deterministic AI
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">Maharashtra Single Window Advisor</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Clear Conversation History"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
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
                  <span className="font-semibold text-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
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

            {/* Quick Topic Chips */}
            <div className="px-3 py-2 bg-slate-50 border-b border-gray-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex-shrink-0">
                Topics:
              </span>
              {QUICK_TOPICS.map((top, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAsk(top.query)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 hover:border-emerald-300 rounded-full flex-shrink-0 transition-colors shadow-2xs cursor-pointer"
                >
                  {top.label}
                </button>
              ))}
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {isLoading && messages.length === 0 && (
                <div className="flex items-center justify-center p-8 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span>Connecting to statutory rules engine...</span>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className="space-y-1">
                  {msg.sender === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-emerald-700 text-white p-3 rounded-2xl rounded-tr-xs shadow-sm">
                        <p className="leading-relaxed">{msg.text}</p>
                        <p className="text-[9px] text-emerald-200 text-right mt-1">{msg.timestamp}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className="max-w-[95%] bg-gray-50 border border-gray-200/90 rounded-2xl rounded-tl-xs p-3.5 space-y-2.5 shadow-xs">
                        {msg.answer && (
                          <>
                            <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                              <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
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
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-white border border-emerald-300 text-emerald-800 rounded-lg hover:bg-emerald-50 transition-colors shadow-2xs"
                                  >
                                    <span>{act.label}</span>
                                    <ChevronRight className="w-3 h-3 text-emerald-600" />
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
                                    className="text-[10px] font-medium text-gray-600 bg-white hover:bg-emerald-50 hover:text-emerald-900 border border-gray-200 px-2 py-0.5 rounded-md text-left transition-colors cursor-pointer"
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
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
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
                  placeholder="Ask a question (e.g. fees, status, missing docs)..."
                  className="input-base text-xs py-2 flex-1"
                />
                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isSearching}
                  className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                  title="Send Question"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* Statutory Disclaimer & Facilitation Bridge */}
              <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 pt-1">
                <span>Deterministic rules · Zero LLM cost</span>
                <Link
                  href="/app/assistance"
                  onClick={() => setIsOpen(false)}
                  className="text-emerald-700 hover:underline flex items-center gap-0.5 font-medium"
                >
                  <LifeBuoy className="w-3 h-3 text-emerald-600" />
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
