"use client";

const RED_FLAG_SYMPTOMS = [
  "Inability to bear weight",
  "Knee locking or giving way / instability",
  "Significant swelling, deformity, or acute injury",
  "Severe or rapidly escalating pain",
] as const;

/**
 * Explicit safety messaging shown when unusual pain is flagged. This is
 * separate from and does not change the numeric knee/recovery algorithm —
 * it is its own prominent notice per docs/SAFETY_RULES.md "Warnings outside
 * the algorithm".
 */
export function RedFlagWarning() {
  return (
    <div role="alert" className="rounded-lg border-2 border-safety-block bg-red-50 p-3">
      <p className="text-sm font-bold text-safety-block">Consider professional or urgent evaluation if you experienced:</p>
      <ul className="mt-1 list-inside list-disc text-sm text-red-900">
        {RED_FLAG_SYMPTOMS.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <p className="mt-2 text-sm font-semibold text-red-900">
        For a medical emergency (e.g. chest pain, fainting, severe shortness of breath), use emergency services now.
        This app does not diagnose and cannot replace professional evaluation.
      </p>
    </div>
  );
}
