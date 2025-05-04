import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Import OpenRouter API keys from the text-generate route
const API_KEYS = [
  process.env.OPENROUTER_API_KEY_1,
  process.env.OPENROUTER_API_KEY_2,
  process.env.OPENROUTER_API_KEY_3,
].filter(Boolean) as string[];

const GEMINI_PROMPT_MODEL = 'google/gemini-2.0-flash-exp:free';
const DEEPSEEK_CODE_MODEL = 'deepseek/deepseek-chat-v3-0324:free';
let currentApiKeyIndex = 0;

export async function POST(req: NextRequest) {
  try {
    // Check if the request is JSON or FormData
    const contentType = req.headers.get('content-type') || '';
    
    let imageData: string | null = null;
    let prompt: string = '';
    
    if (contentType.includes('application/json')) {
      // Handle JSON request (from the main page)
      const jsonData = await req.json();
      imageData = jsonData.imageData;
      prompt = jsonData.prompt || '';
      
      if (!imageData) {
        return NextResponse.json(
          { error: 'No image data provided in JSON request' },
          { status: 400 }
        );
      }
    } else {
      // Handle FormData request (for backward compatibility)
      const formData = await req.formData();
      const imageFile = formData.get('image') as File;
      prompt = formData.get('prompt') as string || '';
      
      if (!imageFile) {
        return NextResponse.json(
          { error: 'No image file provided in form data' },
          { status: 400 }
        );
      }
      
      const buffer = await imageFile.arrayBuffer();
      imageData = Buffer.from(buffer).toString('base64');
    }
    
    // First, analyze the image to generate a detailed description
    console.log('Analyzing image to generate a detailed description...');
    
    const imageDescription = `Analyze the uploaded image and describe the website to create. Focus on:
    - Layout structure
    - Color scheme
    - Typography
    - Key sections/components
    - Interactive elements
    - Overall style and aesthetic
    ${prompt ? `Additional instructions: ${prompt}` : ''}`;
    
    // Now use the image description to generate the website code using DeepSeek via OpenRouter
    console.log('Using image description to generate website with DeepSeek...');
    
    // Check if we have OpenRouter API keys
    if (API_KEYS.length === 0) {
      return NextResponse.json({ error: 'No OpenRouter API keys configured' }, { status: 500 });
    }

    // Get an API key using round-robin
    const apiKey = API_KEYS[currentApiKeyIndex];
    currentApiKeyIndex = (currentApiKeyIndex + 1) % API_KEYS.length;

    // First use Gemini to generate a detailed website prompt
    const promptGenerationResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GEMINI_PROMPT_MODEL,
        messages: [{
          role: 'user',
          content: `Analyze this image and create a detailed website specification:
          
          ${imageDescription}
          
          ${prompt ? `Additional instructions: ${prompt}` : ''}
          
          Include:
          - Layout structure
          - Color scheme
          - Typography
          - Key sections
          - Interactive elements
          - Style guidelines`
        }]
      })
    });

    if (!promptGenerationResponse.ok) {
      const error = await promptGenerationResponse.json();
      throw new Error(error.error?.message || 'Prompt generation failed');
    }

    const promptResult = await promptGenerationResponse.json();
    const detailedPrompt = promptResult.choices?.[0]?.message?.content || '';
    
    if (!detailedPrompt) {
      throw new Error('Failed to generate detailed website prompt');
    }

    console.log('Generated detailed website prompt:', detailedPrompt.substring(0, 200) + '...');

    // Now use the detailed prompt with DeepSeek to generate the actual code
    const websitePrompt = `Generate a responsive single-page website (HTML, CSS, JavaScript) based on:
    
    ${detailedPrompt}
    
    Requirements:
    - Semantic HTML5
    - Modern CSS (Flexbox/Grid)
    - Mobile-first responsive design
    - Clean, maintainable code
    - No external dependencies`;
    
    console.log('Sending prompt to DeepSeek:', websitePrompt.substring(0, 200) + '...');
    
    // Call DeepSeek via OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: DEEPSEEK_CODE_MODEL,
        messages: [{
          role: 'user',
          content: `${websitePrompt}
          
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
        }]
      })
    });

    if (!response.ok) {
      let errorMessage = 'DeepSeek API request failed';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.message || errorMessage;
        console.error('DeepSeek API error:', error);
      } catch (e) {
        // If we can't parse the error as JSON, try to get the text
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
          console.error('DeepSeek API error text:', errorText);
        } catch (textError) {
          console.error('Failed to read error response:', textError);
        }
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    // Log the structure of the response to help with debugging
    console.log('DeepSeek API response structure:', JSON.stringify({
      hasChoices: !!result.choices,
      choicesLength: result.choices?.length || 0,
      hasMessage: !!result.choices?.[0]?.message,
      hasContent: !!result.choices?.[0]?.message?.content
    }));
    
    const text = result.choices?.[0]?.message?.content || '';
    
    if (!text) {
      console.error('No text content in DeepSeek response:', result);
      throw new Error('No content generated by DeepSeek API');
    }

    // Parse the response into HTML, CSS, JS
    // Use more flexible regex patterns to handle different code block formats
    const htmlMatch = text.match(/```html\n?([\s\S]*?)\n?```/) || text.match(/<html[\s\S]*<\/html>/);
    const cssMatch = text.match(/```css\n?([\s\S]*?)\n?```/) || text.match(/body\s*{[\s\S]*}/);
    const jsMatch = text.match(/```javascript\n?([\s\S]*?)\n?```/) || text.match(/```js\n?([\s\S]*?)\n?```/) || text.match(/document\.addEventListener[\s\S]*\);/);
    
    // Log parsing results
    console.log('Parsing results:', {
      foundHtml: !!htmlMatch,
      foundCss: !!cssMatch,
      foundJs: !!jsMatch
    });

    // Extract the content from the matches, handling different patterns
    let html = '';
    let css = '';
    let js = '';
    
    if (htmlMatch) {
      html = htmlMatch[1] ? htmlMatch[1].trim() : htmlMatch[0].trim();
    }
    
    if (cssMatch) {
      css = cssMatch[1] ? cssMatch[1].trim() : cssMatch[0].trim();
    }
    
    if (jsMatch) {
      js = jsMatch[1] ? jsMatch[1].trim() : jsMatch[0].trim();
    }
    
    const responseData = {
      html: html,
      css: css,
      js: js
    };
    
    // Check if we have at least some content
    if (!responseData.html && !responseData.css && !responseData.js) {
      console.warn('No code blocks found in response text. Raw text:', text.substring(0, 200) + '...');
    }
    
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('Image to website generation error:', error);
    
    // Provide more detailed error information
    const errorMessage = error.message || 'Failed to process image or generate website';
    const errorDetails = {
      error: errorMessage,
      timestamp: new Date().toISOString(),
      route: '/api/gemini',
      process: 'image-to-website'
    };
    
    return NextResponse.json(
      errorDetails,
      { status: 500 }
    );
  }
}
