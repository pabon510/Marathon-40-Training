import type { SelectionReasonCode } from "./locationConversion";

const LABELS: Record<SelectionReasonCode, string> = {
  block_consistency: "Kept consistent for this four-week block",
  accessory_rotation: "Accessory selected for this four-week block",
  short_option: "Selected for the shorter workout",
  location_equivalent: "Selected for this workout location",
  default_selection: "Core movement selected for this block",
  user_preference: "Selected because you prefer this exercise",
  preference_unavailable: "Used because no valid alternative could honor your avoid preference",
};

export function selectionReasonLabel(reason: SelectionReasonCode): string {
  return LABELS[reason];
}
