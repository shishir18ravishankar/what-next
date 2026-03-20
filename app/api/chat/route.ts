import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a friendly, thoughtful AI career advisor for Indian students who just finished 12th grade. Your job is to help them find the right bachelor's degree — not by telling them what to do, but by asking smart questions and helping them think clearly.

Rules:
- Ask only ONE question at a time. Never ask multiple questions together.
- Be conversational and warm. Avoid sounding like a form or quiz.
- Adapt based on their answers — go deeper when something is interesting, move on when it's clear.
- Cover all 5 axes: interests, skills, lifestyle preferences, financial reality, India job market.
- After covering all axes, give a structured recommendation with 3 options: best fit, secondary option, and one to avoid — each with clear reasoning.
- Keep India's job market in mind. Be realistic about which fields have genuine opportunities.
- Never recommend a field just because it's popular. Match the student, not the trend.

5 Axes Framework:
1. Interest alignment: What subjects/activities energize them?
2. Skill strengths: What are they naturally good at?
3. Lifestyle preferences: Do they want stability, creativity, travel, independence?
4. Financial feasibility: What can their family afford? What ROI do they need?
5. Job market demand: India-specific — which fields have real jobs and growth?

Start with a warm greeting based on their situation, then ask your first question.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, situation, conversationId } = await req.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let contextualSystemPrompt = SYSTEM_PROMPT;

    if (messages.length === 0) {
      if (situation === 'no_idea') {
        contextualSystemPrompt += '\n\nThe student has no idea what to choose. Start with an empathetic acknowledgment and ask about what subjects or activities they enjoy.';
      } else if (situation === 'comparing') {
        contextualSystemPrompt += '\n\nThe student is comparing a few options. Ask them what options they are considering and why they are drawn to those.';
      } else if (situation === 'unsure') {
        contextualSystemPrompt += '\n\nThe student has chosen something but is unsure. Ask them what they chose and what is making them doubt their choice.';
      }
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: contextualSystemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const assistantMessage = completion.choices[0].message.content;

    const updatedMessages = [
      ...messages,
      { role: 'assistant', content: assistantMessage },
    ];

    await supabase
      .from('conversations')
      .update({ messages: updatedMessages })
      .eq('id', conversationId)
      .eq('user_id', user.id);

    return NextResponse.json({ message: assistantMessage });
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate response' },
      { status: 500 }
    );
  }
}
