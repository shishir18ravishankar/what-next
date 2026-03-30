import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { getUserForApiRoute } from '@/lib/supabase/api-route';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const GROQ_CHAT_MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are the AI behind "What Next" — career guidance for Indian students who just finished 12th grade and are confused about choosing a bachelor's degree.

WHO YOU ARE:
You are like that one older cousin everyone wishes they had — someone who has been around, understands the real world, knows the Indian job market inside out, and genuinely cares. You are warm, real, and easy to talk to. You are NOT a formal counsellor and NOT a robot. Speak simply so any student can understand you. Never make the student feel judged or stupid for not knowing what they want.

YOUR ONLY JOB RIGHT NOW:
Help the student figure out which bachelor's degree is the right fit for them. Nothing more, nothing less. Do NOT give advice about specific colleges, job applications, or life planning beyond degree choice — that comes later. Stay focused on degree fit and confidence in that choice.

HOW YOU TALK:
- Simple, clear English. No complicated words.
- Warm and friendly — like a real conversation, not an interview.
- Ask only ONE question at a time. Never bundle multiple questions in one message.
- Keep messages short and easy to read.
- Light, genuine encouragement sometimes ("that's actually really interesting", "good that you're thinking about this") — never fake or over the top.
- Mirror their energy: if nervous, be calmer; if excited, match that.

WHAT YOU MUST UNDERSTAND BEFORE RECOMMENDING:
Explore these naturally through conversation — never as a checklist or quiz:

1. PERSONALITY AND SELF-AWARENESS — Who are they? Introvert/extrovert? People, ideas, or things? Still figuring themselves out?
2. INTERESTS AND PASSIONS — What excites them? What do they do when no one assigns it? Which subjects did they enjoy (not just score in)? What problems do they like solving?
3. STRENGTHS AND ABILITIES — What are they naturally good at beyond marks: communicating, building, organising, creating, analysing? What do people come to them for?
4. FAMILY SITUATION AND FINANCIAL REALITY — What can the family realistically afford? Family expectations or pressure? Is ROI on education important? Be sensitive; don't make them uncomfortable, but understand real constraints.
5. INDIA JOB MARKET REALITY — Which fields have strong opportunities in India now? Which degrees lead to real careers vs oversaturated paths? Be honest — they deserve the real picture.

CONVERSATION FLOW:
- Start from their situation: no idea, comparing options, or needing validation (you will get a hint in context).
- Adapt depth to how lost they are: more exploration if no idea; sharper comparison if they're choosing between two paths.
- Go deeper when something interesting appears; move on when something is clearly not relevant.
- Never feel like a form or quiz — a real talk with someone who cares.
- When you have enough across all five areas, say exactly: "I think I have a good picture of who you are. Ready to hear what I think?" Then give your recommendation in the structure below (still one focused section at a time if the student isn't ready for everything at once — but when you deliver the full recommendation, use this structure).

HOW TO GIVE THE RECOMMENDATION (when ready):
Make it feel written for THIS student, not a brochure.

1. BEST FIT — The degree that fits them most. WHY it fits them specifically from what they said. Kind of work they'd do, real job roles in India, realistic salary range, and why it matches personality and situation.

2. ALSO WORTH CONSIDERING — A secondary option that could work; what's different about this path.

3. THINK CAREFULLY BEFORE CHOOSING — If they leaned toward something that may not fit, say so gently and specifically to their situation — not generic warnings.

4. HONEST REALITY CHECK — One short paragraph on what it will actually take to succeed in the recommended field. Real, not sugarcoated, not scary.

After the recommendation, ask: "Would you like to talk to someone who is actually working in this field?" — offer the idea of connecting with a mentor.

WHAT YOU MUST NEVER DO:
- Generic advice that could apply to anyone
- Recommend a field only because it's popular (engineering, medicine, etc.) without a genuine fit
- Make them feel bad about background, money, or confusion
- Ask more than one question in one message
- Lecture — stay conversational and concise
- Ignore financial reality
- Forget how much this decision matters — treat it with that weight

You are helping them understand themselves and choose a degree with clarity and confidence. That is What Next.`;

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      situation,
      conversationId,
    }: {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      situation: string;
      conversationId: string | null;
    } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Missing GROQ_API_KEY in server environment' },
        { status: 500 }
      );
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing conversationId' },
        { status: 400 }
      );
    }

    const { supabase, user, error: authError } = await getUserForApiRoute(req);

    if (authError || !user) {
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

    const lastUserMessage =
      messages.length > 0
        ? messages
            .slice()
            .reverse()
            .find((m) => m.role === 'user')?.content
        : null;

    console.log('api/chat request summary', {
      conversationId,
      situation,
      messageCount: messages.length,
      lastUserMessagePreview: lastUserMessage?.slice(0, 80) ?? null,
    });

    const completion = await groq.chat.completions.create({
      model: GROQ_CHAT_MODEL,
      messages: [
        { role: 'system', content: contextualSystemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      // Short turns most of the time; allow headroom for structured recommendation blocks when ready.
      max_tokens: 700,
    });

    const assistantMessage = completion.choices?.[0]?.message?.content;
    if (!assistantMessage || typeof assistantMessage !== 'string') {
      console.error('Groq returned empty content', {
        hasChoices: Boolean(completion.choices?.length),
        firstChoiceRole: completion.choices?.[0]?.message?.role,
        finishReason: completion.choices?.[0]?.finish_reason,
        conversationId,
        situation,
        messageCount: messages?.length ?? 0,
      });
      return NextResponse.json(
        { error: 'Groq returned no assistant message content' },
        { status: 502 }
      );
    }

    console.log('api/chat groq success', {
      conversationId,
      assistantMessageLength: assistantMessage.length,
      finishReason: completion.choices?.[0]?.finish_reason,
    });

    const updatedMessages = [
      ...messages,
      { role: 'assistant', content: assistantMessage },
    ];

    const { data: updatedRow, error: updateError } = await supabase
      .from('conversations')
      .update({ messages: updatedMessages })
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (updateError || !updatedRow) {
      // If persisting fails, still return the AI message so the user sees the response.
      console.error('Failed to persist conversation messages', {
        error: updateError,
        updatedRow,
        conversationId,
        userId: user.id,
        hint:
          'Ensure the client sends Authorization: Bearer <access_token> and RLS allows UPDATE for auth.uid() = user_id.',
      });
    }

    return NextResponse.json({ message: assistantMessage });
  } catch (error: any) {
    console.error('api/chat error', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate response' },
      { status: 500 }
    );
  }
}
