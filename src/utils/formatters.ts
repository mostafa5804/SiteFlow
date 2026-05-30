export function convertToPersianDigits(num: string | number): string {
  if (num === undefined || num === null) return "";
  const id = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/[0-9]/g, function (w) {
    return id[+w];
  });
}

export function getJalaliDateStr(d: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(d);
    let year = parts.find(p => p.type === 'year')?.value || '';
    let month = parts.find(p => p.type === 'month')?.value || '';
    let day = parts.find(p => p.type === 'day')?.value || '';
    
    // Convert Persian digits to English digits
    const toEn = (s: string) => s.replace(/[۰-۹]/g, digit => String.fromCharCode(digit.charCodeAt(0) - 1776));
    year = toEn(year);
    month = toEn(month);
    day = toEn(day);
    
    // clean years/months/days from extra characters
    year = year.replace(/\D/g, '');
    month = month.replace(/\D/g, '');
    day = day.replace(/\D/g, '');
    
    if (year && month && day) {
      return `${year}/${month}/${day}`;
    }
    return "1405/03/09";
  } catch (err) {
    return "1405/03/09";
  }
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
