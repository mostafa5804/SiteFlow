import React from "react";
import { convertToPersianDigits } from "../utils/formatters";

interface SleekLicensePlateProps {
  plate: string;
  className?: string;
}

const letterMap: Record<string, string> = {
  "a": "الف", "b": "ب", "c": "ج", "d": "د", "e": "ه", "f": "ف", "g": "ق", "h": "ه", "i": "ی", 
  "j": "ج", "k": "ک", "l": "ل", "m": "م", "n": "ن", "p": "پ", "q": "ق", "r": "ر", "s": "س", 
  "t": "ت", "u": "ع", "v": "و", "w": "و", "x": "خ", "y": "ی", "z": "ز"
};

const toEn = (s: string) => 
  s.replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1776))
   .replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 1632));

export function parseIranianPlate(plateStr: string) {
  if (!plateStr) return null;
  const englishDigits = toEn(plateStr);
  const digits = englishDigits.replace(/\D/g, ""); // extract only digits
  
  // Find letters, excluding the word 'ایران' or 'iran'
  const letterSearch = plateStr
    .replace(/[0-9۰-۹]/g, " ")
    .replace(/ایران/g, " ")
    .replace(/Iran/gi, " ")
    .replace(/[-_//\\|]/g, " ")
    .trim();
  
  const words = letterSearch.split(/\s+/).filter(w => w.length > 0);
  let alpha = words[0] || "";
  
  // Translate English letters to Persian plate equivalent if needed
  if (alpha && /^[a-zA-Z]$/.test(alpha)) {
    alpha = letterMap[alpha.toLowerCase()] || alpha;
  }
  
  if (digits.length === 7) {
    return {
      part1: digits.slice(0, 2),
      alpha: alpha || "ب",
      part2: digits.slice(2, 5),
      cityCode: digits.slice(5, 7)
    };
  } else if (digits.length === 8) {
    return {
      part1: digits.slice(0, 2),
      alpha: alpha || "ب",
      part2: digits.slice(2, 5),
      cityCode: digits.slice(6, 8)
    };
  } else {
    // Regex try
    const match = englishDigits.match(/(\d{2})\s*([آ-یa-zA-Z]+)?\s*(\d{3})\s*.*?(\d{2})/);
    if (match) {
      let matchedAlpha = match[2] || "ب";
      if (/^[a-zA-Z]$/.test(matchedAlpha)) {
        matchedAlpha = letterMap[matchedAlpha.toLowerCase()] || matchedAlpha;
      }
      return {
        part1: match[1],
        alpha: matchedAlpha,
        part2: match[3],
        cityCode: match[4]
      };
    }
  }
  return null;
}

export const SleekLicensePlate: React.FC<SleekLicensePlateProps> = ({ plate, className = "" }) => {
  const parsed = parseIranianPlate(plate);

  if (!parsed) {
    // Elegant plain fallback badge
    return (
      <span 
        id="sleek-plate-fallback"
        className={`inline-flex items-center justify-center bg-slate-50 border border-stone-200 text-stone-800 font-mono text-[10.5px] px-2 py-0.5 rounded leading-none ${className}`}
        dir="rtl"
      >
        {convertToPersianDigits(plate)}
      </span>
    );
  }

  const { part1, alpha, part2, cityCode } = parsed;

  return (
    <div 
      id="sleek-license-plate"
      className={`inline-flex items-center bg-white text-slate-950 border border-slate-400 font-sans select-none overflow-hidden rounded-[4px] h-[22px] align-middle shadow-2xs leading-none text-center ${className}`}
      dir="ltr"
    >
      {/* 1. Left blue strip (Visual marker) */}
      <div className="bg-[#003399] w-[5px] h-full shrink-0" />

      {/* 2. Part 1 (2 Digits) */}
      <span className="px-1.5 text-[11px] font-black text-slate-950 tracking-tight font-mono shrink-0">
        {convertToPersianDigits(part1)}
      </span>

      {/* 3. Alpha part */}
      <span className="px-1 bg-slate-50/50 text-[11px] font-black text-slate-900 border-x border-slate-200 shrink-0">
        {alpha}
      </span>

      {/* 4. Part 2 (3 Digits) */}
      <span className="px-1.5 text-[11px] font-black text-slate-950 tracking-tight font-mono shrink-0">
        {convertToPersianDigits(part2)}
      </span>

      {/* 5. Right Divider line */}
      <div className="h-full border-r border-slate-400 shrink-0" />

      {/* 6. City Code (2 Digits) */}
      <span className="px-1.5 bg-slate-50/20 text-[11px] font-black text-slate-950 text-center font-mono shrink-0">
        {convertToPersianDigits(cityCode)}
      </span>
    </div>
  );
};
