export function formatPhoneInput(value = "") {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  let nationalDigits = digits;
  if (nationalDigits.startsWith("8") || nationalDigits.startsWith("7")) {
    nationalDigits = nationalDigits.slice(1);
  }
  nationalDigits = nationalDigits.slice(0, 10);
  const code = nationalDigits.slice(0, 3);
  const first = nationalDigits.slice(3, 6);
  const second = nationalDigits.slice(6, 8);
  const third = nationalDigits.slice(8, 10);
  let formatted = "+7";
  if (code) {
    formatted += ` (${code}`;
  }
  if (code.length === 3) {
    formatted += ")";
  }
  if (first) {
    formatted += ` ${first}`;
  }
  if (second) {
    formatted += `-${second}`;
  }
  if (third) {
    formatted += `-${third}`;
  }
  return formatted;
}
export const PHONE_INPUT_PATTERN =
  "^\\+7 \\([0-9]{3}\\) [0-9]{3}-[0-9]{2}-[0-9]{2}$";
export const PHONE_INPUT_PLACEHOLDER = "+7 (999) 123-45-67";
