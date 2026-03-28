import type { Metadata } from "next";

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
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-primary">Lead</span>
          <span className="text-foreground">Solution</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your leads efficiently
        </p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
