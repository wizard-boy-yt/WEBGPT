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
    const { html, css, js, instruction } = await req.json();
    
    if (!instruction) {
      return NextResponse.json({ error: 'Modification instruction is required' }, { status: 400 });
    }

    if (!html && !css && !js) {
      return NextResponse.json({ error: 'At least one code section (HTML, CSS, or JS) is required' }, { status: 400 });
    }

    if (API_KEYS.length === 0) {
      return NextResponse.json({ error: 'No API keys configured' }, { status: 500 });
    }

    const apiKey = API_KEYS[currentApiKeyIndex];
    currentApiKeyIndex = (currentApiKeyIndex + 1) % API_KEYS.length;

    // Create a comprehensive prompt for code modification
    const modificationPrompt = `You are a web development expert. Modify the provided code according to the user's instructions.

Current code:

HTML:
\`\`\`html
${html || '<!-- No HTML provided -->'}
\`\`\`

CSS:
\`\`\`css
${css || '/* No CSS provided */'}
\`\`\`

JavaScript:
\`\`\`javascript
${js || '// No JavaScript provided'}
\`\`\`

User instruction: ${instruction}

IMPORTANT REQUIREMENTS:
- Generate exactly 3 complete code blocks: HTML, CSS, and JavaScript
- NEVER use external placeholder image URLs like via.placeholder.com, placeholder.com, or any external image URLs
- Instead use data URIs for placeholder images or CSS gradients/colors for visual elements
- Maintain responsive design and mobile compatibility
- Ensure all code is complete and functional
- Keep the existing structure unless specifically asked to change it
- Make sure the JavaScript is complete with proper event listeners and functionality
- No external dependencies (no CDN links)
- Clean, maintainable code

Respond ONLY with the modified code in this exact format:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modified Website</title>
</head>
<body>
    <!-- Modified HTML content here -->
</body>
</html>
\`\`\`

\`\`\`css
/* Modified CSS code here */
\`\`\`

\`\`\`javascript
// Modified JavaScript code here
\`\`\`

Make sure each section is complete and properly formatted.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a web development expert. Always generate exactly 3 complete code blocks: HTML, CSS, and JavaScript. Never stop until all 3 blocks are finished. Never use external placeholder image URLs.'
          },
          {
            role: 'user',
            content: modificationPrompt
          }
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 12000,
        top_p: 0.9,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    if (!response.body) {
      throw new Error('API returned null response body');
    }

    // Return the streaming response
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Transfer-Encoding': 'chunked'
      }
    });

  } catch (error: any) {
    console.error('Code modification error:', error);
    return NextResponse.json(
      { error: error.message || 'Code modification failed' },
      { status: 500 }
    );
  }
} 