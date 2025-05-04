"use client"

import { useEffect, useState, useRef } from "react"
import { basicSetup } from "codemirror"
import { EditorView, keymap } from "@codemirror/view"
import { indentWithTab } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { javascript } from "@codemirror/lang-javascript"
import { html } from "@codemirror/lang-html"
import { css } from "@codemirror/lang-css"
import { oneDark } from "@codemirror/theme-one-dark"

interface CodeMirrorEditorProps {
  value: string
  onChange: (value: string) => void
  language: "html" | "css" | "javascript"
  readOnly?: boolean
}

import React from 'react';

interface CodeMirrorEditorRef {
  getEditor: () => EditorView | null;
}

const CodeMirrorEditor = React.forwardRef<CodeMirrorEditorRef, CodeMirrorEditorProps>(
  ({ value, onChange, language, readOnly = false }, ref) => {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [editor, setEditor] = useState<EditorView | null>(null)

  const isEditorChange = useRef(false)

  useEffect(() => {
    if (!element) return

    // Determine language extension
    const getLangExtension = () => {
      switch (language) {
        case "html":
          return html()
        case "css":
          return css()
        case "javascript":
          return javascript()
        default:
          return javascript()
      }
    }

    // Create editor
    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        getLangExtension(),
        oneDark,
        keymap.of([indentWithTab]),
        EditorView.updateListener.of((update) => {
          if (update.changes) {
            isEditorChange.current = true
            onChange(update.state.doc.toString())
          }
        }),
        EditorView.editable.of(!readOnly),
      ],
    })

    const view = new EditorView({
      state,
      parent: element,
    })

    setEditor(view)

    return () => {
      view.destroy()
    }
  }, [element, language, readOnly, onChange])

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && !isEditorChange.current && value !== editor.state.doc.toString()) {
      editor.dispatch({
        changes: {
          from: 0,
          to: editor.state.doc.length,
          insert: value,
        },
      })
    }
    isEditorChange.current = false
  }, [editor, value])

  React.useImperativeHandle(ref, () => ({
    getEditor: () => editor
  }));

  return (
    <div className="h-full w-full flex flex-col gap-4">
      {language === 'html' && (
        <div className="text-sm font-medium text-gray-500">
          HTML SECTION
        </div>
      )}
      {language === 'css' && (
        <div className="text-sm font-medium text-gray-500">
          CSS SECTION
        </div>
      )}
      {language === 'javascript' && (
        <div className="text-sm font-medium text-gray-500">
          JAVESCRIPT SECTION
        </div>
      )}
      <div ref={setElement} className="flex-1" />
    </div>
  )
});

export default CodeMirrorEditor;
