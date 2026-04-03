import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { getUserForApiRoute } from '@/lib/supabase/api-route';

const GROQ_MODEL = 'llama-3.3-70b-versatile';

export async function POST(req: NextRequest) {
  try {
    const { messages, conversationId } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Missing GROQ_API_KEY in server environment' },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const { supabase, user, error: authError } = await getUserForApiRoute(req);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prompt = `You are the structured output engine for "What Next" — same voice as the chat: warm, real, like a trusted older cousin for Indian 12th-pass students choosing a bachelor's degree. Focus ONLY on degree fit (not colleges or unrelated life advice).

From the full conversation, produce a recommendation that could ONLY apply to this student — cite their situation, personality, money reality, and India job market honestly. Never recommend a field just because it is popular.

Provide your response in the following JSON format only:
{
  "best_fit": {
    "field": "Field name",
    "degrees": ["Degree 1", "Degree 2"],
    "jobs": ["Job 1", "Job 2", "Job 3"],
    "avg_salary": "Salary range in India",
    "why": "Why THIS degree fits THIS student specifically (personality, interests, strengths, family money, India reality)"
  },
  "secondary": {
    "field": "Field name",
    "degrees": ["Degree 1", "Degree 2"],
    "jobs": ["Job 1", "Job 2", "Job 3"],
    "avg_salary": "Salary range in India",
    "why": "Why this is also worth considering and how it differs from best fit"
  },
  "avoid": {
    "field": "Field name",
    "why": "Gentle, specific honesty if they leaned toward a poor fit for them — not generic fear"
  },
  "reasoning": {
    "interests": "Their interests and passions as understood from the chat",
    "skills": "Their strengths and abilities",
    "lifestyle": "Personality, work style, how they like to spend energy (use this for self-awareness too)",
    "finances": "Family situation and financial reality, sensitively",
    "market": "India job market reality for the paths discussed"
  }
}

Be specific, realistic, and India-focused. Only recommend fields with genuine job opportunities.`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        ...messages,
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    let recommendation: Record<string, unknown>;
    try {
      recommendation = JSON.parse(raw);
    } catch {
      // Model sometimes wraps JSON in markdown fences
      const trimmed = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      recommendation = JSON.parse(trimmed);
    }

    const { data, error } = await supabase
      .from('recommendations')
      .insert({
        user_id: user.id,
        conversation_id: conversationId,
        best_fit: recommendation.best_fit,
        secondary: recommendation.secondary,
        avoid: recommendation.avoid,
        reasoning: recommendation.reasoning,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    await supabase
      .from('conversations')
      .update({ completed: true })
      .eq('id', conversationId)
      .eq('user_id', user.id);

    return NextResponse.json({ recommendation: data });
  } catch (error: any) {
    console.error('Recommendation generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate recommendation' },
      { status: 500 }
    );
  }
}
