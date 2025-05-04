'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation' // Import useRouter

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('') // State for success message
  const router = useRouter() // Initialize router

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('') // Clear previous success message

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // Optional: Add options like redirect URL
        // options: {
        //   emailRedirectTo: `${location.origin}/auth/callback`,
        // },
      })

      if (error) throw error

      // Handle successful registration
      setSuccessMessage('Registration successful! Please check your email to confirm your account.')
      // Optionally redirect after a delay or upon confirmation
      // setTimeout(() => router.push('/auth/login'), 3000) // Example redirect after 3 seconds

    } catch (err: any) {
      setError(err.message || 'An error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-purple-500">REGISTER</h1>

        {error && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 mt-1 text-gray-900 bg-gray-200 rounded-md focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6} // Add minimum password length requirement if desired
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 mt-1 text-gray-900 bg-gray-200 rounded-md focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'REGISTER'}
          </button>
        </form>

        <div className="text-center">
          <Link href="/auth/login" className="text-sm text-purple-400 hover:text-purple-300">
            Already have an account? Log in
          </Link>
        </div>
      </div>
    </div>
  )
}
