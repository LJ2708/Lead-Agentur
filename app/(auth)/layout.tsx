import type { Metadata } from "next";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Login",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 text-center">
        <Logo size="lg" />
        <p className="mt-2 text-sm text-muted-foreground">
          Dein Vertriebssystem für planbare Termine
        </p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
