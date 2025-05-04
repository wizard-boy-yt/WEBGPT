"use client"

import { useState, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Download, Trash2, Copy, Play, Pause } from "lucide-react"
import CodeMirrorEditor from "./code-mirror-editor"
import { demoSnippets } from "./demo-snippets"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function CodeEditor() {
  const [activeTab, setActiveTab] = useState("html")
  const [htmlCode, setHtmlCode] = useState(
    '<div class="demo">\n  <h1>Hello ZenSite!</h1>\n  <p>Edit this code to see live changes</p>\n  <button id="clickMe">Click me!</button>\n</div>',
  )
  const [cssCode, setCssCode] = useState(
    ".demo {\n  font-family: sans-serif;\n  max-width: 500px;\n  margin: 2rem auto;\n  padding: 2rem;\n  border-radius: 8px;\n  background-color: #2a2a2a;\n  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);\n  text-align: center;\n}\n\nh1 {\n  color: #8b5cf6;\n  margin-bottom: 1rem;\n}\n\np {\n  color: #e2e2e2;\n  margin-bottom: 1.5rem;\n}\n\nbutton {\n  background-color: #8b5cf6;\n  color: white;\n  border: none;\n  padding: 0.5rem 1rem;\n  border-radius: 4px;\n  cursor: pointer;\n  transition: background-color 0.3s;\n}\n\nbutton:hover {\n  background-color: #7c3aed;\n}",
  )
  const [jsCode, setJsCode] = useState(
    '// Add your JavaScript here\ndocument.getElementById("clickMe").addEventListener("click", function() {\n  alert("Button clicked!");\n});',
  )

  const [combinedCode, setCombinedCode] = useState("")
  const [isDemoMode, setIsDemoMode] = useState(true) // Start demo automatically
  const [demoState, setDemoState] = useState({
    currentPhase: "idle", // idle, typing-html, typing-css, typing-js, pausing
    currentSnippetIndex: 0,
    currentCharIndex: 0,
    typingSpeed: 50, // ms per character - Increased for performance
    pauseDuration: 3000, // ms to pause after completion
  })

  const demoTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Update combined code whenever any code changes
  useEffect(() => {
    const newCombinedCode = `
      <html>
        <head>
          <style>${cssCode}</style>
        </head>
        <body class="dark-theme">
          ${htmlCode}
          <script>${jsCode}</script>
        </body>
      </html>
    `
    setCombinedCode(newCombinedCode)
  }, [htmlCode, cssCode, jsCode])

  // Demo mode logic
  useEffect(() => {
    if (!isDemoMode) {
      if (demoTimerRef.current) {
        clearTimeout(demoTimerRef.current)
        demoTimerRef.current = null
      }
      return
    }

    const runDemoStep = () => {
      const { currentPhase, currentSnippetIndex, currentCharIndex, typingSpeed, pauseDuration } = demoState

      if (currentPhase === "idle") {
        // Start with HTML
        setActiveTab("html")
        setDemoState((prev) => ({ ...prev, currentPhase: "typing-html", currentCharIndex: 0 }))
        demoTimerRef.current = setTimeout(runDemoStep, 500)
      } else if (currentPhase === "typing-html") {
        const targetCode = demoSnippets.html[currentSnippetIndex]
        if (currentCharIndex < targetCode.length) {
          setHtmlCode(targetCode.substring(0, currentCharIndex + 1))
          setDemoState((prev) => ({ ...prev, currentCharIndex: prev.currentCharIndex + 1 }))
          demoTimerRef.current = setTimeout(runDemoStep, typingSpeed)
        } else {
          // Move to CSS
          setActiveTab("css")
          setDemoState((prev) => ({ ...prev, currentPhase: "typing-css", currentCharIndex: 0 }))
          demoTimerRef.current = setTimeout(runDemoStep, 500)
        }
      } else if (currentPhase === "typing-css") {
        const targetCode = demoSnippets.css[currentSnippetIndex]
        if (currentCharIndex < targetCode.length) {
          setCssCode(targetCode.substring(0, currentCharIndex + 1))
          setDemoState((prev) => ({ ...prev, currentCharIndex: prev.currentCharIndex + 1 }))
          demoTimerRef.current = setTimeout(runDemoStep, typingSpeed)
        } else {
          // Move to JS
          setActiveTab("js")
          setDemoState((prev) => ({ ...prev, currentPhase: "typing-js", currentCharIndex: 0 }))
          demoTimerRef.current = setTimeout(runDemoStep, 500)
        }
      } else if (currentPhase === "typing-js") {
        const targetCode = demoSnippets.js[currentSnippetIndex]
        if (currentCharIndex < targetCode.length) {
          setJsCode(targetCode.substring(0, currentCharIndex + 1))
          setDemoState((prev) => ({ ...prev, currentCharIndex: prev.currentCharIndex + 1 }))
           demoTimerRef.current = setTimeout(runDemoStep, typingSpeed)
         } else {
           // JS typing finished, pause before next snippet
           setActiveTab("preview")
           setDemoState((prev) => ({ ...prev, currentPhase: "pausing" }))
           demoTimerRef.current = setTimeout(runDemoStep, pauseDuration)
         }
      } else if (currentPhase === "pausing") {
        // Move to next snippet or restart
        const nextSnippetIndex = (currentSnippetIndex + 1) % demoSnippets.html.length
        setDemoState((prev) => ({
          ...prev,
          currentPhase: "idle",
          currentSnippetIndex: nextSnippetIndex,
          currentCharIndex: 0,
        }))
        demoTimerRef.current = setTimeout(runDemoStep, 500)
      }
    }

    if (!demoTimerRef.current) {
      demoTimerRef.current = setTimeout(runDemoStep, 0)
    }

    return () => {
      if (demoTimerRef.current) {
        clearTimeout(demoTimerRef.current)
        demoTimerRef.current = null
      }
    }
  }, [isDemoMode, demoState])

  const toggleDemoMode = () => {
    const newDemoMode = !isDemoMode
    setIsDemoMode(newDemoMode)

    if (newDemoMode) {
      setDemoState({
        currentPhase: "idle",
        currentSnippetIndex: 0,
        currentCharIndex: 0,
        typingSpeed: 30,
        pauseDuration: 3000,
      })

    } else {
    }
  }

  const handleClearCode = () => {
    if (activeTab === "html") {
      setHtmlCode("")
    } else if (activeTab === "css") {
      setCssCode("")
    } else if (activeTab === "js") {
      setJsCode("")
    }

  }

  const handleDownloadCode = () => {
    // Create a simple HTML file with all code
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZenSite Demo</title>
  <style>
${cssCode}
  </style>
</head>
          <body class="dark-theme">
${htmlCode}
  <script>
${jsCode}
  </script>
</body>
</html>
    `

    const blob = new Blob([fullHtml], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "zensite-demo.html"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

  }

  const handleCopyCode = () => {
    let content = ""

    if (activeTab === "html") {
      content = htmlCode
    } else if (activeTab === "css") {
      content = cssCode
    } else if (activeTab === "js") {
      content = jsCode
    } else if (activeTab === "preview") {
      content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZenSite Demo</title>
  <style>
${cssCode}
  </style>
</head>
          <body class="dark-theme">
${htmlCode}
  <script>
${jsCode}
  </script>
</body>
</html>`
    }

    navigator.clipboard.writeText(content)

  }

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-2">
        <div className="flex items-center gap-4">
          <Button
            variant={isDemoMode ? "default" : "outline"}
            size="sm"
            onClick={toggleDemoMode}
            className={
              isDemoMode ? "bg-purple-600 hover:bg-purple-700" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }
          >
            {isDemoMode ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {isDemoMode ? "Stop Demo" : "Start Demo"}
          </Button>

        </div>

        {/* Removed Clear, Copy, Download buttons */}
      </div>

      <Tabs defaultValue="html" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4">
          <TabsList className="bg-gray-800 my-2">
            <TabsTrigger value="html" className="data-[state=active]:bg-purple-600">
              HTML
            </TabsTrigger>
            <TabsTrigger value="css" className="data-[state=active]:bg-purple-600">
              CSS
            </TabsTrigger>
            <TabsTrigger value="js" className="data-[state=active]:bg-purple-600">
              JS
            </TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-purple-600">
              Preview
            </TabsTrigger>
          </TabsList>

          {isDemoMode && demoState.currentPhase !== "idle" && demoState.currentPhase !== "pausing" && (
            <div className="text-xs text-gray-400 animate-pulse">
              {demoState.currentPhase === "typing-html" && "Typing HTML..."}
              {demoState.currentPhase === "typing-css" && "Typing CSS..."}
              {demoState.currentPhase === "typing-js" && "Typing JavaScript..."}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="h-[400px] md:h-[500px] border-r border-gray-800">
            <TabsContent value="html" className="h-full m-0">
              <CodeMirrorEditor value={htmlCode} onChange={setHtmlCode} language="html" readOnly={isDemoMode} />
            </TabsContent>

            <TabsContent value="css" className="h-full m-0">
              <CodeMirrorEditor value={cssCode} onChange={setCssCode} language="css" readOnly={isDemoMode} />
            </TabsContent>

            <TabsContent value="js" className="h-full m-0">
              <CodeMirrorEditor value={jsCode} onChange={setJsCode} language="javascript" readOnly={isDemoMode} />
            </TabsContent>

            <TabsContent value="preview" className="h-full m-0 hidden md:block">
              <CodeMirrorEditor value={htmlCode} onChange={setHtmlCode} language="html" readOnly={isDemoMode} />
            </TabsContent>
          </div>

          <div className="h-[400px] md:h-[500px] bg-white">
            <iframe
              title="Code Preview"
              srcDoc={combinedCode}
              className="w-full h-full border-none bg-gray-900"
              sandbox="allow-scripts"
            />
          </div>
        </div>
      </Tabs>
    </div>
  )
}
