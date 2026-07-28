import Link from "next/link";
import { RunLogForm } from "./run-form";

export default function LogRunPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Log a run</h1>
      <RunLogForm />
      <Link href="/log/skip" className="block text-center text-sm text-slate-500 underline">
        Skip today&apos;s workout instead
      </Link>
    </div>
  );
}
