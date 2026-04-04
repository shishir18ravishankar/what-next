'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Send,
  LogOut,
  Loader as Loader2,
  PenSquare,
  Menu,
  X,
  MessageSquare,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type ConversationSummary = {
  id: string;
  situation: string;
  created_at: string;
  completed: boolean;
};

type Situation = 'no_idea' | 'comparing' | 'unsure';

const SITUATION_SIGNAL = '[SHOW_SITUATION_BUTTONS]';
const RECOMMENDATION_SIGNAL = '[RECOMMENDATION_READY]';

const SITUATION_LABELS: Record<string, string> = {
  no_idea: 'No idea yet',
  comparing: 'Comparing options',
  unsure: 'Chosen but unsure',
  pending: 'New chat',
};

const SITUATION_OPTIONS: { value: Situation; label: string }[] = [
  { value: 'no_idea', label: "I have no idea what to choose" },
  { value: 'comparing', label: "I'm deciding between a few options" },
  { value: 'unsure', label: "I chose something but I'm not sure" },
];

const SITUATION_USER_MESSAGES = SITUATION_OPTIONS.map(o => o.label);

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

/** Strip [SHOW_SITUATION_BUTTONS] from all messages; flag if the last assistant message had it. */
function processMessages(msgs: Message[]): { messages: Message[]; showButtons: boolean } {
  let showButtons = false;
  const processed = msgs.map((msg, i) => {
    if (msg.role === 'assistant' && msg.content.includes(SITUATION_SIGNAL)) {
      if (i === msgs.length - 1) showButtons = true;
      return { ...msg, content: msg.content.replace(SITUATION_SIGNAL, '').trim() };
    }
    return msg;
  });
  return { messages: processed, showButtons };
}

/** Check if a situation button has already been selected in this conversation. */
function hasSituationSelected(msgs: Message[]): boolean {
  return msgs.some(
    m => m.role === 'user' && SITUATION_USER_MESSAGES.includes(m.content)
  );
}

/** Strip [RECOMMENDATION_READY] and the JSON block that follows. */
function stripRecommendationSignal(content: string): { clean: string; hasSignal: boolean } {
  const idx = content.indexOf(RECOMMENDATION_SIGNAL);
  if (idx === -1) return { clean: content, hasSignal: false };
  return { clean: content.slice(0, idx).trim(), hasSignal: true };
}

/**
 * Parse numbered items after "Here are your options:" in an AI message.
 * Returns an array of option strings, or empty array if pattern not found.
 */
function parseOptions(content: string): string[] {
  const lower = content.toLowerCase();
  const trigger = 'here are your options:';
  const triggerIdx = lower.indexOf(trigger);
  if (triggerIdx === -1) return [];
  const after = content.slice(triggerIdx + trigger.length);
  const matches = Array.from(after.matchAll(/^\s*\d+\.\s+(.+)$/gm));
  return matches.map(m => m[1].trim()).filter(Boolean);
}

