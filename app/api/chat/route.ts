import { streamText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, system, tools: requestedTools } = await req.json();

    const result = streamText({
      model: google('gemini-3.1-pro-preview', { useSearchGrounding: true }), // Or config-driven
      system: system || 'You are an intelligent educational tutor. Answer concisely and use tools if needed to save data.',
      messages,
      tools: {
        proposeGraphChanges: tool({
          description: 'Propose changes to the knowledge graph based on user request or image analysis.',
          parameters: z.object({
            changes: z.array(z.object({
              action: z.enum(['ADD_NODE', 'ADD_RELATION']),
              targetName: z.string(),
              reasoning: z.string()
            })),
            analysis: z.string().describe('General analysis text')
          }),
          execute: async (args) => {
            // Note: client will handle the tool call result to change state
            return { success: true, ...args };
          }
        }),
        storeMistake: tool({
          description: 'Store a mistake memory into the database.',
          parameters: z.object({
            originalQuestion: z.string(),
            studentAnswer: z.string(),
            correctAnswer: z.string(),
            coreConcept: z.string(),
            explanation: z.string(),
          }),
          execute: async (args) => {
            return { success: true, ...args };
          }
        })
      }
    });

    return result.toDataStreamResponse();
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
