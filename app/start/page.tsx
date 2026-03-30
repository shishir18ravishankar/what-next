'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, CircleHelp as HelpCircle, GitCompare, CircleAlert as AlertCircle, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Situation = 'no_idea' | 'comparing' | 'unsure';

export default function StartPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
      } else {
        setUser(user);
      }
      setLoading(false);
    };

    checkUser();
  }, [router, supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const selectSituation = async (situation: Situation) => {
    setSelecting(true);
    setActionError(null);

    // Don't rely on the `user` React state being populated yet; read from Supabase at click time.
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      setSelecting(false);
      router.push('/auth');
      return;
    }

    localStorage.setItem('situation', situation);

    const { data: inserted, error: insertError } = await supabase
      .from('conversations')
      .insert({
        user_id: userData.user.id,
        situation,
        messages: [],
        completed: false,
      })
      .select('id')
      .single();

    if (insertError || !inserted?.id) {
      console.error('Error creating conversation:', insertError);
      setActionError(
        insertError?.message ??
          'Could not start a new conversation. Please try again.'
      );
      setSelecting(false);
      return;
    }

    router.push(`/chat?conversationId=${encodeURIComponent(inserted.id)}`);
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
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-4xl mx-auto w-full">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-[#1A1A2E] mb-4">
              What's confusing you right now?
            </h1>
            <p className="text-lg text-gray-600">
              Choose the option that best describes where you are
            </p>
          </div>

          {actionError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              type="button"
              onClick={() => selectSituation('no_idea')}
              disabled={selecting}
              className="group p-8 bg-white border-2 border-gray-200 rounded-lg hover:border-[#6C63FF] hover:shadow-lg transition-all text-left"
            >
              <div className="w-12 h-12 bg-[#6C63FF]/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#6C63FF] transition-colors">
                <HelpCircle className="w-6 h-6 text-[#6C63FF] group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-semibold text-[#1A1A2E] mb-2">
                I have no idea what to choose
              </h3>
              <p className="text-gray-600">
                Everything feels overwhelming and you don't know where to start
              </p>
            </button>

            <button
              type="button"
              onClick={() => selectSituation('comparing')}
              disabled={selecting}
              className="group p-8 bg-white border-2 border-gray-200 rounded-lg hover:border-[#6C63FF] hover:shadow-lg transition-all text-left"
            >
              <div className="w-12 h-12 bg-[#6C63FF]/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#6C63FF] transition-colors">
                <GitCompare className="w-6 h-6 text-[#6C63FF] group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-semibold text-[#1A1A2E] mb-2">
                I'm deciding between a few options
              </h3>
              <p className="text-gray-600">
                You have some paths in mind but need help choosing the right one
              </p>
            </button>

            <button
              type="button"
              onClick={() => selectSituation('unsure')}
              disabled={selecting}
              className="group p-8 bg-white border-2 border-gray-200 rounded-lg hover:border-[#6C63FF] hover:shadow-lg transition-all text-left"
            >
              <div className="w-12 h-12 bg-[#6C63FF]/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#6C63FF] transition-colors">
                <AlertCircle className="w-6 h-6 text-[#6C63FF] group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-semibold text-[#1A1A2E] mb-2">
                I chose something but I'm not sure
              </h3>
              <p className="text-gray-600">
                You've made a choice but want to confirm if it's the right fit
              </p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
