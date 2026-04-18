import { streamTextWithFallback } from '@/lib/ai/config';

export async function POST(req: Request) {
  try {
    // 1. Query DB for lowest stability & highest difficulty top 10 mistakes.
    // In a real app, you would query your D1/Firestore database here.
    // Mocking the DB query for now
    const topMistakes = [
      { question: "What is the capital of France?", mistake: "London", reason: "Confused with UK" },
      { question: "Solve 2x + 5 = 15", mistake: "x = 10", reason: "Forgot to divide by 2" }
    ];

    const promptText = `
      Here are the student's top mistakes based on FSRS algorithm (lowest stability, highest difficulty):
      ${JSON.stringify(topMistakes, null, 2)}
    `;

    // 2. Call gemini-3-pro (gemini-1.5-pro) with streamText
    const result = await streamTextWithFallback({
      tier: 'smart',
      system: "You are a gold-medal teacher. Based on the student's weak points and mistakes, summarize 3 core concepts they get wrong, and provide one practice question for each concept to help them improve. Format your response in Markdown.",
      prompt: promptText
    });

    // 3. Stream response to frontend
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('[Exam Prep API] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
