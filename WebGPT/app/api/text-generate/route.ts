import { NextRequest, NextResponse } from 'next/server';

const API_KEYS = [
  process.env.OPENROUTER_API_KEY_1,
  process.env.OPENROUTER_API_KEY_2,
  process.env.OPENROUTER_API_KEY_3,
].filter(Boolean) as string[];

const MODEL = 'deepseek/deepseek-chat-v3-0324:free';
let currentApiKeyIndex = 0;
async function makeAPIRequest(apiKey: string, model: string, messages: any[], retryCount = 0): Promise<Response> {
  const maxRetries = 3;
  
  try {
    console.log(`Attempting API request with model: ${model}, retry: ${retryCount}`);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'WebGPT Text Generator'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 12000,
        top_p: 0.9,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    if (response.ok) {
      return response;
    }

    // Handle specific error codes
    if (response.status === 429) {
      console.warn(`Rate limit hit for model ${model}, status: ${response.status}`);
      if (retryCount < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return makeAPIRequest(apiKey, model, messages, retryCount + 1);
      }
    }

    const errorText = await response.text();
    console.error(`API request failed: ${response.status} - ${errorText}`);
    throw new Error(`API request failed with status ${response.status}: ${errorText}`);

  } catch (error) {
    console.error(`API request error for model ${model}:`, error);
    
    if (retryCount < maxRetries && (error as any).name !== 'AbortError') {
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`Retrying after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return makeAPIRequest(apiKey, model, messages, retryCount + 1);
    }
    
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (API_KEYS.length === 0) {
      return NextResponse.json({ error: 'No API keys configured' }, { status: 500 });
    }

    console.log(`Starting text generation for prompt: "${prompt.substring(0, 50)}..."`);

    const messages = [
      {
        role: 'system',
        content: 'You are a professional web developer. Always generate exactly 3 complete code blocks: HTML, CSS, and JavaScript. Never stop until all 3 blocks are finished. IMPORTANT: Never use external placeholder image URLs like via.placeholder.com, placeholder.com, or any external image URLs. Instead use data URIs for placeholder images or use CSS gradients/colors for visual elements. Ensure all code is complete and functional.'
      },
      {
        role: 'user',
        content: `Create a dark theme, responsive, reactive, eye-catching website: ${prompt}

Generate exactly 3 code blocks in this format:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${prompt.substring(0, 50)}</title>
</head>
<body>
    <!-- Complete HTML content here -->
</body>
</html>
\`\`\`

\`\`\`css
/* Complete CSS styles here - dark theme, responsive design */
\`\`\`

\`\`\`javascript
document.addEventListener('DOMContentLoaded', function() {
    // Complete JavaScript functionality here
});
\`\`\`

Make sure each section is complete and properly formatted. The website should be fully functional with interactive elements.`
      }
    ];

    let response: Response | null = null;
    let lastError: Error | null = null;

    // Try different API keys with the single model
    for (let keyIndex = 0; keyIndex < API_KEYS.length; keyIndex++) {
      const apiKey = API_KEYS[(currentApiKeyIndex + keyIndex) % API_KEYS.length];
      
      try {
        console.log(`Trying API key ${keyIndex + 1}/${API_KEYS.length} with model: ${MODEL}`);
        response = await makeAPIRequest(apiKey, MODEL, messages);
        
        if (response && response.ok) {
          console.log(`Success with API key ${keyIndex + 1} and model: ${MODEL}`);
          currentApiKeyIndex = (currentApiKeyIndex + keyIndex + 1) % API_KEYS.length;
          break;
        }
      } catch (error) {
        console.warn(`Failed with API key ${keyIndex + 1} and model ${MODEL}:`, error);
        lastError = error as Error;
        continue;
      }
    }

    if (!response || !response.ok) {
      console.error('All API attempts failed, providing fallback response');
      
      // Provide a fallback response with basic website structure
      const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${prompt}</title>
</head>
<body>
    <div class="container">
        <header>
            <h1>Welcome</h1>
        </header>
        <main>
            <section>
                <h2>About ${prompt}</h2>
                <p>This is a responsive website created for: ${prompt}</p>
            </section>
        </main>
    </div>
</body>
</html>`;

      const fallbackCss = `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
    color: #ffffff;
    line-height: 1.6;
    min-height: 100vh;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

header {
    text-align: center;
    padding: 40px 0;
}

h1 {
    font-size: 3rem;
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

main {
    padding: 40px 0;
}

section {
    background: rgba(255, 255, 255, 0.1);
    padding: 30px;
    border-radius: 15px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

@media (max-width: 768px) {
    .container {
        padding: 10px;
    }
    
    h1 {
        font-size: 2rem;
    }
}`;

      const fallbackJs = `document.addEventListener('DOMContentLoaded', function() {
    console.log('Website loaded successfully');
    
    // Add smooth scrolling
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Add hover effects
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        section.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        section.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
});`;

      // Create a fallback streaming response
      const escapedHtml = fallbackHtml.replace(/\n/g, '\\n').replace(/"/g, '\\"');
      const escapedCss = fallbackCss.replace(/\n/g, '\\n').replace(/"/g, '\\"');
      const escapedJs = fallbackJs.replace(/\n/g, '\\n').replace(/"/g, '\\"');
      
      const fallbackContent = 'data: {"choices":[{"delta":{"content":"```html\\n' + escapedHtml + '\\n```\\n\\n```css\\n' + escapedCss + '\\n```\\n\\n```javascript\\n' + escapedJs + '\\n```"}}]}\n\ndata: [DONE]\n\n';

      return new Response(fallbackContent, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          'Transfer-Encoding': 'chunked'
        }
      });
    }

    if (!response.body) {
      throw new Error('API returned null response body');
    }

    console.log('Returning successful API response');

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
    console.error('Text generation error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Text generation failed',
        details: 'Please try again or check your API configuration'
      },
      { status: 500 }
    );
  }
}
