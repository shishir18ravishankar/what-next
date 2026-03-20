'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Send, LogOut, Loader as Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const STAGES = ['Interests', 'Skills', 'Lifestyle', 'Finances', 'Market'];

export default function ChatPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState(0);
  const [showFinishButton, setShowFinishButton] = useState(false);
  const [generatingRecommendation, setGeneratingRecommendation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUser(user);

      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (conversations && conversations.length > 0) {
        const conv = conversations[0];
        setConversationId(conv.id);
        setMessages(conv.messages || []);

        if (conv.messages.length === 0) {
          const situation = localStorage.getItem('situation') || conv.situation;
          await sendInitialMessage(conv.id, situation);
        } else {
          estimateStage(conv.messages);
        }
      } else {
        router.push('/start');
      }

      setLoading(false);
    };

    checkUser();
  }, [router, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const estimateStage = (msgs: Message[]) => {
    const messageCount = msgs.length;
    const stage = Math.min(Math.floor(messageCount / 4), 4);
    setCurrentStage(stage);

    if (messageCount >= 12) {
      setShowFinishButton(true);
    }
  };

  const sendInitialMessage = async (convId: string, situation: string) => {
    setSending(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          situation,
          conversationId: convId,
        }),
      });

      const data = await response.json();
      const newMessages = [{ role: 'assistant' as const, content: data.message }];
      setMessages(newMessages);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSending(false);
    }
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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          situation: localStorage.getItem('situation'),
          conversationId,
        }),
      });

      const data = await response.json();
      const updatedMessages = [
        ...newMessages,
        { role: 'assistant' as const, content: data.message },
      ];
      setMessages(updatedMessages);
      estimateStage(updatedMessages);
    } catch (error) {
      console.error('Error:', error);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          conversationId,
        }),
      });

      const data = await response.json();
      if (data.recommendation) {
        router.push('/results');
      }
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
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="px-6 py-4 border-b border-gray-200">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#6C63FF]" />
            <span className="text-xl font-bold text-[#1A1A2E]">What Next</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-gray-600 hover:text-[#1A1A2E] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sign out</span>
          </button>
        </div>
      </nav>

      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            {STAGES.map((stage, index) => (
              <div
                key={stage}
                className={`flex-1 text-center text-xs font-medium ${
                  index <= currentStage ? 'text-[#6C63FF]' : 'text-gray-400'
                }`}
              >
                {stage}
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#6C63FF] h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentStage + 1) / STAGES.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-[#6C63FF] text-white'
                    : 'bg-gray-100 text-[#1A1A2E]'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-3">
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

      <div className="border-t border-gray-200 px-6 py-4 bg-white">
        <form onSubmit={sendMessage} className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your answer..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
              disabled={sending || generatingRecommendation}
            />
            <button
              type="submit"
              disabled={sending || !input.trim() || generatingRecommendation}
              className="bg-[#6C63FF] text-white px-6 py-3 rounded-lg hover:bg-[#5B52E8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
