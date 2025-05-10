import { NextRequest, NextResponse } from 'next/server';

// Rotate through available API keys to distribute load
const API_KEYS = [
  process.env.OPENROUTER_API_KEY_1,
  process.env.OPENROUTER_API_KEY_2,
  process.env.OPENROUTER_API_KEY_3,
].filter(Boolean) as string[];

// Primary and fallback models
const PRIMARY_MODEL = 'google/gemini-2.0-flash-exp:free';
const FALLBACK_MODELS = [
  'anthropic/claude-3-haiku:free',
  'meta-llama/llama-3-70b-instruct:free',
  'deepseek/deepseek-chat-v3-0324:free'
];

let currentApiKeyIndex = 0;
let currentModelIndex = 0;

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const { imageData, prompt } = await req.json();
    
    // Validate inputs
    if (!imageData) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    // Ensure we have API keys configured
    if (API_KEYS.length === 0) {
      return NextResponse.json({ error: 'No API keys configured' }, { status: 500 });
    }

    // Get the next API key in rotation
    const apiKey = API_KEYS[currentApiKeyIndex];
    currentApiKeyIndex = (currentApiKeyIndex + 1) % API_KEYS.length;

    // Extract base64 data from the data URL if needed
    let base64Image = imageData;
    if (imageData.startsWith('data:')) {
      const matches = imageData.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        base64Image = matches[2];
      } else {
        return NextResponse.json({ error: 'Invalid image data format' }, { status: 400 });
      }
    }

    // Prepare the prompt for generating website code from the image
    const userPrompt = prompt || 'Generate a complete responsive website from this image';
    const systemPrompt = `You are a web development expert. Analyze the uploaded image and create a complete single-page website (HTML, CSS, JavaScript) that matches the design, layout, and content shown in the image.
    
    Important guidelines:
    - Create responsive, modern code that works across devices
    - Use semantic HTML5 elements
    - Include appropriate CSS for styling and layout
    - Add JavaScript for any interactive elements
    - Ensure the website is accessible and follows best practices
    
    Respond ONLY with the code in this format:
    \`\`\`html
    <!-- HTML here -->
    \`\`\`
    \`\`\`css
    /* CSS here */
    \`\`\`
    \`\`\`javascript
    // JavaScript here
    \`\`\``;

    // Try with primary model first, then fallbacks if needed
    let modelToUse = PRIMARY_MODEL;
    let retryCount = 0;
    let maxRetries = FALLBACK_MODELS.length + 1; // Primary + all fallbacks
    let response;
    let lastError = null;

    while (retryCount < maxRetries) {
      try {
        console.log(`Sending request to OpenRouter with model: ${modelToUse} (attempt ${retryCount + 1}/${maxRetries})`);

        // Prepare the request body based on the model capabilities
        // Some models support image inputs directly, others need different formats
        let requestBody;
        
        if (modelToUse === PRIMARY_MODEL) {
          // Gemini model supports direct image input
          requestBody = {
            model: modelToUse,
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: userPrompt
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            stream: true
          };
        } else {
          // For fallback models that might not support image inputs directly,
          // we'll use a text-only approach with a description
          requestBody = {
            model: modelToUse,
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: `${userPrompt} (Note: I uploaded an image but it couldn't be processed directly. Please generate a generic responsive website based on my text prompt.)`
              }
            ],
            stream: true
          };
        }

        // Make the API request to OpenRouter
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://webgpt.app', // Your domain
            'X-Title': 'WebGPT Image-to-Web Generator'
          },
          body: JSON.stringify(requestBody)
        });

        // If the request was successful, break out of the retry loop
        if (response.ok) {
          break;
        }

        // Handle rate limiting and other errors
        const errorData = await response.json();
        lastError = errorData.error?.message || JSON.stringify(errorData.error) || `API error with status ${response.status}`;
        
        // Check if this is a rate limiting error
        const isRateLimited = 
          response.status === 429 || 
          lastError.includes('rate-limit') || 
          lastError.includes('capacity');
        
        if (isRateLimited && retryCount < maxRetries - 1) {
          console.log(`Model ${modelToUse} is rate-limited. Trying fallback model...`);
          // Try the next fallback model
          modelToUse = FALLBACK_MODELS[retryCount];
          retryCount++;
          // Wait a short time before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          // For non-rate-limiting errors or if we've exhausted all models, throw the error
          throw new Error(lastError);
        }
      } catch (error: any) {
        lastError = error.message || 'Unknown error occurred';
        console.error(`Error with model ${modelToUse}:`, lastError);
        
        // If we have more models to try, continue the loop
        if (retryCount < maxRetries - 1) {
          modelToUse = FALLBACK_MODELS[retryCount];
          retryCount++;
          // Wait a short time before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          // We've tried all models, throw the last error
          throw error;
        }
      }
    }

    // If we get here without a valid response, something went wrong
    if (!response || !response.ok) {
      throw new Error(lastError || 'Failed to get a valid response from any model');
    }

    // Ensure we have a response body
    if (!response.body) {
      throw new Error('API returned null response body');
    }

    // Return the streaming response
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error: any) {
    console.error('Image-to-web generation error:', error);
    
    // Provide a more helpful error message for rate limiting
    let errorMessage = error.message || 'Image-to-web generation failed';
    if (errorMessage.includes('rate-limit') || errorMessage.includes('capacity')) {
      errorMessage = 'The AI models are currently experiencing high demand. Please try again in a few minutes or try with a text prompt instead.';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Set the maximum request size to handle large images
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb' // Adjust as needed
    }
  }
};
