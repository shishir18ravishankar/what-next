import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#6C63FF]" />
            <span className="text-xl font-bold text-[#1A1A2E]">What Next</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-[#1A1A2E] leading-tight">
              Confused about what to do after 12th? Let's figure it out.
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              What Next is an AI career advisor that helps you find the right degree — based on who you actually are.
            </p>
          </div>

          <Link
            href="/auth"
            className="inline-flex items-center gap-2 bg-[#6C63FF] text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-[#5B52E8] transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Start for free
            <ArrowRight className="w-5 h-5" />
          </Link>

          <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="w-10 h-10 bg-[#6C63FF]/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="font-semibold text-[#1A1A2E] mb-2">Personalized guidance</h3>
              <p className="text-gray-600 text-sm">AI-powered conversations tailored to your unique strengths and goals</p>
            </div>
            <div className="p-6 rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="w-10 h-10 bg-[#6C63FF]/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🇮🇳</span>
              </div>
              <h3 className="font-semibold text-[#1A1A2E] mb-2">India-focused insights</h3>
              <p className="text-gray-600 text-sm">Real job market data and career paths relevant to India</p>
            </div>
            <div className="p-6 rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="w-10 h-10 bg-[#6C63FF]/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">💡</span>
              </div>
              <h3 className="font-semibold text-[#1A1A2E] mb-2">Clear recommendations</h3>
              <p className="text-gray-600 text-sm">No confusing options—just honest advice on what fits you best</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-6 px-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          © 2024 What Next. Helping students find clarity.
        </div>
      </footer>
    </div>
  );
}
