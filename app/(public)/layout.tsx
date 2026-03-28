export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#08080A] text-gray-200">
      <div className="mx-auto max-w-3xl px-6 py-16">
        {children}
      </div>
    </div>
  )
}
