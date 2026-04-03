'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const STREAMS = ['Science', 'Commerce', 'Arts'];
const TIMELINES = [
  'Beginning of 12th',
  'Just finished boards',
  'Preparing for competitive exams',
];

export default function OnboardingPage() {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [stream, setStream] = useState('');
  const [timeline, setTimeline] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      // Already onboarded — skip straight to chat
      if (localStorage.getItem('onboardingData')) { router.push('/chat'); return; }
      setPageLoading(false);
    };
    check();
  }, []);

  const canContinue = name.trim() && city.trim() && stream && timeline;

  const handleContinue = () => {
    if (!canContinue || loading) return;
    setLoading(true);
    localStorage.setItem('onboardingData', JSON.stringify({
      name: name.trim(),
      city: city.trim(),
      stream,
      timeline,
    }));
    router.push('/chat');
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6C63FF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#6C63FF]" />
          <span className="text-lg font-bold text-[#1A1A2E]">What Next</span>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">Before we begin</h1>
            <p className="text-gray-500 mt-1 text-sm">
              A few quick things so I can talk to you properly.
            </p>
          </div>

          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                What's your name?
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your first name"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                Which city are you from?
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Bangalore, Mumbai, Delhi"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
              />
            </div>

            {/* Stream */}
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                What stream are you in?
              </label>
              <div className="flex gap-2">
                {STREAMS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStream(s)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-200
                      ${stream === s
                        ? 'border-[#6C63FF] bg-[#6C63FF] text-white'
                        : 'border-gray-200 text-gray-600 hover:border-[#6C63FF] hover:text-[#6C63FF]'
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                Where are you right now?
              </label>
              <div className="flex flex-col gap-2">
                {TIMELINES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeline(t)}
                    className={`py-2.5 px-4 rounded-xl border-2 text-sm font-medium text-left transition-all duration-200
                      ${timeline === t
                        ? 'border-[#6C63FF] bg-[#6C63FF] text-white'
                        : 'border-gray-200 text-gray-600 hover:border-[#6C63FF] hover:text-[#6C63FF]'
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {canContinue && (
            <button
              onClick={handleContinue}
              disabled={loading}
              className="w-full bg-[#6C63FF] text-white py-3 rounded-xl font-medium text-sm
                hover:bg-[#5B52E8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Starting...' : 'Continue →'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
