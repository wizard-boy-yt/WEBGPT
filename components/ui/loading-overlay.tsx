"use client"

import { Loader2 } from "lucide-react"

interface LoadingOverlayProps {
  isLoading: boolean
  message?: string
}

export function LoadingOverlay({ isLoading, message = "Loading..." }: LoadingOverlayProps) {
  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-lg gap-6">
      <Loader2 className="w-16 h-16 animate-spin text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-600" />
      <span className="text-4xl font-bold bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400 tracking-wide [text-shadow:_0_2px_8px_rgb(0_0_0_/_0.3)]">
        {message}
      </span>
    </div>
  )
}
