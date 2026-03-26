import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

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
    <html lang="de" className={cn("font-sans antialiased", inter.variable)}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
