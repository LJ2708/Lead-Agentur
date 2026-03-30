import { Logo } from "@/components/Logo";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <Logo size="md" />
        </div>
      </header>

      {/* Content */}
      <main className="flex flex-1 flex-col items-center px-4 py-8">
        <div className="w-full max-w-4xl">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white px-6 py-4">
        <div className="mx-auto max-w-4xl text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} LeadSolution. Alle Rechte vorbehalten.
        </div>
      </footer>
    </div>
  );
}
