"use client"

interface PreviewProps {
  html: string
  css: string
  js: string
}

export default function Preview({ html, css, js }: PreviewProps) {
  const iframeContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>${css}</style>
        <script>
          try {
            document.addEventListener('DOMContentLoaded', function() {
              ${js}
            });
          } catch (e) {
            console.error('Error executing JavaScript:', e);
          }
        </script>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `

  return (
    <div className="h-full bg-white">
      <iframe
        srcDoc={iframeContent}
        title="preview"
        className="w-full h-full border-0"
        sandbox="allow-scripts"
      />
    </div>
  )
}
