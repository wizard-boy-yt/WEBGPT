import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Import OpenRouter API keys
const API_KEYS = [
  process.env.OPENROUTER_API_KEY_1,
  process.env.OPENROUTER_API_KEY_2,
  process.env.OPENROUTER_API_KEY_3,
].filter(Boolean) as string[];

// Available free models from OpenRouter in order of preference
const AVAILABLE_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-flash-1.5:free',
  'google/gemini-pro-vision:free',
  'meta-llama/llama-3.2-11b-vision-instruct:free',
  'meta-llama/llama-3.2-90b-vision-instruct:free',
  'qwen/qwen-2-vl-7b-instruct:free',
  'microsoft/phi-3-medium-128k-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
  'huggingface/zephyr-7b-beta:free',
  'openchat/openchat-7b:free',
  'gryphe/mythomist-7b:free',
  'undi95/toppy-m-7b:free',
  'openrouter/auto:free'
];

const GEMINI_MODEL = AVAILABLE_MODELS[0];
let currentApiKeyIndex = 0;
let currentModelIndex = 0;

// Vision-capable models
const VISION_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-flash-1.5:free',
  'google/gemini-pro-vision:free',
  'meta-llama/llama-3.2-11b-vision-instruct:free',
  'meta-llama/llama-3.2-90b-vision-instruct:free',
  'qwen/qwen-2-vl-7b-instruct:free'
];

async function makeAPIRequest(apiKey: string, model: string, messages: any[], textOnlyPrompt: string, signal: AbortSignal) {
  // Check if model supports vision
  const isVisionModel = VISION_MODELS.includes(model);
  
  // Use appropriate messages based on model capability
  const requestMessages = isVisionModel ? messages : [{
    role: 'user',
    content: textOnlyPrompt
  }];
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'WebGPT Image to Website Generator',
      'User-Agent': 'WebGPT/1.0'
    },
    signal: signal,
    body: JSON.stringify({
      model: model,
      messages: requestMessages,
      max_tokens: 8000,
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    })
  });
  
  return response;
}

