export function convertToPersianDigits(num: string | number): string {
  if (num === undefined || num === null) return "";
  const id = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/[0-9]/g, function (w) {
    return id[+w];
  });
}

export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null) return "۰ ریال";
  const formatted = Math.round(value).toLocaleString("fa-IR");
  return formatted + " ریال";
}

export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return "۰";
  return value.toLocaleString("fa-IR");
}

export function formatInputNumber(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === "") return "";
  const clean = String(value).replace(/,/g, "").replace(/[^0-9]/g, "");
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function parseInputNumber(value: string): string {
  if (!value) return "";
  return value.replace(/,/g, "");
}
