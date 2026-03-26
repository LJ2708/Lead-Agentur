export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-[#2563EB]">Lead</span>
          <span className="text-gray-900">Solution</span>
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage your leads efficiently
        </p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
