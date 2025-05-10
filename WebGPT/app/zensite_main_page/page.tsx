"use client"

import { useState, useEffect, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import Link from 'next/link';
import { supabase, saveHistory, loadHistory, deleteHistoryItem, deleteAllHistory } from '@/lib/supabase';
import { Send, Loader2, CircleUser, Settings, Download } from 'lucide-react';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import CodeMirrorEditor from '@/components/code-editor/code-mirror-editor';
import Preview from '@/components/preview';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ZenSiteMainPage() {
  const [prompt, setPrompt] = useState(''); // For text input mode
  const [isLoading, setIsLoading] = useState(false);
  const [isNewChatLoading, setIsNewChatLoading] = useState(false);
  const [htmlContent, setHtmlContent] = useState('<!-- HTML code will appear here -->');
  const [cssContent, setCssContent] = useState('/* CSS code will appear here */');
  const [jsContent, setJsContent] = useState('// JavaScript code will appear here');
  const [error, setError] = useState<string | null>(null);
  const [isImageInput, setIsImageInput] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null); // Base64 data URL
  const [imagePrompt, setImagePrompt] = useState(''); // State for image-related text prompt
  const [user, setUser] = useState<{email?: string, id?: string} | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLogoLoading, setIsLogoLoading] = useState(false);
  const historySidebarRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showHistory && historySidebarRef.current && 
          !historySidebarRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHistory, historySidebarRef]);


  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Create filename with username and project number
      const username = user?.email?.split('@')[0] || 'user';
      const projectNumber = historyItems.length + 1;
      const folderName = `${username}-project${projectNumber}`;
      
      // Inject CSS and JS links into HTML
      const linkedHtml = htmlContent.replace('</head>', 
        `<link rel="stylesheet" href="styles.css">\n</head>`)
        .replace('</body>', 
        `<script src="script.js"></script>\n</body>`);
      
      // Add files to zip (without folder nesting)
      zip.file('index.html', linkedHtml);
      zip.file('styles.css', cssContent);
      zip.file('script.js', jsContent);
      
      // Generate zip file
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Create download link
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
    } catch (err) {
      console.error('Error generating zip file:', err);
      setError('Failed to generate download. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  };

  const handleNewChat = async () => {
    // Save current project to history if there's content
    if (user?.id && (htmlContent !== '<!-- HTML code will appear here -->' || 
                     cssContent !== '/* CSS code will appear here */' || 
                     jsContent !== '// JavaScript code will appear here')) {
      try {
        await saveHistory(
          user.id,
          prompt,
          htmlContent,
          cssContent,
          jsContent,
          imagePreview || undefined
        );
        const updatedHistory = await loadHistory(user.id);
        setHistoryItems(updatedHistory || []);
      } catch (err) {
        console.error('Error saving history:', err);
      }
    }

    // Reset for new project
    setHtmlContent('<!-- HTML code will appear here -->');
    setCssContent('/* CSS code will appear here */');
    setJsContent('// JavaScript code will appear here');
    setPrompt('');
    setImagePreview(null);
    setImagePrompt('');
    setIsImageInput(false);
    setError(null);
    setEditorKey(prev => prev + 1); // Force editor remount
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        window.location.href = '/auth/login';
        return;
      }
      setUser(user);
      
      // Load user history
      const history = await loadHistory(user.id);
      setHistoryItems(history || []);
    };
    fetchUser();

    return () => {
      // Clean up loading state when component unmounts
      setIsLogoLoading(false);
    };
  }, []);

  const [editorKey, setEditorKey] = useState(0);

  const loadHistoryItem = async (item: any) => {
    console.log('[loadHistoryItem] Starting for item ID:', item.id);
    console.log('[loadHistoryItem] Received item data:', JSON.stringify(item, null, 2)); // Log the full item
    try {
      console.log('[loadHistoryItem] Checking item properties:', {
        id: item.id,
        has_zip_path: !!item.zip_file_path,
        has_html_content: !!item.html_content,
        has_css_content: !!item.css_content,
        has_js_content: !!item.js_content
      });

      // Initialize content variables
      let loadedHtml = item.html_content || '<!-- No HTML content in DB -->';
      let loadedCss = item.css_content || '/* No CSS content in DB */';
      let loadedJs = item.js_content || '// No JS content in DB';

      console.log('[loadHistoryItem] Initial content from DB columns:', {
        html: loadedHtml.substring(0, 50) + '...',
        css: loadedCss.substring(0, 50) + '...',
        js: loadedJs.substring(0, 50) + '...'
      });

      // Then try to load from zip if available
      if (item.zip_file_path) {
        console.log('[loadHistoryItem] Attempting to load from zip:', item.zip_file_path);
        try {
          const { data: zipData, error: downloadError } = await supabase.storage
            .from('user-history')
            .download(item.zip_file_path);

          if (downloadError) {
            console.error('[loadHistoryItem] Supabase storage download error:', downloadError);
            // Don't throw, just log and proceed with DB content
          } else if (zipData) {
            console.log('[loadHistoryItem] Zip file downloaded successfully, size:', zipData.size);
            try {
              const JSZip = (await import('jszip')).default;
              const zip = await JSZip.loadAsync(zipData);
              console.log('[loadHistoryItem] Zip loaded with', Object.keys(zip.files).length, 'files:', Object.keys(zip.files));

              // Extract files from zip - use exact names now
              const htmlFile = zip.file('index.html');
              const cssFile = zip.file('styles.css');
              const jsFile = zip.file('script.js');

              if (htmlFile) {
                loadedHtml = await htmlFile.async('text');
                console.log('[loadHistoryItem] Loaded HTML from zip. Length:', loadedHtml.length);
              } else {
                 console.warn('[loadHistoryItem] index.html not found in zip.');
              }
              if (cssFile) {
                loadedCss = await cssFile.async('text');
                console.log('[loadHistoryItem] Loaded CSS from zip. Length:', loadedCss.length);
              } else {
                 console.warn('[loadHistoryItem] styles.css not found in zip.');
              }
              if (jsFile) {
                loadedJs = await jsFile.async('text');
                console.log('[loadHistoryItem] Loaded JS from zip. Length:', loadedJs.length);
              } else {
                 console.warn('[loadHistoryItem] script.js not found in zip.');
              }
            } catch (zipLoadErr) {
              console.error('[loadHistoryItem] Error loading or extracting zip:', zipLoadErr);
              // Proceed with DB content if zip fails
            }
          } else {
             console.warn('[loadHistoryItem] Zip download returned no data and no error.');
          }
        } catch (outerZipErr) {
          // Catch any unexpected errors during the download/load process
          console.error('[loadHistoryItem] Unexpected error during zip handling:', outerZipErr);
        }
      } else {
         console.log('[loadHistoryItem] No zip_file_path found for this item.');
      }

      // Set all states together to prevent preview flickering
      setHtmlContent(loadedHtml);
      setCssContent(loadedCss);
      setJsContent(loadedJs);
      setPrompt(item.prompt || '');
      setImagePrompt('');
      setImagePreview(item.image_data || null);
      setIsImageInput(!!item.image_data);
      
      console.log('[loadHistoryItem] Loaded content:', {
        html: loadedHtml.substring(0, 50) + '...',
        css: loadedCss.substring(0, 50) + '...',
        js: loadedJs.substring(0, 50) + '...'
      });

      setShowHistory(false); // Close history panel after all states are updated

      // Force editor remount by changing the key
      console.log('[loadHistoryItem] Forcing editor remount.');
      setEditorKey(prev => prev + 1);

      console.log('[loadHistoryItem] Finished loading item ID:', item.id);

    } catch (err) {
      console.error('[loadHistoryItem] Uncaught error:', err);
      setError('Failed to load history item. Please check console for details.');
    }
  };

  const updateTabContent = (id: string, content: string) => {
    if (id === 'html') setHtmlContent(content);
    else if (id === 'css') setCssContent(content);
    else if (id === 'js') setJsContent(content);
  };

  const [activeTab, setActiveTab] = useState('html');
  const htmlEditorContainerRef = useRef<HTMLDivElement>(null);
  const cssEditorContainerRef = useRef<HTMLDivElement>(null);
  const jsEditorContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const leftSideContainerRef = useRef<HTMLDivElement>(null);

  const smoothScrollToBottom = (containerRef: React.RefObject<HTMLDivElement>) => {
    if (containerRef.current) {
      const container = containerRef.current;
      const start = container.scrollTop;
      const end = container.scrollHeight - container.clientHeight;
      const duration = 300; // milliseconds
      const startTime = performance.now();

      const animateScroll = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        container.scrollTop = start + (end - start) * progress;

        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        }
      };

      requestAnimationFrame(animateScroll);
    }
  };

  // Auto-scroll effect for HTML editor
  useEffect(() => {
    smoothScrollToBottom(htmlEditorContainerRef);
  }, [htmlContent]);

  // Auto-scroll effect for CSS editor
  useEffect(() => {
    smoothScrollToBottom(cssEditorContainerRef);
  }, [cssContent]);

  // Auto-scroll effect for JS editor
  useEffect(() => {
    smoothScrollToBottom(jsEditorContainerRef);
  }, [jsContent]);

  const scrollToBottom = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  };

  const handleModification = async () => {
    if (!prompt.trim()) {
      setError('Please enter modification instructions.');
      return;
    }

    setError(null);
    setIsLoading(true);
    setActiveTab('html');

    try {
      const response = await fetch('/api/modify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: htmlContent,
          css: cssContent,
          js: jsContent,
          instruction: prompt
        }),
      });

      if (!response.ok) {
        let errorMsg = `API request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
          console.error('API error response:', errorData);
        } catch (jsonError) {
          try {
            const errorText = await response.text();
            console.error("Non-JSON error response:", errorText);
            errorMsg = errorText ? `API Error: ${errorText.substring(0, 100)}` : errorMsg; 
          } catch (textError) {
            console.error("Failed to read error response body:", textError);
          }
        }
        throw new Error(errorMsg);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Process the SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = '';
      let leftover = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = leftover + decoder.decode(value, { stream: true });
        const lines = chunkText.split('\n');
        
        if (!chunkText.endsWith('\n')) {
          leftover = lines.pop() || '';
        } else {
          leftover = '';
        }

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonData = line.substring(6).trim();
            if (jsonData === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(jsonData);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                accumulatedResponse += delta;

                // Process code blocks with improved regex patterns
                const htmlMatch = accumulatedResponse.match(/```html\n([\s\S]*?)(\n```|$)/);
                const cssMatch = accumulatedResponse.match(/```css\n([\s\S]*?)(\n```|$)/);
                const jsMatch = accumulatedResponse.match(/```javascript\n([\s\S]*?)(\n```|$)/);

                // Process each code block type separately
                if (htmlMatch) {
                  processCodeBlock(htmlMatch, 'html');
                }
                if (cssMatch) {
                  processCodeBlock(cssMatch, 'css');
                }
                if (jsMatch) {
                  processCodeBlock(jsMatch, 'js');
                }
              }
            } catch (e) {
              console.error('Failed to parse SSE JSON:', jsonData, e);
              
              // Check if this is a rate limiting error
              if (jsonData.includes('rate-limit') || jsonData.includes('capacity') || 
                  jsonData.includes('Provider returned error') || jsonData.includes('google/gemini')) {
                setError('The AI models are currently experiencing high demand. Please try again in a few minutes or try with a text prompt instead.');
                console.error('Error in SSE response:', jsonData);
              }
            }
          }
        }
      }
      
    } catch (err) {
      console.error('Error modifying code:', err);
      setError(err instanceof Error ? err.message : 'Failed to modify code');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptSubmit = async () => {
    // Clear any previous errors
    setError(null);
    setIsGenerating(true); // Start generation
    
    // Check if we have existing code to modify
    const hasExistingCode = htmlContent !== '<!-- HTML code will appear here -->' || 
                          cssContent !== '/* CSS code will appear here */' || 
                          jsContent !== '// JavaScript code will appear here';

    if (hasExistingCode) {
      return handleModification();
    }
    
    // Updated validation check
    if (isImageInput && !imagePreview) {
      setError('Please upload an image for image input mode.');
      return;
    } else if (!isImageInput && !prompt.trim()) {
      setError('Please enter a website description for text input mode.');
      return;
    }
    
    console.log(`Starting ${isImageInput ? 'image' : 'text'} based generation...`);
    
    setIsLoading(true);
    setActiveTab('html');
    
    try {
      // Prepare data for the API request
      let base64Data = '';
      if (isImageInput && imagePreview) {
        // For image input, ensure proper formatting
        // Keep the full data URL for MIME type detection in the API
        // Check if the image data is too large
        if (imagePreview.length > 10 * 1024 * 1024) { // 10MB limit
          throw new Error('Image is too large. Maximum size is 10MB.');
        }
        
        base64Data = imagePreview.startsWith('data:') ? 
          imagePreview : 
          `data:image/png;base64,${imagePreview}`;
        
        console.log('Preparing image data for API request:', {
          hasImagePreview: !!imagePreview,
          imagePreviewLength: imagePreview ? imagePreview.length : 0,
          startsWithDataUrl: imagePreview ? imagePreview.startsWith('data:') : false,
          imagePromptLength: imagePrompt ? imagePrompt.length : 0
        });
      }

      // Use different endpoints based on input type
      // For image input, use image-to-webgenerator API; for text input, use text-generate API
      const endpoint = isImageInput ? '/api/image-to-webgenerator' : '/api/text-generate';
      console.log(`Using endpoint: ${endpoint} for ${isImageInput ? 'image' : 'text'} input`);
      
      // Prepare request data based on input type
      const requestData = isImageInput 
        ? {
            imageData: base64Data,
            prompt: imagePrompt || 'Generate a complete responsive website from this image'
          }
        : {
            prompt: prompt || 'Generate a complete responsive website'
          };
          
      // Validate request data
      if (isImageInput) {
        // For image input, we need imageData
        if (!requestData.imageData) {
          throw new Error('No image data available.');
        }
        // prompt is optional for image input
      } else {
        // For text input, we need prompt
        if (!requestData.prompt) {
          throw new Error('Please enter a website description.');
        }
      }
      
      console.log('Sending request to API with data:', {
        endpoint,
        isImageInput,
        hasImageData: isImageInput && !!base64Data,
        imageDataLength: isImageInput && base64Data ? base64Data.length : 0,
        imageDataPrefix: isImageInput && base64Data ? base64Data.substring(0, 30) + '...' : '',
        promptLength: (isImageInput ? imagePrompt : prompt)?.length || 0
      });
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));

      if (!response.ok) {
        let errorMsg = `API request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error?.message || errorData.error || errorMsg;
          console.error(`${isImageInput ? 'Image-to-webgenerator' : 'Text-generate'} API error response:`, errorData);
          
          // Special handling for rate limiting errors
          if (errorMsg.includes('rate-limit') || errorMsg.includes('capacity') || errorMsg.includes('high demand')) {
            errorMsg = 'The AI models are currently experiencing high demand. Please try again in a few minutes or try with a text prompt instead.';
          }
        } catch (jsonError) {
          try {
            const errorText = await response.text();
            errorMsg = errorText || errorMsg;
            console.error('Failed to parse error response as JSON, raw text:', errorText);
          } catch (textError) {
            console.error('Failed to read error response:', textError);
          }
        }
        throw new Error(errorMsg);
      }
      
      console.log(`API request to ${endpoint} successful`);

      // Process response based on whether it's a direct JSON response or a stream
      if (response.headers.get('content-type')?.includes('application/json')) {
        // For direct JSON responses (typically from Gemini API)
        const responseData = await response.json();
        console.log('Received direct JSON response data:', {
          hasHtml: !!responseData.html,
          hasCss: !!responseData.css,
          hasJs: !!responseData.js,
          htmlLength: responseData.html?.length || 0,
          cssLength: responseData.css?.length || 0,
          jsLength: responseData.js?.length || 0
        });
        
        // Update content states with the received data
        if (responseData.html) {
          setHtmlContent(responseData.html);
          setActiveTab('html');
        }
        
        if (responseData.css) {
          setCssContent(responseData.css);
        }
        
        if (responseData.js) {
          setJsContent(responseData.js);
        }
        
        // If we didn't get any content, show an error
        if (!responseData.html && !responseData.css && !responseData.js) {
          // Check if there's an error message in the response
          if (responseData.error || responseData.details) {
            throw new Error(responseData.error || responseData.details || 'No content was generated.');
          } else {
            // Check if we had a rate limiting error earlier
            if (error && (error.includes('rate-limit') || error.includes('high demand') || error.includes('capacity'))) {
              throw new Error('The AI models are currently experiencing high demand. Please try again in a few minutes or try with a text prompt instead.');
            } else {
              throw new Error('No content was generated. Please try again with a different image or prompt. If the problem persists, try using text input mode instead.');
            }
          }
        }
      } else if (response.headers.get('content-type')?.includes('text/event-stream')) {
        console.log('Processing streaming response');
        // For text-generate API or Gemini API, we get a streaming response
        if (!response.body) {
          console.error('Response body is null');
          throw new Error('Response body is null');
        }

        // Process the SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedResponse = ''; 
        let leftover = ''; 
        let chunkCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Stream finished after', chunkCount, 'chunks');
            break;
          }

          chunkCount++;
          const chunkText = leftover + decoder.decode(value, { stream: true });
          console.log(`Received chunk #${chunkCount}, length: ${chunkText.length}`);
          
          const lines = chunkText.split('\n');
          
          if (!chunkText.endsWith('\n')) {
             leftover = lines.pop() || ''; 
          } else {
             leftover = ''; 
          }

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonData = line.substring(6).trim();
              if (jsonData === '[DONE]') {
                console.log('Received [DONE] signal.');
              } else {
                try {
                  const parsed = JSON.parse(jsonData);
                  console.log('Parsed SSE JSON:', {
                    hasChoices: !!parsed.choices,
                    choicesLength: parsed.choices?.length,
                    hasDelta: !!parsed.choices?.[0]?.delta,
                    deltaContent: parsed.choices?.[0]?.delta?.content ? 
                      parsed.choices[0].delta.content.substring(0, 20) + '...' : 'none'
                  });
                  
                  // Check for error in the response
                  if (parsed.error) {
                    console.error('Error in SSE response:', parsed.error);
                    throw new Error(parsed.error.message || 'Error in API response');
                  }
                  
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (delta) {
                    accumulatedResponse += delta; 
                    console.log('Accumulated response length:', accumulatedResponse.length);

                    // Process code blocks with improved regex patterns
                    const htmlMatch = accumulatedResponse.match(/```html\n([\s\S]*?)(\n```|$)/);
                    const cssMatch = accumulatedResponse.match(/```css\n([\s\S]*?)(\n```|$)/);
                    const jsMatch = accumulatedResponse.match(/```javascript\n([\s\S]*?)(\n```|$)/);

                    // Process each code block type separately
                    if (htmlMatch) {
                      processCodeBlock(htmlMatch, 'html');
                    }
                    if (cssMatch) {
                      processCodeBlock(cssMatch, 'css');
                    }
                    if (jsMatch) {
                      processCodeBlock(jsMatch, 'js');
                    }
                  }
                } catch (e) {
                  console.error('Failed to parse SSE JSON:', jsonData, e);
                  
                  // Check if this is a rate limiting error
                  if (jsonData.includes('rate-limit') || jsonData.includes('capacity') || 
                      jsonData.includes('Provider returned error') || jsonData.includes('google/gemini')) {
                    setError('The AI models are currently experiencing high demand. Please try again in a few minutes or try with a text prompt instead.');
                    console.error('Error in SSE response:', jsonData);
                  }
                }
              }
            }
          }
        }
        
        // Add a function to validate and format code blocks
        const validateAndFormatCode = (content: string, type: 'html' | 'css' | 'js'): string => {
          switch (type) {
            case 'html':
              return content.includes('<!DOCTYPE') || content.includes('<html') 
                ? content 
                : `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Generated Website</title>\n</head>\n<body>\n${content}\n</body>\n</html>`;
            case 'css':
              return content.startsWith('/*') ? content : `/* Generated CSS */\n${content}`;
            case 'js':
              return content.startsWith('//') ? content : `// Generated JavaScript\n${content}`;
            default:
              return content;
          }
        };

        // Modify the final parse after stream ends
        const finalHtmlMatch = accumulatedResponse.match(/```html\n([\s\S]*?)```/);
        const finalCssMatch = accumulatedResponse.match(/```css\n([\s\S]*?)```/);
        const finalJsMatch = accumulatedResponse.match(/```javascript\n([\s\S]*?)```/);
        
        if (finalHtmlMatch) {
          const formattedHtml = validateAndFormatCode(finalHtmlMatch[1].trim(), 'html');
          setHtmlContent(formattedHtml);
        }
        if (finalCssMatch) {
          const formattedCss = validateAndFormatCode(finalCssMatch[1].trim(), 'css');
          setCssContent(formattedCss);
        }
        if (finalJsMatch) {
          const formattedJs = validateAndFormatCode(finalJsMatch[1].trim(), 'js');
          setJsContent(formattedJs);
        }
      }

    } catch (err) {
      console.error(`Error calling ${isImageInput ? 'Image-to-webgenerator' : 'Text-generate'} API:`, err);
      
      // Format the error message for better user experience
      let errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during website generation.';
      
      // Special handling for rate limiting errors
      if (errorMessage.includes('rate-limit') || 
          errorMessage.includes('capacity') || 
          errorMessage.includes('high demand') ||
          errorMessage.includes('Provider returned error')) {
        errorMessage = 'The AI models are currently experiencing high demand. Please try again in a few minutes or try with a text prompt instead.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsGenerating(false); // End generation
      
      // Save to history after generation completes
      if (user?.id) {
        try {
          console.log('Saving history with content:', {
            html: htmlContent,
            css: cssContent, 
            js: jsContent
          });
          
          // Verify content is set before saving
          console.log('Current content state before saving:', {
            html: htmlContent,
            css: cssContent,
            js: jsContent
          });
          
          const savedItem = await saveHistory(
            user.id,
            prompt,
            htmlContent,
            cssContent,
            jsContent,
            imagePreview || undefined
          );
          
          console.log('Saved history item:', savedItem);
          
          // Refresh history list
          const updatedHistory = await loadHistory(user.id);
          setHistoryItems(updatedHistory || []);
        } catch (err) {
          console.error('Error saving history:', err);
        }
      } else {
        console.warn('Cannot save history - no user ID');
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
        e.preventDefault();
        handlePromptSubmit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [prompt]);

  useEffect(() => {
    scrollToBottom('html-editor');
    scrollToBottom('css-editor');
    scrollToBottom('js-editor');
  }, [htmlContent, cssContent, jsContent]);

  // Add refs for the editor containers
  const htmlEditorRef = useRef<HTMLDivElement>(null);
  const cssEditorRef = useRef<HTMLDivElement>(null);
  const jsEditorRef = useRef<HTMLDivElement>(null);

  // Function to force scroll to bottom
  const forceScrollToBottom = (element: HTMLElement | null) => {
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  };

  // Modify the useEffect for scrolling
  useEffect(() => {
    if (isGenerating) {
      // Force scroll to bottom for all editors
      forceScrollToBottom(htmlEditorRef.current);
      forceScrollToBottom(cssEditorRef.current);
      forceScrollToBottom(jsEditorRef.current);
    }
  }, [htmlContent, cssContent, jsContent, isGenerating]);

  // Modify the code block processing section
  const processCodeBlock = (match: RegExpMatchArray | null, type: 'html' | 'css' | 'js') => {
    if (match) {
      const content = match[1].trim();
      if (type === 'html') {
        // Ensure HTML content is properly formatted
        const formattedHtml = content.startsWith('<!DOCTYPE') || content.startsWith('<html') 
          ? content 
          : `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Generated Website</title>\n</head>\n<body>\n${content}\n</body>\n</html>`;
        setHtmlContent(formattedHtml);
        setActiveTab('html');
        forceScrollToBottom(htmlEditorRef.current);
      } else if (type === 'css') {
        // Ensure CSS content is properly formatted
        const formattedCss = content.startsWith('/*') ? content : `/* Generated CSS */\n${content}`;
        setCssContent(formattedCss);
        setActiveTab('css');
        forceScrollToBottom(cssEditorRef.current);
      } else if (type === 'js') {
        // Ensure JavaScript content is properly formatted
        const formattedJs = content.startsWith('//') ? content : `// Generated JavaScript\n${content}`;
        setJsContent(formattedJs);
        setActiveTab('js');
        forceScrollToBottom(jsEditorRef.current);
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#1a1a2e] text-gray-300 relative w-full">
      <LoadingOverlay 
        isLoading={isNewChatLoading || isLogoLoading}
        message={isNewChatLoading ? "Loading new chat..." : "Loading page..."}
      />
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-700/50">
        <div className="flex items-center space-x-4">
          <div className="w-5 h-5 border-2 border-purple-500 rounded-full"></div>
          <div 
            onClick={() => setIsLogoLoading(true)}
            className="cursor-pointer"
          >
            <Link href="/">
              <span className="font-semibold text-md text-white hover:text-purple-300">WEBGPT</span>
            </Link>
          </div>
          <Button 
            size="sm"
            onClick={async () => {
              setIsNewChatLoading(true);
              await handleNewChat();
              setIsNewChatLoading(false);
            }}
            disabled={isNewChatLoading}
            className="text-xs px-4 py-1.5 h-auto bg-gradient-to-r from-purple-500 to-orange-500 hover:from-purple-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            {isNewChatLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-600" />
            ) : (
              'New Chat'
            )}
          </Button>
              <Button 
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowHistory(true);
                }}
                className="text-xs px-4 py-1.5 h-auto bg-gradient-to-r from-purple-500 to-orange-500 hover:from-purple-600 hover:to-orange-600 text-white shadow-lg hover:1px shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                History
              </Button>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative flex items-center space-x-2">
            <CircleUser className="w-5 h-5 text-purple-400" />
            <div 
              className="text-sm text-purple-300 cursor-pointer hover:text-purple-200"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              {user?.email?.split('@')[0] || 'Loading...'}
            </div>
            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 rounded-md shadow-lg z-10">
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden relative">
        {/* History Sidebar */}
        {showHistory && (
          <div 
            ref={historySidebarRef}
            className="absolute left-0 top-0 bottom-0 w-64 bg-[#161625] border-r border-gray-700/50 z-10 overflow-y-auto"
          >
            <div className="p-4 border-b border-gray-700/50 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-300">Your History</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-white text-lg"
              >
                &times;
              </button>
              <button
                onClick={async () => {
                  if (confirm('Are you sure you want to delete ALL history items? This cannot be undone.')) {
                    try {
                      if (user?.id) {
                        await deleteAllHistory(user.id);
                        setHistoryItems([]);
                      }
                    } catch (err) {
                      console.error('Error deleting all history:', err);
                      setError('Failed to delete all history items');
                    }
                  }
                }}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors"
                disabled={historyItems.length === 0}
              >
                Delete All
              </button>
            </div>
            <div className="divide-y divide-gray-700/50">
              {historyItems.map((item) => (
                <div 
                  key={item.id}
                  className="p-3 hover:bg-[#2c2c44] group relative"
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => loadHistoryItem(item)}
                  >
                    <div className="text-xs text-gray-300 truncate pr-6">
                      {item.prompt || 'Image-based generation'}
                    </div>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-purple-400">
                        {item.html_content ? 'HTML' : ''}
                      </span>
                      <span className="text-xs text-blue-400">
                        {item.css_content ? 'CSS' : ''}
                      </span>
                      <span className="text-xs text-yellow-400">
                        {item.js_content ? 'JS' : ''}
                      </span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this item?')) {
                        try {
                          await deleteHistoryItem(item.id);
                          setHistoryItems(prev => prev.filter(i => i.id !== item.id));
                        } catch (err) {
                          console.error('Error deleting history item:', err);
                          setError('Failed to delete history item');
                        }
                      }
                    }}
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              ))}
              {historyItems.length === 0 && (
                <div className="p-4 text-xs text-gray-500">
                  No history items yet
                </div>
              )}
            </div>
          </div>
        )}
        <div className="flex flex-col bg-[#161625] border-r border-gray-700/50 overflow-y-auto">
          <div className="p-4 space-y-3">
            {/* Input Type Toggle */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input type="radio" id="text-input" name="input-type" checked={!isImageInput} onChange={() => setIsImageInput(false)} className="h-3 w-3 text-purple-600"/>
                <label htmlFor="text-input" className="text-xs text-gray-300">Text Input</label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="radio" id="image-input" name="input-type" checked={isImageInput} onChange={() => setIsImageInput(true)} className="h-3 w-3 text-purple-600"/>
                <label htmlFor="image-input" className="text-xs text-gray-300">Image Input</label>
              </div>
            </div>

            {/* Conditional Input Area */}
            {isImageInput ? (
              // Image Input Mode
              <div 
                className="space-y-2"
                onPaste={(e) => {
                  const items = e.clipboardData.items;
                  for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (item.type.indexOf('image') !== -1) {
                      const blob = item.getAsFile();
                      if (blob) {
                        // Check file size before processing
                        if (blob.size > 10 * 1024 * 1024) { // 10MB limit
                          setError('Pasted image is too large. Maximum size is 10MB.');
                          return;
                        }
                        
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const result = event.target?.result as string;
                          setImagePreview(result);
                          setPrompt(''); // Clear text prompt when image is pasted
                          setImagePrompt(''); // Clear image text prompt too
                          setError(null); // Clear any previous errors
                          setIsImageInput(true); // Ensure image input mode is selected
                          console.log('Image pasted successfully, size:', result.length);
                        };
                        reader.onerror = () => {
                          setError('Failed to process the pasted image. Please try another image.');
                        };
                        reader.readAsDataURL(blob);
                      }
                      break;
                    }
                  }
                }}
              >
                <label className="block text-xs font-medium text-gray-400">Upload or Paste Image</label>
                <div className="text-xs text-purple-400 mb-1">
                  The AI will analyze your image and create a website based on it
                </div>
                <input
                  type="file" accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Check file size before processing
                      if (file.size > 10 * 1024 * 1024) { // 10MB limit
                        setError('Image file is too large. Maximum size is 10MB.');
                        return;
                      }
                      
                      // Check file type
                      if (!file.type.startsWith('image/')) {
                        setError('Selected file is not an image.');
                        return;
                      }
                      
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setImagePreview(event.target?.result as string);
                        setPrompt(''); // Clear text prompt when image is uploaded
                        setImagePrompt(''); // Clear image text prompt too
                        setError(null); // Clear any previous errors
                        setIsImageInput(true); // Ensure image input mode is selected
                      };
                      reader.onerror = () => {
                        setError('Failed to read the image file. Please try another image.');
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="block w-full text-xs text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                />
                {imagePreview ? (
                  <div className="mt-2">
                    <img src={imagePreview} alt="Preview" className="max-h-40 rounded-md border border-gray-600/50"/>
                    <div className="text-xs text-green-400 mt-1">✓ Image loaded successfully</div>
                  </div>
                ) : (
                  <div className="mt-2 p-2 border border-dashed border-gray-600/50 rounded-md text-center">
                    <div className="text-xs text-gray-500">No image selected</div>
                    <div className="text-xs text-gray-500 mt-1">You can also paste an image (Ctrl+V)</div>
                  </div>
                )}
                {/* Textarea for image context */}
                <Textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Add details or instructions for the image... (optional)"
                  className="w-full mt-2 p-2 rounded-md resize-none bg-[#2c2c44] border-gray-600/50 text-gray-300 placeholder-gray-500 focus:border-purple-500/50 focus:ring-0 text-sm"
                  rows={2}
                />
              </div>
            ) : (
              // Text Input Mode
              <div className="relative">
                <Textarea
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    setImagePreview(null); // Clear image when typing
                    setImagePrompt(''); // Clear image text prompt too
                  }}
                  placeholder="Describe your website..."
                  className="w-full p-2 pr-12 rounded-md resize-none bg-[#2c2c44] border-gray-600/50 text-gray-300 placeholder-gray-500 focus:border-purple-500/50 focus:ring-0 text-sm"
                  rows={3}
                />
              </div>
            )}
             {/* Submit Button - Common for both modes */}
             <div className="flex justify-end pt-2">
                 <Button
                   size="sm"
                   onClick={handlePromptSubmit}
                   disabled={isLoading || (isImageInput ? !imagePreview : !prompt.trim())}
                   className={`px-4 py-1.5 rounded-md bg-purple-600 text-white transition-all duration-150 text-sm ${
                     isLoading || (isImageInput ? !imagePreview : !prompt.trim())
                       ? 'opacity-50 cursor-not-allowed'
                       : 'hover:bg-purple-700'
                   }`}
                 >
                   {isLoading ? (
                     <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                   ) : (
                     <Send className="w-4 h-4 mr-2" />
                   )}
                   {isImageInput 
                     ? (imagePreview ? "Generate from Image" : "Upload an Image First") 
                     : "Generate from Description"}
                 </Button>
             </div>
          </div>

          {/* Code Editor Section */}
          <div className="flex-1 flex flex-col min-h-0 border-t border-gray-700/50 mt-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="bg-[#161625] border-b border-gray-700/50 rounded-none justify-start px-2 h-8">
                <TabsTrigger value="html" className="text-gray-400 data-[state=active]:bg-[#2c2c44] data-[state=active]:text-white text-xs px-3 py-1 h-full rounded-t-md rounded-b-none">HTML</TabsTrigger>
                <TabsTrigger value="css" className="text-gray-400 data-[state=active]:bg-[#2c2c44] data-[state=active]:text-white text-xs px-3 py-1 h-full rounded-t-md rounded-b-none">CSS</TabsTrigger>
                <TabsTrigger value="js" className="text-gray-400 data-[state=active]:bg-[#2c2c44] data-[state=active]:text-white text-xs px-3 py-1 h-full rounded-t-md rounded-b-none">JavaScript</TabsTrigger>
              </TabsList>
              <TabsContent value="html" className="flex-1 overflow-auto m-0 p-0 relative">
                <div 
                  className="absolute inset-0" 
                  ref={htmlEditorRef} 
                  id="html-editor"
                  style={{ overflowY: 'auto' }}
                >
                  <CodeMirrorEditor
                    key={`html-${editorKey}`}
                    value={htmlContent}
                    onChange={(value: string) => updateTabContent('html', value)}
                    language="html"
                  />
                </div>
              </TabsContent>
              <TabsContent value="css" className="flex-1 overflow-auto m-0 p-0 relative">
                <div 
                  className="absolute inset-0" 
                  ref={cssEditorRef} 
                  id="css-editor"
                  style={{ overflowY: 'auto' }}
                >
                  <CodeMirrorEditor
                    key={`css-${editorKey}`}
                    value={cssContent}
                    onChange={(value: string) => updateTabContent('css', value)}
                    language="css"
                  />
                </div>
              </TabsContent>
              <TabsContent value="js" className="flex-1 overflow-auto m-0 p-0 relative">
                <div 
                  className="absolute inset-0" 
                  ref={jsEditorRef} 
                  id="js-editor"
                  style={{ overflowY: 'auto' }}
                >
                  <CodeMirrorEditor
                    key={`js-${editorKey}`}
                    value={jsContent}
                    onChange={(value: string) => updateTabContent('js', value)}
                    language="javascript"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
          {/* Error Display */}
          {error && (
            <div className="px-4 py-2 border-t border-red-800/50 bg-red-900/20 text-red-400 text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Right Panel (Preview) */}
        <div className="flex flex-col bg-white overflow-hidden relative h-[50vh] md:h-auto" style={{ minWidth: '300px' }}>
          <div
            className="flex-1 relative"
            style={{ width: '100%', minWidth: '300px' }}
            ref={previewContainerRef}
          >
            <Preview
              html={htmlContent
                .replace('href="styles.css"', '')
                .replace('src="script.js"', '')}
              css={cssContent}
              js={jsContent}
            />
            <div
              className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize bg-gray-300 hover:bg-purple-500 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const container = previewContainerRef.current;
                const leftContainer = leftSideContainerRef.current;
                if (!container || !leftContainer) return;
                
                const startWidth = container.clientWidth;
                const startLeftWidth = leftContainer.clientWidth;
                
                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const newWidth = Math.max(300, Math.min(window.innerWidth - 100, startWidth + (startX - moveEvent.clientX)));
                  const newLeftWidth = window.innerWidth - newWidth;
                  container.style.width = `${newWidth}px`;
                  leftContainer.style.width = `${newLeftWidth}px`;
                };

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
          </div>
          <div className="absolute top-2 right-2">
            <Button 
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading || !htmlContent}
              className="text-xs px-4 py-2 h-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download Code
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
