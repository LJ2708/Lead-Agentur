import type { Metadata } from "next"
import { Outfit, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/sonner"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "LeadSolution",
  description: "Lead-Management & Vertriebsplattform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="de"
      className={cn("font-sans antialiased", outfit.variable, jetbrainsMono.variable)}
    >
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
