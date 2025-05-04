import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "WebGpt - Build websites with AI",
  description: "Create stunning, functional websites with AI in minutes. No coding required.",
    generator: ''
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()

  const { data: { session } } = await (await supabase).auth.getSession()

  // Example: Redirect unauthenticated users from protected routes
  // if (!session) {
  //   redirect('/auth/login')
  // }
  return (
    <html lang="en" className="dark" suppressHydrationWarning={true}>
      <body className={inter.className} suppressHydrationWarning={true}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
