import { NextRequest, NextResponse } from 'next/server';

const API_KEYS = [
  process.env.OPENROUTER_API_KEY_1,
  process.env.OPENROUTER_API_KEY_2,
  process.env.OPENROUTER_API_KEY_3,
].filter(Boolean) as string[];

const MODEL = 'deepseek/deepseek-chat-v3-0324:free';
let currentApiKeyIndex = 0;

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (API_KEYS.length === 0) {
      return NextResponse.json({ error: 'No API keys configured' }, { status: 500 });
    }

    const apiKey = API_KEYS[currentApiKeyIndex];
    currentApiKeyIndex = (currentApiKeyIndex + 1) % API_KEYS.length;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{
          role: 'user',
          content: `Generate a complete single-page website (HTML, CSS, JavaScript) based on:
          ${prompt}
          Respond ONLY with the code in this format:
          \`\`\`html
          <!-- HTML here -->
          \`\`\`
          \`\`\`css
          /* CSS here */
          \`\`\`
          \`\`\`javascript
          // JavaScript here
          \`\`\``
        }],
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    if (!response.body) {
      throw new Error('API returned null response body');
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Text generation failed' },
      { status: 500 }
    );
  }
}
