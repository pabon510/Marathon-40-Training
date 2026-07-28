import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Marathon 40 Training</h1>
          <p className="mt-1 text-sm text-slate-500">Private training log for Andrew.</p>
        </div>
        <div className="card">
          <LoginForm next={next ?? "/today"} />
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          Single private account. No public registration.
        </p>
      </div>
    </main>
  );
}