export async function POST(req: NextRequest) {
  try {
    // Check if the request is JSON or FormData
    const contentType = req.headers.get('content-type') || '';
    
    let imageData: string | null = null;
    let prompt: string = '';
    let jsonData: any = null;
    
    if (contentType.includes('application/json')) {
      // Handle JSON request (from the main page)
      jsonData = await req.json();
      imageData = jsonData.imageData;
      prompt = jsonData.prompt || '';
      
      if (!imageData) {
        return NextResponse.json(
          { error: 'No image data provided in JSON request' },
          { status: 400 }
        );
      }

      // Extract base64 data from data URL if present
      if (imageData.startsWith('data:')) {
        const base64Index = imageData.indexOf(',');
        if (base64Index !== -1) {
          imageData = imageData.substring(base64Index + 1);
        } else {
          return NextResponse.json(
            { error: 'Invalid image data format - missing base64 data' },
            { status: 400 }
          );
        }
      }

      // Validate base64 data
      if (!imageData || imageData.length === 0) {
        return NextResponse.json(
          { error: 'Empty image data provided' },
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
    
    console.log('Generating website with free OpenRouter models...');
    
    // Check if we have OpenRouter API keys
    if (API_KEYS.length === 0) {
      console.error('No OpenRouter API keys configured');
      return NextResponse.json({ error: 'No OpenRouter API keys configured' }, { status: 500 });
    }

    // Get an API key using round-robin
    const apiKey = API_KEYS[currentApiKeyIndex];
    currentApiKeyIndex = (currentApiKeyIndex + 1) % API_KEYS.length;
    
    console.log('Using API key index:', currentApiKeyIndex - 1, 'Total keys:', API_KEYS.length);

    // Detect image format from the original data URL or default to png
    let mimeType = 'image/png';
    if (jsonData?.imageData?.startsWith('data:')) {
      const mimeMatch = jsonData.imageData.match(/data:([^;]+)/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
    }

    console.log('Image data length:', imageData.length, 'MIME type:', mimeType);
    
    // Validate base64 format and size
    try {
      // Test if it's valid base64
      const testBuffer = Buffer.from(imageData, 'base64');
      if (testBuffer.length === 0) {
        throw new Error('Invalid base64 data');
      }
      
      // Check if image is too large (limit to 20MB)
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (testBuffer.length > maxSize) {
        console.error('Image too large:', testBuffer.length, 'bytes');
        return NextResponse.json(
          { error: `Image too large. Maximum size is ${maxSize / (1024 * 1024)}MB` },
          { status: 400 }
        );
      }
      
      console.log('Base64 validation passed, decoded size:', testBuffer.length, 'bytes');
    } catch (e) {
      console.error('Base64 validation failed:', e);
      return NextResponse.json(
        { error: 'Invalid base64 image data format' },
        { status: 400 }
      );
    }

    // Prepare the messages for the API request
    const messages = [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analyze this image and generate a complete responsive single-page website based on what you see. 
          
          ${prompt ? `Additional instructions: ${prompt}` : ''}
          
          Requirements:
          - Generate complete HTML, CSS, and JavaScript code as separate sections
          - Use semantic HTML5 structure
          - Modern CSS with Flexbox/Grid for layout
          - Mobile-first responsive design with proper breakpoints
          - Clean, maintainable code
          - No external dependencies (no CDN links)
          - IMPORTANT: Never use external placeholder image URLs like via.placeholder.com, placeholder.com, or any external image URLs. Instead use data URIs for placeholder images or use CSS gradients/colors for visual elements
          - Match the design, colors, layout, and style from the image as closely as possible
          - Include interactive elements if shown in the image
          - Make it fully responsive across all device sizes
          - Use proper CSS media queries for different screen sizes
          
          Respond ONLY with the code in this exact format with three separate code blocks:
          
          \`\`\`html
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Generated Website</title>
          </head>
          <body>
              <!-- HTML content here - only the body content, no style or script tags -->
          </body>
          </html>
          \`\`\`
          
          \`\`\`css
          /* Complete CSS code here */
          /* Include responsive design with media queries */
          /* Mobile-first approach with breakpoints for tablet and desktop */
          \`\`\`
          
          \`\`\`javascript
          // Complete JavaScript code here
          // Include all interactive functionality
          \`\`\`
          
          Make sure each section is complete and properly formatted. The CSS should include responsive breakpoints and the JavaScript should handle all interactive elements.`
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${imageData}`
          }
        }
      ]
    }];

    // Create text-only prompt for non-vision models
    const textOnlyPrompt = `Generate a complete responsive single-page website. 
    
    ${prompt ? `Additional instructions: ${prompt}` : ''}
    
    Requirements:
    - Generate complete HTML, CSS, and JavaScript code as separate sections
    - Use semantic HTML5 structure
    - Modern CSS with Flexbox/Grid for layout
    - Mobile-first responsive design with proper breakpoints
    - Clean, maintainable code
    - No external dependencies (no CDN links)
    - IMPORTANT: Never use external placeholder image URLs like via.placeholder.com, placeholder.com, or any external image URLs. Instead use data URIs for placeholder images or use CSS gradients/colors for visual elements
    - Create a modern, professional-looking website
    - Include interactive elements
    - Make it fully responsive across all device sizes
    - Use proper CSS media queries for different screen sizes
    
    Respond ONLY with the code in this exact format with three separate code blocks:
    
    \`\`\`html
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Generated Website</title>
    </head>
    <body>
        <!-- HTML content here - only the body content, no style or script tags -->
    </body>
    </html>
    \`\`\`
    
    \`\`\`css
    /* Complete CSS code here */
    /* Include responsive design with media queries */
    /* Mobile-first approach with breakpoints for tablet and desktop */
    \`\`\`
    
    \`\`\`javascript
    // Complete JavaScript code here
    // Include all interactive functionality
    \`\`\`
    
    Make sure each section is complete and properly formatted. The CSS should include responsive breakpoints and the JavaScript should handle all interactive elements.`;

    // Try different models with fallback and multiple API keys
    console.log('Making request to OpenRouter API...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    let response;
    let lastError;
    
    // Try different API keys
    for (let keyIndex = 0; keyIndex < API_KEYS.length; keyIndex++) {
      const currentKey = API_KEYS[(currentApiKeyIndex + keyIndex) % API_KEYS.length];
      
      for (let i = 0; i < AVAILABLE_MODELS.length; i++) {
        const modelToTry = AVAILABLE_MODELS[i];
        console.log(`Trying API key ${keyIndex + 1}/${API_KEYS.length} with model: ${modelToTry}`);
        
        try {
          response = await makeAPIRequest(currentKey, modelToTry, messages, textOnlyPrompt, controller.signal);
          
          if (response.ok) {
            console.log(`Success with API key ${keyIndex + 1} and model: ${modelToTry}`);
            currentApiKeyIndex = (currentApiKeyIndex + keyIndex + 1) % API_KEYS.length;
            break;
          } else {
            console.log(`Model ${modelToTry} failed with status: ${response.status}`);
            if (response.status === 429) {
              console.log('Rate limit hit, trying next API key...');
              break; // Try next API key
            }
            const errorText = await response.text();
            console.log(`Error details: ${errorText}`);
            lastError = new Error(`Model ${modelToTry} failed: ${errorText}`);
          }
        } catch (error) {
          console.log(`Model ${modelToTry} threw error:`, error);
          lastError = error;
        }
      }
      
      if (response && response.ok) {
        break;
      }
    }
    
    if (!response || !response.ok) {
      throw lastError || new Error('All models failed');
    }

    clearTimeout(timeoutId);
    console.log('Received response from OpenRouter API, status:', response.status);

    if (!response.ok) {
      let errorMessage = `Gemini API request failed with status ${response.status}`;
      let errorDetails = null;
      
      try {
        const error = await response.json();
        errorDetails = error;
        errorMessage = error.error?.message || error.message || errorMessage;
        console.error('Gemini API error response:', JSON.stringify(error, null, 2));
      } catch (e) {
        // If we can't parse the error as JSON, try to get the text
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
          console.error('Gemini API error text:', errorText);
        } catch (textError) {
          console.error('Failed to read error response:', textError);
        }
      }
      
      console.error('Full error details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        errorDetails
      });
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    // Log the structure of the response to help with debugging
    console.log('Gemini API response structure:', JSON.stringify({
      hasChoices: !!result.choices,
      choicesLength: result.choices?.length || 0,
      hasMessage: !!result.choices?.[0]?.message,
      hasContent: !!result.choices?.[0]?.message?.content
    }));
    
    const text = result.choices?.[0]?.message?.content || '';
    
    if (!text) {
      console.error('No text content in Gemini response:', result);
      throw new Error('No content generated by Gemini API');
    }

    console.log('Received response text length:', text.length);
    console.log('Response preview:', text.substring(0, 500) + '...');

    // Parse the response to extract HTML, CSS, and JavaScript separately
    const htmlMatch = text.match(/```html\n?([\s\S]*?)\n?```/i);
    const cssMatch = text.match(/```css\n?([\s\S]*?)\n?```/i);
    // Try multiple patterns for JavaScript
    const jsMatch = text.match(/```javascript\n?([\s\S]*?)\n?```/i) || 
                   text.match(/```js\n?([\s\S]*?)\n?```/i) ||
                   text.match(/```JavaScript\n?([\s\S]*?)\n?```/i);
    
    if (!htmlMatch || !htmlMatch[1]) {
      console.warn('No HTML code block found in response. Trying to extract HTML directly...');
      // Try to find HTML content directly
      const directHtmlMatch = text.match(/<!DOCTYPE html>[\s\S]*<\/html>/);
      if (directHtmlMatch) {
        const completeHtml = directHtmlMatch[0].trim();
        
        // Try to extract embedded CSS and JS from the complete HTML
        const embeddedCssMatch = completeHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/);
        const embeddedJsMatch = completeHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/);
        
        // Clean HTML by removing embedded style and script tags
        let cleanHtml = completeHtml;
        if (embeddedCssMatch) {
          cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/, '');
        }
        if (embeddedJsMatch) {
          cleanHtml = cleanHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/, '');
        }
        
        return NextResponse.json({
          html: cleanHtml.trim(),
          css: embeddedCssMatch ? embeddedCssMatch[1].trim() : '',
          js: embeddedJsMatch ? embeddedJsMatch[1].trim() : ''
        });
      } else {
        // Last resort: try to generate a basic responsive website structure
        console.warn('No valid HTML found, generating basic structure...');
        const basicHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Website</title>
</head>
<body>
    <div class="container">
        <h1>Website Generated from Image</h1>
        <p>The AI was unable to generate specific content from the image, but here's a basic responsive structure.</p>
    </div>
</body>
</html>`;
        
        const basicCss = `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #333;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

@media (max-width: 768px) {
    .container {
        padding: 10px;
    }
}`;
        
        return NextResponse.json({
          html: basicHtml,
          css: basicCss,
          js: ''
        });
      }
    }

    const html = htmlMatch[1].trim();
    const css = cssMatch ? cssMatch[1].trim() : '';
    const js = jsMatch ? jsMatch[1].trim() : '';
    
    // Log parsing results
    console.log('Successfully extracted code sections:');
    console.log('- HTML length:', html.length);
    console.log('- CSS length:', css.length);
    console.log('- JavaScript length:', js.length);

    const responseData = {
      html: html,
      css: css,
      js: js
    };
    
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('Image to website generation error:', error);
    
    // Handle specific error types
    let errorMessage = 'Failed to process image or generate website';
    let statusCode = 500;
    
    if (error.name === 'AbortError') {
      errorMessage = 'Request timed out. Please try again with a smaller image.';
      statusCode = 408;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Provide more detailed error information
    const errorDetails = {
      error: errorMessage,
      timestamp: new Date().toISOString(),
      route: '/api/gemini',
      process: 'image-to-website',
      errorType: error.name || 'Unknown'
    };
    
    return NextResponse.json(
      errorDetails,
      { status: statusCode }
    );
  }
}
