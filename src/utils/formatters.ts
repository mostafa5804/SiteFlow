export function convertToPersianDigits(num: string | number): string {
  if (num === undefined || num === null) return "";
  const id = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/[0-9]/g, function (w) {
    return id[+w];
  });
}

export function getJalaliDateStr(d: Date = new Date()): string {
  try {
    const gy = d.getFullYear();
    const gm = d.getMonth() + 1;
    const gd = d.getDate();
    
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy = (gy <= 1600) ? 0 : 979;
    let gy_rel = gy - ((gy <= 1600) ? 621 : 1600);
    let gy2 = (gm > 2) ? (gy_rel + 1) : gy_rel;
    let days = (365 * gy_rel) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
    
    jy += 33 * Math.floor(days / 12053);
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    
    if (days > 365) {
      jy += Math.floor((days - 1) / 365);
      days = (days - 1) % 365;
    }
    
    let jm, jd;
    if (days < 186) {
      jm = 1 + Math.floor(days / 31);
      jd = 1 + (days % 31);
    } else {
      jm = 7 + Math.floor((days - 186) / 30);
      jd = 1 + ((days - 186) % 30);
    }
    
    const monthStr = jm < 10 ? "0" + jm : String(jm);
    const dayStr = jd < 10 ? "0" + jd : String(jd);
    return `${jy}/${monthStr}/${dayStr}`;
  } catch (err) {
    return "1405/03/25"; // Safe default for 2026-06-15
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
