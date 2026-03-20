import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages, conversationId } = await req.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prompt = `Based on the entire conversation above, generate a structured career recommendation for this Indian student who just finished 12th grade.

Provide your response in the following JSON format:
{
  "best_fit": {
    "field": "Field name",
    "degrees": ["Degree 1", "Degree 2"],
    "jobs": ["Job 1", "Job 2", "Job 3"],
    "avg_salary": "Salary range in India",
    "why": "Clear explanation of why this fits the student"
  },
  "secondary": {
    "field": "Field name",
    "degrees": ["Degree 1", "Degree 2"],
    "jobs": ["Job 1", "Job 2", "Job 3"],
    "avg_salary": "Salary range in India",
    "why": "Why this is worth considering"
  },
  "avoid": {
    "field": "Field name",
    "why": "Clear reasoning for why to avoid this path"
  },
  "reasoning": {
    "interests": "Summary of their interests",
    "skills": "Summary of their skills",
    "lifestyle": "Their lifestyle preferences",
    "finances": "Financial considerations",
    "market": "Job market insights for India"
  }
}

Be specific, realistic, and India-focused. Only recommend fields with genuine job opportunities.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        ...messages,
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const recommendation = JSON.parse(completion.choices[0].message.content || '{}');

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
