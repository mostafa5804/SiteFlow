import React, { useState, useEffect, useRef } from "react";
import { Hammer, Save, Settings as SettingsIcon, ShieldCheck, Download, Upload, Info, AlertTriangle, RefreshCw } from "lucide-react";

interface WarehouseSettingsProps {
  settings: Record<string, string>;
  onSaveSettings: (updated: Record<string, string>) => Promise<void>;
}

export default function WarehouseSettings({ settings, onSaveSettings }: WarehouseSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [docPrefix, setDocPrefix] = useState("DOC-");
  const [docStartNo, setDocStartNo] = useState("1001");
  const [productPrefix, setProductPrefix] = useState("PRD-");

  // Local JSON restore state
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state values on load
  useEffect(() => {
    if (settings) {
      setDocPrefix(settings.doc_prefix ?? "DOC-");
      setDocStartNo(settings.doc_start_no ?? "1001");
      setProductPrefix(settings.product_prefix ?? "PRD-");
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Basic validates
    if (!docPrefix.trim() || !productPrefix.trim()) {
      setErrorMsg("پیشوندهای مربوط به اسناد و کالاها نمی‌توانند خالی باشند.");
      setIsSaving(false);
      return;
    }

    if (isNaN(Number(docStartNo)) || Number(docStartNo) < 1) {
      setErrorMsg("شماره شروع حواله‌ها و رسیدها باید عدد صحیح بزرگ‌تر از صفر باشد.");
      setIsSaving(false);
      return;
    }

    try {
      await onSaveSettings({
        ...settings,
        doc_prefix: docPrefix.trim().toUpperCase(),
        doc_start_no: String(parseInt(docStartNo, 10)),
        product_prefix: productPrefix.trim().toUpperCase()
      });
      setSuccessMsg("تنظیمات اسناد و کدهای انبارداری با موفقیت بروزرسانی شد.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "خطا در فرآیند ثبت اطلاعات پیکربندی انبار.");
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Warehouse JSON Export
  const handleJSONExport = async () => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await fetch("/api/warehouse/export-json");
      if (!res.ok) throw new Error("خطا در دریافت پشتیبان انبار");
      const data = await res.json();
      
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `warehouse-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccessMsg("فایل پشتیبان انبار (JSON Export) با موفقیت بارگیری شد.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "خطا در فرآیند خروجی‌گیری از پایگاه داده انبار.");
    }
  };

  // 2. Warehouse JSON Import
  const handleJSONImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    const confirmRestore = window.confirm(
      "هشدار بسیار مهم:\n" +
      "با بازیابی این پرونده، کلیه اطلاعات مربوط به کالاها، اشخاص، رسیدها و موازنه حواله‌ها بازنویسی خواهد شد و اطلاعات جاری انبار حذف می‌گردد.\n" +
      "آیا برای پاکسازی و بازگردانی اطلاعات انبار اطمینان کامل دارید؟"
    );
    if (!confirmRestore) {
      e.target.value = "";
      return;
    }

    setIsRestoring(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== "string") {
          throw new Error("فرمت فایل به درستی خوانده نشد.");
        }
        const parsed = JSON.parse(text);
        
        // Call backend JSON import endpoint
        const res = await fetch("/api/warehouse/import-json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed)
        });
        const result = await res.json();
        
        if (!res.ok) {
          throw new Error(result.error || "خطا در بازیابی اطلاعات در پایگاه داده");
        }
        
        setSuccessMsg(result.message || "اطلاعات انبار با موفقیت بازیابی شد.");
        setTimeout(() => setSuccessMsg(null), 5000);
      } catch (err: any) {
        setErrorMsg("خطا در بازیابی فایل: " + (err.message || "فرمت فایل JSON نامعتبر است."));
      } finally {
        setIsRestoring(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-right animate-fade-in" dir="rtl">
      {/* Title block */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>تنظیمات اسناد و ابزارهای پشتیبان‌گیری انبارداری</span>
          </h2>
          <p className="text-[11px] text-stone-500 font-semibold">پیکربندی پیشوندها، تولید کدهای خودکار و صادرات/واردات پرونده فیزیکی انبار</p>
        </div>
        <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
          <Hammer className="w-5 h-5" />
        </div>
      </div>

      {/* Warning/Success panels */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold leading-relaxed flex items-center gap-2">
          <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-bold leading-relaxed">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Main Settings Form */}
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/95 space-y-5">
          <h3 className="text-xs font-extrabold text-slate-900 border-b border-stone-100 pb-2">پیکربندی شماره گذاری و پیشوندهای انبار</h3>
          
          <div className="space-y-4">
            {/* Doc Prefix */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-605 block">پیشوند شماره سند (رسید/حواله)</label>
              <input
                type="text"
                value={docPrefix}
                onChange={(e) => setDocPrefix(e.target.value)}
                placeholder="مثلاً: ALW-"
                className="w-full px-3 py-2 bg-[#fcfbfa] border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-xl text-xs font-black text-stone-850 text-left font-mono"
                dir="ltr"
                required
              />
              <p className="text-[10px] text-stone-400 font-semibold leading-relaxed">کاراکترهای شروع برگه‌ها در چاپ (مثل رسید و حواله)</p>
            </div>

            {/* Doc Start No */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-605 block">شمارنده شروع اسناد حواله/رسید</label>
              <input
                type="number"
                min="1"
                value={docStartNo}
                onChange={(e) => setDocStartNo(e.target.value)}
                placeholder="مثلاً: 1001"
                className="w-full px-3 py-2 bg-[#fcfbfa] border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-xl text-xs font-black text-stone-850 text-left font-mono"
                dir="ltr"
                required
              />
              <p className="text-[10px] text-stone-400 font-semibold leading-relaxed">شماره شروع فاکتورهای بعدی</p>
            </div>

            {/* Product Prefix */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-605 block">پیشوند شناسه یا کد کالاها (حروف)</label>
              <input
                type="text"
                value={productPrefix}
                onChange={(e) => setProductPrefix(e.target.value)}
                placeholder="مثلاً: MAT-"
                className="w-full px-3 py-2 bg-[#fcfbfa] border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-xl text-xs font-black text-stone-850 text-left font-mono"
                dir="ltr"
                required
              />
              <p className="text-[10px] text-stone-400 font-semibold leading-relaxed">پیش فاکتور تولید کد کالا</p>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-3 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4 text-emerald-100" />
              <span>{isSaving ? "در حال ذخیره‌سازی..." : "ذخیره تنظیمات انبار"}</span>
            </button>
          </div>
        </form>

        {/* JSON Export & Import warehouse Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/95 flex flex-col justify-between space-y-5">
          <div>
            <h3 className="text-xs font-extrabold text-slate-900 border-b border-stone-100 pb-2 mb-3">آرشیو و بازیابی فایل فیزیکی انبارداری (JSON)</h3>
            
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-2 mb-4 text-right">
              <span className="text-[11px] font-black text-blue-900 flex items-center gap-1">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                پشتیبان‌گیری انبارداری (مستقل)
              </span>
              <p className="text-[10px] text-blue-840 leading-relaxed font-semibold">
                این بخش به صورت اختصاصی بر روی داده‌های انبار (شامل کالاها، تعاریف اشخاص پایه، و حواله‌های صادر شده) تمرکز داشته و فایل آرشیو آن با فرمت <strong className="font-mono">JSON</strong> صادر و بازنشانی می‌گردد.
              </p>
            </div>

            <div className="space-y-3.5">
              {/* Export JSON Button */}
              <button
                onClick={handleJSONExport}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-650 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-indigo-100" />
                <span>پشتیبان‌گیری کامل از انبار (JSON Export)</span>
              </button>

              <div className="border-t border-stone-100 my-2 pt-3">
                <p className="text-[10px] text-stone-500 font-bold mb-2">جهت بازیابی فایل آرشیو انبار (.json) دکمه زیر را کلیک کنید:</p>
                
                {/* File Upload for JSON Restoring */}
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleJSONImport}
                  disabled={isRestoring}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRestoring}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer disabled:bg-amber-300"
                >
                  {isRestoring ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-200" />
                  ) : (
                    <Upload className="w-4 h-4 text-amber-100" />
                  )}
                  <span>{isRestoring ? "در حال بازنشانی اطلاعات انبار..." : "بازیابی پرونده انبار (JSON Import)"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-red-650 font-semibold bg-red-50 p-2.5 rounded-xl border border-red-100 leading-normal">
            ⚙️ برای محافظت از سلامت دیتابیس، فرمت فایل انتخابی حتماً باید فایل صادر شده از همین سامانه با پسوند <strong className="font-sans font-black">.json</strong> باشد.
          </div>
        </div>
      </div>
    </div>
  );
}
