"use client"

interface PreviewProps {
  html: string
  css: string
  js: string
}

export default function Preview({ html, css, js }: PreviewProps) {
  // Clean and validate JavaScript content with improved validation
  const cleanJs = js ? js.trim() : '';
  
  // Enhanced JavaScript validation
  const isValidJs = (jsCode: string): boolean => {
    if (!jsCode || jsCode === '// JavaScript code will appear here') return false;
    
    // Skip validation for very short code snippets that are likely incomplete
    if (jsCode.length < 10) return false;
    
    try {
      // Count braces, parentheses, and brackets
      let braceCount = 0;
      let parenCount = 0;
      let bracketCount = 0;
      let inString = false;
      let inComment = false;
      let stringChar = '';
      
      for (let i = 0; i < jsCode.length; i++) {
        const char = jsCode[i];
        const nextChar = jsCode[i + 1];
        
        // Handle string literals
        if (!inComment && (char === '"' || char === "'" || char === '`')) {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar && jsCode[i - 1] !== '\\') {
            inString = false;
            stringChar = '';
          }
          continue;
        }
        
        // Handle comments
        if (!inString) {
          if (char === '/' && nextChar === '/') {
            inComment = true;
            continue;
          }
          if (char === '\n' && inComment) {
            inComment = false;
            continue;
          }
          if (inComment) continue;
        }
        
        // Count brackets only outside strings and comments
        if (!inString && !inComment) {
          if (char === '{') braceCount++;
          else if (char === '}') braceCount--;
          else if (char === '(') parenCount++;
          else if (char === ')') parenCount--;
          else if (char === '[') bracketCount++;
          else if (char === ']') bracketCount--;
        }
      }
      
      // Allow slightly unbalanced braces for streaming content
      const isBalanced = Math.abs(braceCount) <= 1 && Math.abs(parenCount) <= 1 && Math.abs(bracketCount) <= 1;
      
      // Check for common complete patterns
      const hasCompleteFunction = jsCode.includes('function') && jsCode.includes('}');
      const hasCompleteEventListener = jsCode.includes('addEventListener') && jsCode.includes('}');
      const hasCompleteDocumentReady = jsCode.includes('DOMContentLoaded') || jsCode.includes('document.ready');
      
      // Consider valid if balanced and has some complete patterns
      return isBalanced && (hasCompleteFunction || hasCompleteEventListener || hasCompleteDocumentReady || jsCode.includes(';'));
      
    } catch (e) {
      console.warn('JavaScript validation error:', e);
      return false;
    }
  };
  
  // Use JavaScript if it passes validation, otherwise provide a safe fallback
  const safeJs = isValidJs(cleanJs) ? cleanJs : (cleanJs.length > 0 ? `
    // Fallback JavaScript execution with error handling
    try {
      ${cleanJs}
    } catch (e) {
      console.warn('JavaScript execution error:', e);
    }
  ` : '');
  
  // Enhanced HTML cleaning - preserve more content but remove dangerous elements
  const cleanHtml = html ? html
    // Remove external script tags but keep inline ones
    .replace(/<script[^>]*src[^>]*><\/script>/gi, '')
    // Remove potentially dangerous attributes
    .replace(/\son\w+\s*=/gi, '')
    // Clean up any remaining script tags that might interfere
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, (match) => {
      // Keep script tags that don't have src attributes (inline scripts)
      if (!match.includes('src=')) {
        return ''; // Remove inline scripts as we handle JS separately
      }
      return '';
    })
    // Remove style tags as we handle CSS separately
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove link tags for external stylesheets
    .replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '')
    : '';
  
  // Enhanced CSS processing
  const cleanCss = css ? css
    // Remove any @import statements that might cause issues
    .replace(/@import[^;]+;/gi, '')
    // Ensure all URLs are properly handled
    .replace(/url\(['"]?([^'"()]+)['"]?\)/gi, (match, url) => {
      // Skip data URLs and relative URLs
      if (url.startsWith('data:') || url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
        return match;
      }
      // For external URLs, provide a fallback or remove
      console.warn('External URL in CSS removed:', url);
      return 'url()';
    })
    : '';
  
  // Create the iframe content with enhanced error handling and compatibility
  const iframeContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <style>
          /* Reset and base styles for better compatibility */
          * {
            box-sizing: border-box;
          }
          
          /* Injected CSS */
          ${cleanCss}
          
          /* Fallback styles for better preview experience */
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
          }
          
          img {
            max-width: 100%;
            height: auto;
          }
          
          /* Ensure responsive behavior */
          .container, .wrapper, .main {
            max-width: 100%;
            overflow-x: hidden;
          }
        </style>
        <script>
          // Enhanced error handling and compatibility
          (function() {
            'use strict';
            
            // Global error handler
            window.addEventListener('error', function(e) {
              if (e.target && e.target.tagName === 'IMG') {
                console.warn('Image failed to load:', e.target.src);
                // Replace with a better placeholder
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIiBzdHJva2U9IiNkZGQiIHN0cm9rZS13aWR0aD0iMiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+';
                e.target.alt = 'Image not found';
                e.target.style.border = '1px solid #ddd';
                e.target.style.backgroundColor = '#f9f9f9';
                e.preventDefault();
                return false;
              } else if (e.target && e.target.tagName === 'SCRIPT') {
                console.warn('External script failed to load:', e.target.src);
                if (e.target.parentNode) {
                  e.target.parentNode.removeChild(e.target);
                }
                e.preventDefault();
                return false;
              } else if (e.target && e.target.tagName === 'LINK') {
                console.warn('External stylesheet failed to load:', e.target.href);
                e.preventDefault();
                return false;
              }
              
              // Log other errors but don't prevent them
              console.warn('Preview error:', e.error || e.message);
            }, true);
            
            // Handle unhandled promise rejections
            window.addEventListener('unhandledrejection', function(e) {
              console.warn('Unhandled promise rejection in preview:', e.reason);
              e.preventDefault();
            });
            
            // Polyfills for better compatibility
            if (!window.requestAnimationFrame) {
              window.requestAnimationFrame = function(callback) {
                return setTimeout(callback, 16);
              };
            }
            
            if (!window.cancelAnimationFrame) {
              window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
              };
            }
            
            // Enhanced user script execution
            function executeUserScript() {
              try {
                // Create a safe execution context
                ${safeJs}
              } catch (e) {
                console.error('Error executing user JavaScript:', e);
                // Don't break the page, just log the error
              }
            }
            
            // Execute user script when DOM is ready
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', executeUserScript);
            } else {
              // DOM is already loaded, execute immediately
              setTimeout(executeUserScript, 0);
            }
            
            // Additional compatibility fixes
            document.addEventListener('DOMContentLoaded', function() {
              // Fix any broken links
              const links = document.querySelectorAll('a[href^="http"]');
              links.forEach(function(link) {
                link.addEventListener('click', function(e) {
                  e.preventDefault();
                  console.log('External link clicked:', link.href);
                });
              });
              
              // Ensure forms don't actually submit
              const forms = document.querySelectorAll('form');
              forms.forEach(function(form) {
                form.addEventListener('submit', function(e) {
                  e.preventDefault();
                  console.log('Form submission prevented in preview');
                });
              });
              
              // Add smooth scrolling for anchor links
              const anchorLinks = document.querySelectorAll('a[href^="#"]');
              anchorLinks.forEach(function(link) {
                link.addEventListener('click', function(e) {
                  const target = document.querySelector(link.getAttribute('href'));
                  if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth' });
                  }
                });
              });
            });
          })();
        </script>
      </head>
      <body>
        ${cleanHtml}
      </body>
    </html>
  `;

  return (
    <div className="h-full bg-white">
      <iframe
        srcDoc={iframeContent}
        title="Website Preview"
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-top-navigation-by-user-activation"
        loading="lazy"
        style={{
          backgroundColor: 'white',
          minHeight: '100%'
        }}
      />
    </div>
  )
}
