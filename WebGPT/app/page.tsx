"use client"

import { useState, useEffect } from 'react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import CodeEditor from "@/components/code-editor/code-editor"
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [user, setUser] = useState<{email?: string} | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    fetchUser()
  }, [])
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Navigation */}
      <header className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full border-2 border-purple-500"></div>
            <span className="text-xl font-bold tracking-wider">WEBGPT</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="#" className="text-gray-100 border-b-2 border-purple-500 pb-1 font-medium">
              HOME
            </Link>
            <Link href="#" className="text-gray-400 hover:text-gray-100 transition-colors">
              TEMPLATES
            </Link>
            <Link href="#" className="text-gray-400 hover:text-gray-100 transition-colors">
              FEATURES
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative flex items-center gap-2">
                <div 
                  className="text-sm text-purple-300 cursor-pointer hover:text-purple-200"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  {user.email?.split('@')[0]}
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
            ) : (
              <Link href="/auth/login">
                <Button variant="outline" className="text-gray-200 border-gray-700 hover:bg-gray-800">
                  Sign in
                </Button>
              </Link>
            )}
            <Button 
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => {
                if (!user) {
                  window.location.href = '/auth/login';
                  return;
                }
                window.location.href = '/zensite_main_page';
              }}
            >
              Get started
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Left Column - Hero Content */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Build your perfect website
              <span className="block text-purple-500">with AI in minutes</span>
            </h1>

            <p className="text-lg text-gray-300">
              WebGpt combines the power of DeepSeek and Gemini AI to create stunning, functional websites tailored to
              your needs.
              <span className="block mt-2">No coding required.</span>
            </p>

            <Button 
              className="bg-purple-600 hover:bg-purple-700 text-white my-2 px-8 py-6 text-lg"
              onClick={() => {
                if (!user) {
                  window.location.href = '/auth/login';
                  return;
                }
                window.location.href = '/zensite_main_page';
              }}
            >
              Start building now
            </Button>
          </div>

          {/* Right Column - Interactive Demo */}
          <div className="space-y-4">
            <div className="border border-gray-800 rounded-lg p-4 bg-gray-900 text-center">
              <h3 className="text-xl uppercase tracking-wide">Live Code Demo</h3>
            </div>

            <CodeEditor />
          </div>
        </div>
      </main>
    </div>
  )
}
