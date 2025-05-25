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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
  const jsContentRef = useRef<string>('// JavaScript code will appear here');
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  }, [showHistory]);


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
      // Clean up any pending timeouts
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
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
    setSuccessMessage(null);
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

                const htmlMatch = accumulatedResponse.match(/```html\n([\s\S]*?)(\n```|$)/);
                const cssMatch = accumulatedResponse.match(/```css\n([\s\S]*?)(\n```|$)/);
                const jsMatch = accumulatedResponse.match(/```javascript\n([\s\S]*?)(\n```|$)/);

                if (htmlMatch) {
                  const newHtml = htmlMatch[1].trim();
                  if (newHtml) setHtmlContent(newHtml);
                  setActiveTab('html');
                }
                if (cssMatch) {
                  const newCss = cssMatch[1].trim();
                  if (newCss) setCssContent(newCss);
                  setActiveTab('css');
                }
                if (jsMatch) {
                  const newJs = jsMatch[1].trim();
                  if (newJs) setJsContent(newJs);
                  setActiveTab('js');
                }
              }
            } catch (e) {
              console.error('Failed to parse SSE JSON:', jsonData, e);
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
    // Clear any previous errors and success messages
    setError(null);
    setSuccessMessage(null);
    
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
      let requestBody;
      if (isImageInput && imagePreview) {
        // For image input, ensure proper formatting
        // Keep the full data URL for MIME type detection in the API
        const base64Data = imagePreview.startsWith('data:') ? 
          imagePreview : 
          `data:image/png;base64,${imagePreview}`;
        
        console.log('Preparing image data for API request:', {
          hasImagePreview: !!imagePreview,
          imagePreviewLength: imagePreview ? imagePreview.length : 0,
          startsWithDataUrl: imagePreview ? imagePreview.startsWith('data:') : false,
          imagePromptLength: imagePrompt ? imagePrompt.length : 0
        });
        
        requestBody = {
          imageData: base64Data,
          prompt: imagePrompt
        };
      } else {
        // For text input - simplify to match the text-generate API expectations
        requestBody = {
          prompt: prompt
        };
      }

      // Validate request data
      if (isImageInput) {
        // For image input, we need imageData
        if (!requestBody.imageData) {
          throw new Error('No image data available.');
        }
        // prompt is optional for image input
      } else {
        // For text input, we need prompt
        if (!requestBody.prompt) {
          throw new Error('Please enter a website description.');
        }
      }

      // Use different endpoints based on input type
      const endpoint = isImageInput ? '/api/gemini' : '/api/text-generate';
      console.log(`Using endpoint: ${endpoint} for ${isImageInput ? 'image' : 'text'} input`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMsg = `API request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
          console.error('Gemini API error response:', errorData);
        } catch (jsonError) {
          try {
             const errorText = await response.text();
             console.error("Non-JSON error response from Gemini API:", errorText);
             errorMsg = errorText ? `API Error: ${errorText.substring(0, 100)}` : errorMsg; 
          } catch (textError) {
             console.error("Failed to read error response body from Gemini API:", textError);
          }
        }
        throw new Error(errorMsg);
      }
      
      console.log(`${isImageInput ? 'Gemini' : 'Text-generate'} API request successful`);

      if (isImageInput) {
        // For the Gemini API route, we get a direct JSON response with html, css, and js
        const responseData = await response.json();
        console.log('Received response data:', {
          hasHtml: !!responseData.html,
          hasCss: !!responseData.css,
          hasJs: !!responseData.js,
          htmlLength: responseData.html?.length || 0,
          cssLength: responseData.css?.length || 0,
          jsLength: responseData.js?.length || 0
        });
        
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
          throw new Error('No content was generated. Please try again with a different image or prompt.');
        }
      } else {
        // For text-generate API, we get a streaming response
        if (!response.body) {
          throw new Error('Response body is null');
        }

        // Process the SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedResponse = ''; 
        let leftover = ''; 
        let streamTimeout: NodeJS.Timeout | null = null;

        // Set a timeout for the stream
        const resetTimeout = () => {
          if (streamTimeout) clearTimeout(streamTimeout);
          streamTimeout = setTimeout(() => {
            console.warn('Stream timeout - forcing completion');
            reader.cancel();
          }, 30000); // 30 second timeout
        };

        resetTimeout();

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Stream finished.');
            if (streamTimeout) clearTimeout(streamTimeout);
            break;
          }

          resetTimeout(); // Reset timeout on each chunk

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
              if (jsonData === '[DONE]') {
                console.log('Received [DONE] signal.');
              } else {
                try {
                  const parsed = JSON.parse(jsonData);
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (delta) {
                    accumulatedResponse += delta; 

                    // Re-parse the accumulated response to update code blocks
                    // Use multiple regex patterns to catch different code block formats
                    const htmlMatch = accumulatedResponse.match(/```html\s*\n([\s\S]*?)(\n```|$)/) ||
                                     accumulatedResponse.match(/```HTML\s*\n([\s\S]*?)(\n```|$)/);
                    const cssMatch = accumulatedResponse.match(/```css\s*\n([\s\S]*?)(\n```|$)/) ||
                                    accumulatedResponse.match(/```CSS\s*\n([\s\S]*?)(\n```|$)/) ||
                                    // Also try to extract CSS that might be embedded or incomplete
                                    accumulatedResponse.match(/```css\s*\n([\s\S]*?)(?=\n```javascript|$)/);
                    const jsMatch = accumulatedResponse.match(/```javascript\s*\n([\s\S]*?)(\n```|$)/) ||
                                   accumulatedResponse.match(/```js\s*\n([\s\S]*?)(\n```|$)/) ||
                                   accumulatedResponse.match(/```JavaScript\s*\n([\s\S]*?)(\n```|$)/) ||
                                   accumulatedResponse.match(/```JS\s*\n([\s\S]*?)(\n```|$)/);

                    // Determine which content is currently being generated based on the stream position
                    const htmlComplete = htmlMatch && htmlMatch[2] === '\n```';
                    const cssBlockEnd = accumulatedResponse.indexOf('```', accumulatedResponse.indexOf('```css') + 6);
                    const cssComplete = cssMatch && (cssMatch[2] === '\n```' || (cssBlockEnd !== -1 && cssBlockEnd < accumulatedResponse.indexOf('```javascript')));
                    const jsStarted = accumulatedResponse.includes('```javascript') || accumulatedResponse.includes('```js');
                    
                    // Debug logging for streaming state
                    if (cssMatch || jsMatch) {
                      console.log('Streaming state:', {
                        htmlComplete,
                        cssComplete,
                        jsStarted,
                        cssLength: cssMatch?.[1]?.length || 0,
                        jsLength: jsMatch?.[1]?.length || 0,
                        cssBlockEnd,
                        currentTab: activeTab
                      });
                    }

                    if (htmlMatch && htmlMatch[1]) {
                      const newHtml = htmlMatch[1].trim();
                      if (newHtml) {
                        setHtmlContent(newHtml);
                        // Only switch to HTML tab if we're still generating HTML and haven't started CSS
                        if (!cssMatch && !jsStarted) {
                          setActiveTab('html');
                        }
                      }
                    }
                    if (cssMatch && cssMatch[1]) {
                      const newCss = cssMatch[1].trim();
                      if (newCss) {
                        setCssContent(newCss);
                        // Switch to CSS tab when CSS content is being generated, but only if JS hasn't started or CSS isn't complete
                        if (!jsStarted || !cssComplete) {
                          setActiveTab('css');
                        }
                      }
                    }
                    if (jsMatch && jsMatch[1]) {
                      const newJs = jsMatch[1].trim();
                      if (newJs && newJs !== '// JavaScript code will appear here') {
                        jsContentRef.current = newJs; // Store in ref
                        
                        // Debounce JavaScript updates to prevent syntax errors during streaming
                        if (updateTimeoutRef.current) {
                          clearTimeout(updateTimeoutRef.current);
                        }
                        
                        updateTimeoutRef.current = setTimeout(() => {
                          // Only update if the JavaScript looks complete (basic validation)
                          const braceCount = (newJs.match(/\{/g) || []).length - (newJs.match(/\}/g) || []).length;
                          if (braceCount === 0 || newJs.includes('});')) {
                            setJsContent(newJs);
                            console.log('Streaming JavaScript content updated:', newJs.substring(0, 100) + '...');
                            // Only switch to JS tab if CSS appears to be complete or if we have substantial JS content
                            if (cssComplete || newJs.length > 200) {
                              setActiveTab('js');
                            }
                          }
                        }, 500); // 500ms debounce
                      }
                    }
                  }
                } catch (e) {
                  console.error('Failed to parse SSE JSON:', jsonData, e);
                }
              }
            }
          }
        }
        
        // Final parse after stream ends to ensure complete blocks are captured
        const finalHtmlMatch = accumulatedResponse.match(/```html\s*\n([\s\S]*?)```/) ||
                              accumulatedResponse.match(/```HTML\s*\n([\s\S]*?)```/) ||
                              // Try to extract incomplete HTML
                              accumulatedResponse.match(/```html\s*\n([\s\S]*?)$/);
        
        const finalCssMatch = accumulatedResponse.match(/```css\s*\n([\s\S]*?)```/) ||
                             accumulatedResponse.match(/```CSS\s*\n([\s\S]*?)```/) ||
                             // Try to extract incomplete CSS (very common issue)
                             accumulatedResponse.match(/```css\s*\n([\s\S]*?)$/) ||
                             // Also try to find CSS content that might be cut off
                             (() => {
                               const cssStart = accumulatedResponse.indexOf('```css');
                               if (cssStart !== -1) {
                                 const cssContent = accumulatedResponse.substring(cssStart + 6).replace(/^\s*\n/, '');
                                 const cssEnd = cssContent.indexOf('```');
                                 return [null, cssEnd !== -1 ? cssContent.substring(0, cssEnd) : cssContent];
                               }
                               return null;
                             })();
        
        // Try multiple patterns for JavaScript
        let finalJsMatch = accumulatedResponse.match(/```javascript\s*\n([\s\S]*?)```/) ||
                          accumulatedResponse.match(/```js\s*\n([\s\S]*?)```/) ||
                          accumulatedResponse.match(/```JavaScript\s*\n([\s\S]*?)```/) ||
                          accumulatedResponse.match(/```JS\s*\n([\s\S]*?)```/) ||
                          // Try to extract incomplete JavaScript
                          accumulatedResponse.match(/```javascript\s*\n([\s\S]*?)$/) ||
                          accumulatedResponse.match(/```js\s*\n([\s\S]*?)$/);
        
        const finalHtml = finalHtmlMatch?.[1]?.trim() || '';
        let finalCss = finalCssMatch?.[1]?.trim() || '';
        let finalJs = finalJsMatch?.[1]?.trim() || '';
        
        console.log('Final regex matches found:', {
          htmlMatch: !!finalHtmlMatch,
          cssMatch: !!finalCssMatch,
          jsMatch: !!finalJsMatch
        });
        
        // Debug: Show parts of accumulated response to understand the format
        console.log('Accumulated response sample (last 500 chars):', 
          accumulatedResponse.slice(-500));
        
        console.log('Initial content lengths:', {
          html: finalHtml.length,
          css: finalCss.length,
          js: finalJs.length
        });
        
        // If no JavaScript found, try to extract from the last known good content
        if (!finalJs && jsContentRef.current && jsContentRef.current !== '// JavaScript code will appear here') {
          finalJs = jsContentRef.current;
          console.log('Using JavaScript from ref, length:', finalJs.length);
        }
        
        // If no CSS found, try to extract from the accumulated response or provide fallback
        if (!finalCss && finalHtml) {
          // Try to find CSS-like content in the response
          const cssLikeContent = accumulatedResponse.match(/([^`]*(?:body|\.[\w-]+|#[\w-]+)[^`]*{[^}]*}[^`]*)/g);
          if (cssLikeContent && cssLikeContent.length > 0) {
            finalCss = cssLikeContent.join('\n');
            console.log('Extracted CSS-like content from response');
          } else {
            // Provide a comprehensive fallback CSS
            finalCss = `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
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

h1, h2, h3, h4, h5, h6 {
    margin-bottom: 1rem;
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

p {
    margin-bottom: 1rem;
}

button {
    background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.3s ease;
}

button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

a {
    color: #4ecdc4;
    text-decoration: none;
    transition: color 0.3s ease;
}

a:hover {
    color: #ff6b6b;
}

section {
    background: rgba(255, 255, 255, 0.1);
    padding: 30px;
    margin: 20px 0;
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
    
    section {
        padding: 20px;
        margin: 10px 0;
    }
}`;
            console.log('Using comprehensive fallback CSS');
          }
        }
        
        // If still no JavaScript, provide a basic fallback
        if (!finalJs && (finalHtml || finalCss)) {
          finalJs = `document.addEventListener('DOMContentLoaded', function() {
    console.log('Website loaded successfully');
    
    // Add basic interactivity
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => this.style.transform = 'scale(1)', 150);
        });
    });
    
    // Smooth scrolling for anchor links
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
    
    // Add hover effects to sections
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
          console.log('Using fallback JavaScript');
        }
        
        console.log('Final JavaScript content:', finalJs);
        
        console.log('Final processed content lengths:', {
          html: finalHtml.length,
          css: finalCss.length,
          js: finalJs.length
        });

        // Always update content to ensure it's properly set
        if (finalHtml) {
          setHtmlContent(finalHtml);
          console.log('HTML content updated, length:', finalHtml.length);
        }
        if (finalCss) {
          setCssContent(finalCss);
          console.log('CSS content updated, length:', finalCss.length);
        }
        if (finalJs) {
          jsContentRef.current = finalJs; // Store in ref
          setJsContent(finalJs);
          console.log('JavaScript content updated, length:', finalJs.length);
          console.log('JavaScript content preview:', finalJs.substring(0, 100) + '...');
        }

        // Set final tab based on what content we have
        if (finalJs) {
          setActiveTab('js');
        } else if (finalCss) {
          setActiveTab('css');
        } else if (finalHtml) {
          setActiveTab('html');
        }

        // Clear any previous errors since we now have fallbacks
        setError(null);
        if (finalHtml && finalCss && finalJs) {
          setSuccessMessage('Website generated successfully with all components!');
        }
      }

    } catch (err) {
      console.error(`Error calling ${isImageInput ? 'Gemini' : 'Text-generate'} API:`, err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during website generation.');
    } finally {
      setIsLoading(false);
      
      // Save to history after generation completes - use a timeout to ensure state is updated
      setTimeout(async () => {
        if (user?.id) {
          try {
            // Get the latest content from refs or state
            const currentHtml = htmlContent || '<!-- HTML code will appear here -->';
            const currentCss = cssContent || '/* CSS code will appear here */';
            const currentJs = jsContentRef.current || jsContent || '// JavaScript code will appear here';
            
            console.log('Saving history with content:', {
              html: currentHtml.length,
              css: currentCss.length, 
              js: currentJs.length
            });
            
            // Only save if we have actual content (not default placeholders)
            if (currentHtml.length > 50 || currentCss.length > 50 || currentJs.length > 50) {
              const savedItem = await saveHistory(
                user.id,
                isImageInput ? imagePrompt : prompt,
                currentHtml,
                currentCss,
                currentJs,
                imagePreview || undefined
              );
              
              console.log('Saved history item:', savedItem);
              
              // Refresh history list
              const updatedHistory = await loadHistory(user.id);
              setHistoryItems(updatedHistory || []);
            } else {
              console.log('Skipping save - no meaningful content generated');
            }
          } catch (err) {
            console.error('Error saving history:', err);
          }
        } else {
          console.warn('Cannot save history - no user ID');
        }
      }, 1000); // Wait 1 second for state to settle
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

  // Debug effect to monitor JavaScript content changes
  useEffect(() => {
    console.log('JavaScript content changed:', {
      length: jsContent.length,
      preview: jsContent.substring(0, 100) + (jsContent.length > 100 ? '...' : ''),
      isDefault: jsContent === '// JavaScript code will appear here',
      timestamp: new Date().toISOString()
    });
    
    // Additional check for content loss
    if (jsContent === '// JavaScript code will appear here' && isLoading === false) {
      console.warn('JavaScript content reverted to default after loading completed');
    }
  }, [jsContent, isLoading]);

  return (
    <div className="flex flex-col min-h-screen bg-[#1a1a2e] text-gray-300 relative w-full">
      <LoadingOverlay 
        isLoading={isNewChatLoading || isLogoLoading}
        message={isNewChatLoading ? "Loading new chat..." : "Loading page..."}
      />
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-700/50">
        <div className="flex items-center space-x-4">
          <img src="/webgptlogo.png" alt="WebGPT Logo" className="w-5 h-5 rounded-full" />
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
                className="text-xs px-4 py-1.5 h-auto bg-gradient-to-r from-purple-500 to-orange-500 hover:from-purple-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
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
            <div className="p-4 border-b border-gray-700/50">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-300">Your History</h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-400 hover:text-white text-lg"
                >
                  &times;
                </button>
              </div>
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
                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors w-full"
                disabled={historyItems.length === 0}
              >
                Delete All History
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
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setImagePreview(event.target?.result as string);
                          setPrompt(''); // Clear text prompt when image is pasted
                          setImagePrompt(''); // Clear image text prompt too
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
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setImagePreview(event.target?.result as string);
                        setPrompt(''); // Clear text prompt when image is uploaded
                        setImagePrompt(''); // Clear image text prompt too
                        setError(null); // Clear any previous errors
                        setSuccessMessage(null); // Clear any previous success messages
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
                <div className="absolute inset-0" ref={htmlEditorContainerRef} id="html-editor">
                  <CodeMirrorEditor
                    key={`html-${editorKey}`}
                    value={htmlContent}
                    onChange={(value: string) => updateTabContent('html', value)}
                    language="html"
                  />
                </div>
              </TabsContent>
              <TabsContent value="css" className="flex-1 overflow-auto m-0 p-0 relative">
                <div className="absolute inset-0" ref={cssEditorContainerRef} id="css-editor">
                  <CodeMirrorEditor
                    key={`css-${editorKey}`}
                    value={cssContent}
                    onChange={(value: string) => updateTabContent('css', value)}
                    language="css"
                  />
                </div>
              </TabsContent>
              <TabsContent value="js" className="flex-1 overflow-auto m-0 p-0 relative">
                <div className="absolute inset-0" ref={jsEditorContainerRef} id="js-editor">
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
          {/* Success Message Display */}
          {successMessage && (
            <div className="px-4 py-2 border-t border-green-800/50 bg-green-900/20 text-green-400 text-xs">
              {successMessage}
            </div>
          )}
        </div>

        {/* Right Panel (Preview) */}
        <div className="flex flex-col bg-white overflow-hidden relative h-[50vh] md:h-auto">
          <div className="flex-1 relative">
            <Preview html={htmlContent} css={cssContent} js={jsContent} />
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
