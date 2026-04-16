import { NextResponse } from 'next/server';
import { generateTextWithFallback } from '@/lib/ai/config';

// In a real app, this would be a database like D1, Postgres, or Firestore
// Using a global variable for simple in-memory task tracking during dev
declare global {
  var taskStatuses: Map<string, any>;
}
if (!global.taskStatuses) {
  global.taskStatuses = new Map<string, any>();
}

export async function POST(req: Request) {
  let taskId: string | undefined;
  try {
    // Verify QStash signature in production!
    // const signature = req.headers.get('upstash-signature');
    
    const body = await req.json();
    taskId = body.taskId;
    const { imageUrl, base64 } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
    }

    console.log(`[Webhook] Processing image for task ${taskId}`);
    
    // Update status to processing
    global.taskStatuses.set(taskId, { status: 'processing' });

    // Prepare image content for Gemini
    const imageContent = imageUrl 
      ? { type: 'image', image: imageUrl } // Vercel AI SDK format for URL
      : { type: 'image', image: base64 }; // Vercel AI SDK format for base64

    // Call Gemini Vision model to analyze the mistake
    const result = await generateTextWithFallback({
      tier: 'smart',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Please analyze this exam mistake image. Extract the original question, the student\'s answer, the correct answer, and explain the core concept and why the student made the mistake. Return the result as a structured JSON object with keys: originalQuestion, studentAnswer, correctAnswer, coreConcept, explanation.' },
            imageContent as any,
          ]
        }
      ]
    });

    // Parse the JSON result
    let parsedResult;
    try {
      // Simple extraction if the model wraps it in markdown code blocks
      const jsonStr = result.text.replace(/```json\n?|\n?```/g, '').trim();
      parsedResult = JSON.parse(jsonStr);
    } catch (e) {
      console.warn('Failed to parse JSON, using raw text', e);
      parsedResult = { rawText: result.text };
    }

    // Save to Database (Mocked here)
    global.taskStatuses.set(taskId, { 
      status: 'completed', 
      result: parsedResult 
    });

    console.log(`[Webhook] Completed task ${taskId}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Webhook API] Error:', error);
    if (taskId) {
      global.taskStatuses.set(taskId, { status: 'failed', error: String(error) });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Simple endpoint to check task status
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get('taskId');
  
  if (!taskId) {
    return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
  }
  
  const status = global.taskStatuses.get(taskId) || { status: 'not_found' };
  return NextResponse.json(status);
}
