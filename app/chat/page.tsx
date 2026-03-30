'use client';

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

const SITUATION_LABELS: Record<string, string> = {
  no_idea: 'No idea yet',
  comparing: 'Comparing options',
  unsure: 'Chosen but unsure',
};

const SITUATION_OPTIONS: { value: Situation; label: string }[] = [
  { value: 'no_idea', label: "I have no idea what to choose" },
  { value: 'comparing', label: "I'm deciding between a few options" },
  { value: 'unsure', label: "I chose something but I'm not sure" },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export default function ChatPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showFinishButton, setShowFinishButton] = useState(false);
  const [generatingRecommendation, setGeneratingRecommendation] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectingSituation, setSelectingSituation] = useState(false);
  // true when we're showing the fresh "pick a situation" screen (no conversation yet)
  const [showSituationPicker, setShowSituationPicker] = useState(false);

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
        // Load a specific conversation
        const { data: conversations } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .eq('id', conversationIdFromQuery);

        if (conversations && conversations.length > 0) {
          const conv = conversations[0];
          setConversationId(conv.id);
          setMessages(conv.messages || []);
          estimateStage(conv.messages || []);
          setShowSituationPicker(false);
        } else {
          setShowSituationPicker(true);
        }
      } else {
        // Try to find an in-progress conversation
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
          setMessages(msgs);
          if (msgs.length === 0) {
            // Conversation exists but no messages yet — send initial AI message
            const situation = localStorage.getItem('situation') || conv.situation;
            await sendInitialMessage(conv.id, situation);
          } else {
            estimateStage(msgs);
          }
          setShowSituationPicker(false);
        } else {
          // No conversation at all — show situation picker
          setShowSituationPicker(true);
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

  const estimateStage = (msgs: Message[]) => {
    if (msgs.length >= 12) setShowFinishButton(true);
  };

  const sendInitialMessage = async (convId: string, situation: string) => {
    setSending(true);
    setApiError(null);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: await chatApiHeaders(),
        body: JSON.stringify({ messages: [], situation, conversationId: convId }),
      });

      if (response.status === 401) { router.push('/auth'); return; }
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Chat request failed (${response.status})`);
      }

      const data = await response.json();
      if (!data?.message) throw new Error('Chat succeeded but no assistant message was returned');
      setMessages([{ role: 'assistant' as const, content: data.message }]);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  };

  const selectSituation = async (situation: Situation) => {
    setSelectingSituation(true);
    setApiError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      setSelectingSituation(false);
      router.push('/auth');
      return;
    }

    localStorage.setItem('situation', situation);

    const { data: inserted, error: insertError } = await supabase
      .from('conversations')
      .insert({ user_id: userData.user.id, situation, messages: [], completed: false })
      .select('id')
      .single();

    if (insertError || !inserted?.id) {
      setApiError(insertError?.message ?? 'Could not start a new conversation. Please try again.');
      setSelectingSituation(false);
      return;
    }

    const newConvId = inserted.id;
    setConversationId(newConvId);
    setShowSituationPicker(false);
    setMessages([]);

    // Fetch updated conversation list
    await fetchConversations(userData.user.id);

    // Send user's situation choice as first message
    const situationLabel = SITUATION_OPTIONS.find(o => o.value === situation)?.label ?? situation;
    const userMsg: Message = { role: 'user', content: situationLabel };
    setMessages([userMsg]);
    setSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: await chatApiHeaders(),
        body: JSON.stringify({ messages: [userMsg], situation, conversationId: newConvId }),
      });

      if (response.status === 401) { router.push('/auth'); return; }
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Chat request failed (${response.status})`);
      }

      const data = await response.json();
      if (!data?.message) throw new Error('No assistant message returned');
      const updated: Message[] = [...[userMsg], { role: 'assistant' as const, content: data.message }];
      setMessages(updated);
      estimateStage(updated);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
      setSelectingSituation(false);
    }
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setCurrentStage(0);
    setShowFinishButton(false);
    setGeneratingRecommendation(false);
    setApiError(null);
    setShowSituationPicker(true);
    setSidebarOpen(false);
    // Clear URL param without reload
    window.history.replaceState({}, '', '/chat');
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
      const msgs = data.messages || [];
      setMessages(msgs);
      estimateStage(msgs);
      setShowSituationPicker(false);
      setShowFinishButton(msgs.length >= 12);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending || !conversationId) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setSending(true);
    setApiError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: await chatApiHeaders(),
        body: JSON.stringify({
          messages: newMessages,
          situation: localStorage.getItem('situation'),
          conversationId,
        }),
      });

      if (response.status === 401) { router.push('/auth'); return; }
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Chat request failed (${response.status})`);
      }

      const data = await response.json();
      if (!data?.message) throw new Error('Chat succeeded but no assistant message was returned');
      const updatedMessages = [...newMessages, { role: 'assistant' as const, content: data.message }];
      setMessages(updatedMessages);
      estimateStage(updatedMessages);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  };

  const finishAndGenerateRecommendation = async () => {
    if (!conversationId) return;
    setGeneratingRecommendation(true);

    try {
      const response = await fetch('/api/generate-recommendation', {
        method: 'POST',
        headers: await chatApiHeaders(),
        body: JSON.stringify({ messages, conversationId }),
      });

      if (response.status === 401) { router.push('/auth'); return; }
      const data = await response.json();
      if (data.recommendation) router.push('/results');
    } catch (error) {
      console.error('Error generating recommendation:', error);
    } finally {
      setGeneratingRecommendation(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6C63FF]"></div>
      </div>
    );
  }

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
          {/* Mobile close button */}
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
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium
              bg-[#6C63FF] hover:bg-[#5B52E8] transition-colors text-white"
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

            {/* ── SITUATION PICKER (replaces /start) ── */}
            {showSituationPicker && (
              <>
                {/* AI welcome bubble */}
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 bg-gray-100 text-[#1A1A2E]">
                    <p className="whitespace-pre-wrap">
                      Hi! I'm here to help you figure out what's right for you after 12th grade. To get started, which of these best describes your situation?
                    </p>
                  </div>
                </div>

                {/* 3 option buttons below the AI message */}
                <div className="flex flex-col gap-2 pl-2">
                  {SITUATION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => selectSituation(option.value)}
                      disabled={selectingSituation}
                      className="self-start px-4 py-2.5 rounded-xl border-2 border-[#6C63FF] text-[#6C63FF] text-sm font-medium
                        hover:bg-[#6C63FF] hover:text-white transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {option.label}
                    </button>
                  ))}
                  {selectingSituation && (
                    <div className="flex items-center gap-2 text-[#6C63FF] text-sm mt-1">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Starting your chat...</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── CHAT MESSAGES ── */}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
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
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[#6C63FF]" />
                </div>
              </div>
            )}

            {showFinishButton && !generatingRecommendation && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={finishAndGenerateRecommendation}
                  className="bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 transition-colors"
                >
                  I have enough to give you a recommendation. Ready?
                </button>
              </div>
            )}

            {generatingRecommendation && (
              <div className="flex justify-center pt-4">
                <div className="flex items-center gap-2 text-[#6C63FF]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating your personalized recommendation...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input bar (hidden when showing situation picker and no conversation started) */}
        {!showSituationPicker && (
          <div className="border-t border-gray-200 px-6 py-4 bg-white">
            <form onSubmit={sendMessage} className="max-w-3xl mx-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your answer..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
                  disabled={sending || generatingRecommendation}
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim() || generatingRecommendation}
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
