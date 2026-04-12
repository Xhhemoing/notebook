import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { baseUrl, apiKey, model, messages, response_format } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
    }

    const response = await fetch(baseUrl || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        response_format
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: `Upstream API error: ${error}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('AI Proxy Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