export default function ChatPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showSituationButtons, setShowSituationButtons] = useState(false);
  const [situationShown, setSituationShown] = useState(false);
  const [recommendationReady, setRecommendationReady] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const chatApiHeaders = async (): Promise<HeadersInit> => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  const fetchConversations = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('conversations')
      .select('id, situation, created_at, completed')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setConversations(data);
  }, [supabase]);

  /**
   * Call the AI with the current message list and handle the response.
   * alreadyShown: pass true when situation has just been selected to prevent
   * stale-closure issues with situationShown state.
   */
  const callAI = async (
    convId: string,
    msgs: Message[],
    situation: string,
    userId: string,
    alreadyShown: boolean = false,
  ): Promise<void> => {
    let onboardingData: object | null = null;
    try {
      const raw = localStorage.getItem(`onboardingData_${userId}`);
      if (raw) onboardingData = JSON.parse(raw);
    } catch {}

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: await chatApiHeaders(),
      body: JSON.stringify({ messages: msgs, situation, conversationId: convId, onboardingData }),
    });

    if (response.status === 401) { router.push('/auth'); return; }
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || `Chat request failed (${response.status})`);
    }

    const data = await response.json();
    if (!data?.message) throw new Error('Chat succeeded but no assistant message was returned');

    const raw: string = data.message;
    const hasSituationSignal = raw.includes(SITUATION_SIGNAL);
    const { clean: withoutRecommendation, hasSignal: hasRecommendation } = stripRecommendationSignal(raw);
    const cleanContent = hasSituationSignal
      ? withoutRecommendation.replace(SITUATION_SIGNAL, '').trim()
      : withoutRecommendation;

    const updated = [...msgs, { role: 'assistant' as const, content: cleanContent }];
    setMessages(updated);

    if (hasSituationSignal && !alreadyShown) setShowSituationButtons(true);
    if (hasRecommendation) setRecommendationReady(true);
  };

  /** Create a fresh conversation in the DB and get the AI's Phase 0 opener. */
  const beginNewConversation = async (userId: string): Promise<void> => {
    const { data: inserted, error: insertError } = await supabase
      .from('conversations')
      .insert({ user_id: userId, situation: 'pending', messages: [], completed: false })
      .select('id')
      .single();

    if (insertError || !inserted?.id) {
      setApiError(insertError?.message ?? 'Could not start a new conversation. Please try again.');
      return;
    }

    const newConvId = inserted.id;
    setConversationId(newConvId);
    setMessages([]);
    setShowSituationButtons(false);
    setSituationShown(false);
    setRecommendationReady(false);
    setApiError(null);

    await fetchConversations(userId);

    setSending(true);
    try {
      await callAI(newConvId, [], 'pending', userId);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUser(user);
      await fetchConversations(user.id);

      const conversationIdFromQuery = searchParams.get('conversationId');

      if (conversationIdFromQuery) {
        const { data: convData } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .eq('id', conversationIdFromQuery);

        if (convData && convData.length > 0) {
          const conv = convData[0];
          setConversationId(conv.id);
          const { messages: processed, showButtons } = processMessages(conv.messages || []);
          const alreadySelected = hasSituationSelected(processed);
          setMessages(processed);
          setSituationShown(alreadySelected);
          setShowSituationButtons(showButtons && !alreadySelected);
        } else {
          await beginNewConversation(user.id);
        }
      } else {
        const { data: inProgress } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .eq('completed', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (inProgress && inProgress.length > 0) {
          const conv = inProgress[0];
          setConversationId(conv.id);
          const msgs = conv.messages || [];

          if (msgs.length === 0) {
            setSending(true);
            try {
              await callAI(conv.id, [], conv.situation ?? 'pending', user.id);
            } catch (error) {
              setApiError(error instanceof Error ? error.message : String(error));
            } finally {
              setSending(false);
            }
          } else {
            const { messages: processed, showButtons } = processMessages(msgs);
            const alreadySelected = hasSituationSelected(processed);
            setMessages(processed);
            setSituationShown(alreadySelected);
            setShowSituationButtons(showButtons && !alreadySelected);
          }
        } else {
          await beginNewConversation(user.id);
        }
      }

      setLoading(false);
    };

    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewChat = async () => {
    setSidebarOpen(false);
    window.history.replaceState({}, '', '/chat');
    setRecommendationReady(false);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) { router.push('/auth'); return; }

    await beginNewConversation(userData.user.id);
  };

  const loadConversation = async (conv: ConversationSummary) => {
    setSidebarOpen(false);
    setLoading(true);
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conv.id)
      .single();
    if (data) {
      setConversationId(data.id);
      const { messages: processed, showButtons } = processMessages(data.messages || []);
      const alreadySelected = hasSituationSelected(processed);
      setMessages(processed);
      setSituationShown(alreadySelected);
      setShowSituationButtons(showButtons && !alreadySelected);
      setRecommendationReady(false);
      setApiError(null);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  /** User clicked one of the 3 situation buttons — send it as a message. */
  const selectSituation = async (situation: Situation) => {
    if (!conversationId) return;
    setShowSituationButtons(false);
    setSituationShown(true);

    await supabase
      .from('conversations')
      .update({ situation })
      .eq('id', conversationId);

    localStorage.setItem('situation', situation);

    const label = SITUATION_OPTIONS.find(o => o.value === situation)?.label ?? situation;
    const userMsg: Message = { role: 'user', content: label };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setSending(true);
    setApiError(null);

    try {
      await callAI(conversationId, newMessages, situation, user!.id, true);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending || !conversationId) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setShowSituationButtons(false);
    setSending(true);
    setApiError(null);

    try {
      await callAI(
        conversationId,
        newMessages,
        localStorage.getItem('situation') ?? 'pending',
        user!.id,
        situationShown,
      );
    } catch (error) {
      setApiError(error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  };

  /** Send a pill option as a user message. */
  const sendPillMessage = async (text: string) => {
    if (sending || !conversationId) return;
    const userMessage: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setSending(true);
    setApiError(null);

    try {
      await callAI(
        conversationId,
        newMessages,
        localStorage.getItem('situation') ?? 'pending',
        user!.id,
        situationShown,
      );
    } catch (error) {
      setApiError(error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6C63FF]"></div>
      </div>
    );
  }

  const lastAssistantIdx = messages.reduce((acc, msg, i) => msg.role === 'assistant' ? i : acc, -1);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* ── Mobile sidebar backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── LEFT SIDEBAR ── */}
      <aside
        className={`
          fixed md:relative z-30 flex flex-col h-full w-64 bg-[#1A1A2E] text-white
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-white/10">
          <Sparkles className="w-5 h-5 text-[#6C63FF]" />
          <span className="text-lg font-bold">What Next</span>
          <button
            className="ml-auto md:hidden text-white/60 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat button */}
        <div className="px-3 pt-3">
          <button
            onClick={startNewChat}
            disabled={sending}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium
              bg-[#6C63FF] hover:bg-[#5B52E8] transition-colors text-white
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PenSquare className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Conversation history */}
        <div className="flex-1 overflow-y-auto px-3 pt-4 space-y-1">
          {conversations.length === 0 ? (
            <p className="text-xs text-white/40 px-2 py-2">No previous chats yet</p>
          ) : (
            <>
              <p className="text-xs text-white/40 px-2 pb-1 uppercase tracking-wider">History</p>
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors group
                    ${conversationId === conv.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-[#6C63FF]" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        {SITUATION_LABELS[conv.situation] ?? conv.situation}
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">{formatDate(conv.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Sign out */}
        <div className="px-3 pb-4 border-t border-white/10 pt-3">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN CHAT AREA ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-[#1A1A2E]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#6C63FF]" />
            <span className="font-bold text-[#1A1A2E]">What Next</span>
          </div>
        </div>

        {/* Messages area */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {apiError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {apiError}
              </div>
            )}

            {/* ── CHAT MESSAGES ── */}
            {messages.map((message, index) => {
              const pills =
                message.role === 'assistant' && index === lastAssistantIdx && !sending
                  ? parseOptions(message.content)
                  : [];
              return (
                <div key={index}>
                  <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'rounded-tr-sm bg-[#6C63FF] text-white'
                          : 'rounded-tl-sm bg-gray-100 text-[#1A1A2E]'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                  {pills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 pl-2">
                      {pills.map((pill, pi) => (
                        <button
                          key={pi}
                          onClick={() => sendPillMessage(pill)}
                          className="px-3 py-1.5 rounded-full border border-[#6C63FF] text-[#6C63FF] text-sm
                            hover:bg-[#6C63FF] hover:text-white transition-all duration-200"
                        >
                          {pill}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── SITUATION BUTTONS (shown only if not yet selected) ── */}
            {showSituationButtons && !situationShown && !sending && (
              <div className="flex flex-col gap-2 pl-2">
                {SITUATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => selectSituation(option.value)}
                    className="self-start px-4 py-2.5 rounded-xl border-2 border-[#6C63FF] text-[#6C63FF] text-sm font-medium
                      hover:bg-[#6C63FF] hover:text-white transition-all duration-200"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[#6C63FF]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Recommendation ready banner */}
        {recommendationReady && (
          <div className="border-t border-green-200 bg-green-50 px-6 py-3 text-center text-sm font-medium text-green-700">
            Conversation complete! Results page coming soon.
          </div>
        )}

        {/* Input bar — hidden only while situation buttons are pending selection */}
        {!showSituationButtons && (
          <div className="border-t border-gray-200 px-6 py-4 bg-white">
            <form onSubmit={sendMessage} className="max-w-3xl mx-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your answer..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="bg-[#6C63FF] text-white px-5 py-3 rounded-xl hover:bg-[#5B52E8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
