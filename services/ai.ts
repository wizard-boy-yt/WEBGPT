// This file previously contained client-side logic that attempted to access
// server-side environment variables, causing runtime errors.
// All AI generation logic has been moved to the server-side API route:
// app/api/generate/route.ts

// You can define shared types here if needed, but the core logic is gone.
export interface GeneratedCode {
  html: string;
  css: string;
  javascript: string;
}

// Removed API key reading, model definitions, and processPrompt function.
