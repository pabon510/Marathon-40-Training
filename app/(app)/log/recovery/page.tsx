import Link from "next/link";
import { RecoveryLogForm } from "./recovery-form";

export default function LogRecoveryPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Complete active recovery</h1>
        <p className="mt-1 text-sm text-slate-600">Keep this restorative. The target effort is 1–3/10.</p>
      </div>
      <RecoveryLogForm />
      <Link href="/log/skip" className="block text-center text-sm text-slate-500 underline">
        Skip today&apos;s session instead
      </Link>
    </div>
  );
}
