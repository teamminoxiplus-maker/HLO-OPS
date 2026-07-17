// PH mobile normalization → canonical +639XXXXXXXXX (spec §11 stores this form).
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  let d = digits.replace(/^\+/, "");
  if (d.startsWith("0")) d = "63" + d.slice(1);
  else if (d.startsWith("9") && d.length === 10) d = "63" + d;
  // Expect 63 + 9XXXXXXXXX = 12 digits total.
  if (/^639\d{9}$/.test(d)) return "+" + d;
  return null;
}
