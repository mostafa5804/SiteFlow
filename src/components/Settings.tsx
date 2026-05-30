import React, { useState, useEffect, useRef } from "react";
import { Database, Download, Upload, RefreshCw, AlertTriangle, CheckCircle, ShieldAlert, Settings as SettingsIcon, Save } from "lucide-react";

interface SettingsProps {
  settings: Record<string, string>;
  onSaveSettings: (updated: Record<string, string>) => Promise<void>;
  onResetDatabase: () => Promise<void>;
}

export default function Settings({ settings, onSaveSettings, onResetDatabase }: SettingsProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [enterpriseName, setEnterpriseName] = useState("دفتر فنی الوان");
  const [logoText, setLogoText] = useState("الوان");
  const [projectName, setProjectName] = useState("پروژه مسکن ملی پرند");
  const [contractWarningDays, setContractWarningDays] = useState("30");
  const [logoImg, setLogoImg] = useState("");

  const [databasePath, setDatabasePath] = useState("");
  const [isDbPathSaving, setIsDbPathSaving] = useState(false);

  // Database binary file restore states
  const [isRestoringDb, setIsRestoringDb] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync props data to form states on mount or change
  useEffect(() => {
    if (settings) {
      setEnterpriseName(settings.enterprise_name ?? "دفتر فنی الوان");
      setLogoText(settings.logo_text ?? "الوان");
      setProjectName(settings.project_name ?? "پروژه مسکن ملی پرند");
      setContractWarningDays(settings.contract_warning_days ?? "30");
      setLogoImg(settings.logo_img ?? "");
    }
  }, [settings]);

  // Load database path
  useEffect(() => {
    fetch("/api/db-path")
      .then((res) => res.json())
      .then((data) => {
        if (data.db_path) {
          setDatabasePath(data.db_path);
        }
      })
      .catch((err) => console.error("Error fetching db-path:", err));
  }, []);

  const handleSaveDbPath = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDbPathSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/db-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_path: databasePath.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "خطا در تغییر مسیر پایگاه داده");
      }
      setDatabasePath(data.db_path || databasePath);
      setSuccessMsg("مسیر دیتابیس با موفقیت تغییر کرد و متصل شد.");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || "خطا در تغییر پایگاه داده.");
    } finally {
      setIsDbPathSaving(false);
    }
  };

  // Handle saving the numbering configurations
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Basic validates
    if (isNaN(Number(contractWarningDays)) || Number(contractWarningDays) < 0) {
      setErrorMsg("تعداد روز هشدار پایان قرارداد باید عددی بزرگ‌تر یا مساوی صفر باشد.");
      setIsSaving(false);
      return;
    }

    try {
      await onSaveSettings({
        enterprise_name: enterpriseName.trim(),
        logo_text: logoText.trim(),
        project_name: projectName.trim(),
        contract_warning_days: String(parseInt(contractWarningDays, 10)),
        logo_img: logoImg
      });
      setSuccessMsg("تنظیمات کلی کارگاه با موفقیت ذخیره گردید.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "خطا در ثبت اطلاعات پیکربندی.");
    } finally {
      setIsSaving(false);
    }
  };

  // Download DB Backup File
  const handleDownloadBackup = () => {
    const link = document.createElement("a");
    link.href = "/api/backup";
    link.download = "workshop-unified-backup.db";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSuccessMsg("پشتیبان‌گیری یکپارچه دیتابیس کل کارگاه با موفقیت انجام شد. فایل در بخش دانلودها قرار گرفت.");
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  // Upload and Restore SQLite .db binary file
  const handleRestoreDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const doubleConfirm = window.confirm(
      "⚠️ هشدار بسیار حیاتی و مهم!\n" +
      "با انجام این عملیات، کلیه اطلاعات جاری سه بخش (انبارداری، صورت‌وضعیت پیمانکاران جزء، سوابق و لیست کارکرد ماشین‌آلات) به طور کامل و غیرقابل بازگشت فروریخته و با اطلاعات فایل انتخابی بازنویسی خواهد شد.\n\n" +
      "آیا واقعاً از بازگرداندن فایل پشتیبان دیتابیس و پاک شدن اطلاعات جاری اطمینان صد‌در‌صد دارید؟"
    );
    if (!doubleConfirm) {
      e.target.value = "";
      return;
    }

    setIsRestoringDb(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          throw new Error("فایل پایگاه داده معتبر فرستاده نشده است یا خالی است.");
        }

        const res = await fetch("/api/restore-db", {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream"
          },
          body: arrayBuffer
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "خطایی در بازیابی فایل دیتابیس رخ داده است.");
        }

        setSuccessMsg(data.message || "دیتابیس سیستم کارگاه با موفقیت بازنشانی و فایل پشتیبان بارگذاری شد.");
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (err: any) {
        setErrorMsg(err.message || "خطایی در خوانش فایل آرشیو پیش آمد.");
      } finally {
        setIsRestoringDb(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Trigger Database Full Clear/Reset
  const handleReset = async () => {
    const doubleConfirm = window.confirm(
      "خطر حذف دائم داده‌ها:\nآیا واقعاً تمایل دارید کل اطلاعات انبار از جمله کالاها، اشخاص و تمام اسناد ورود و خروج را حذف کنید؟ این عمل غیرقابل بازگشت است."
    );
    if (!doubleConfirm) return;

    setIsResetting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    try {
      await onResetDatabase();
      setSuccessMsg("ریست پایگاه داده با موفقیت به پایان رسید. دیتابیس انبار مجدداً از نو راه‌اندازی گردید.");
    } catch (err: any) {
      setErrorMsg(err.message || "خطا در برقراری ارتباط با پنل دیتابیس.");
    } finally {
      setIsResetting(false);
    }
  };


  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Upper header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/70">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">تنظیمات و نگهداری سیستمی</h2>
        <p className="text-stone-500 text-sm mt-1">مدیریت قواعد سریال‌گذاری اسناد، کد کالاها و تمهیدات بازنشانی انبار</p>
      </div>

      {successMsg && (
        <div className="p-4 bg-[#eefcf2] border border-emerald-200/50 text-[#15502c] rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-[#15803d] shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-[#fdf2f2] border border-red-200/50 text-[#911d1d] rounded-xl text-xs font-bold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Configuration form */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/70">
        <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-stone-100">
          <SettingsIcon className="w-5 h-5 text-slate-700" />
          <h3 className="text-md font-bold text-slate-800">تنظیمات اصلی و اطلاعات عمومی کارگاه</h3>
        </div>

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Enterprise Name */}
          <div className="space-y-1.5 w-full">
            <label className="text-xs font-bold text-stone-500 block">نام دفتر فنی / عنوان شرکت</label>
            <input
              type="text"
              value={enterpriseName}
              onChange={(e) => setEnterpriseName(e.target.value)}
              placeholder="مثلاً: دفتر فنی الوان"
              className="w-full px-3 py-2.5 bg-[#fcfbfa] border border-stone-200 focus:outline-none focus:ring-2 focus:ring-slate-700 rounded-xl text-xs font-bold text-stone-850 text-right"
            />
          </div>

          {/* Logo Brand Name */}
          <div className="space-y-1.5 w-full">
            <label className="text-xs font-bold text-stone-500 block">نام تجاری / آرم متنی (لوگو)</label>
            <input
              type="text"
              value={logoText}
              onChange={(e) => setLogoText(e.target.value)}
              placeholder="مثلاً: الوان"
              className="w-full px-3 py-2.5 bg-[#fcfbfa] border border-stone-200 focus:outline-none focus:ring-2 focus:ring-slate-700 rounded-xl text-xs font-bold text-stone-850 text-right"
            />
          </div>

          {/* Project Name */}
          <div className="space-y-1.5 w-full">
            <label className="text-xs font-bold text-stone-500 block">نام پروژه کارگاهی</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="مثلاً: پروژه مسکن ملی پرند"
              className="w-full px-3 py-2.5 bg-[#fcfbfa] border border-stone-200 focus:outline-none focus:ring-2 focus:ring-slate-700 rounded-xl text-xs font-bold text-stone-850 text-right"
            />
          </div>

          {/* Contract Warning Days */}
          <div className="space-y-1.5 w-full">
            <label className="text-xs font-bold text-stone-500 block">آستانه هشدار اتمام قرارداد (تعداد روز مانده)</label>
            <input
              type="number"
              min="0"
              value={contractWarningDays}
              onChange={(e) => setContractWarningDays(e.target.value)}
              placeholder="مثلاً: 30"
              className="w-full px-3 py-2.5 bg-[#fcfbfa] border border-stone-200 focus:outline-none focus:ring-2 focus:ring-slate-700 rounded-xl text-xs font-bold text-stone-850 text-left font-mono"
            />
          </div>

          {/* Brand Logo Graphic File Uploader */}
          <div className="space-y-1.5 md:col-span-2 bg-stone-50 p-4 rounded-xl border border-stone-200 text-right w-full">
            <label className="text-xs font-bold text-stone-600 block mb-1">🖼️ تصویر لوگو / درج عکس نشان شرکت (اختیاری)</label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 2 * 1024 * 1024) {
                      alert("حجم فایل تصویر لوگو نباید بیشتر از ۲ مگابایت باشد.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setLogoImg(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
                id="brand-logo-file-picker"
              />
              <button
                type="button"
                onClick={() => document.getElementById("brand-logo-file-picker")?.click()}
                className="px-3.5 py-2 bg-white border border-stone-250 hover:bg-stone-100 text-stone-750 font-bold cursor-pointer rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs"
              >
                📁 انتخاب تصویر لوگو
              </button>
              
              {logoImg ? (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-2 py-1 rounded-lg border border-emerald-100">
                  <img src={logoImg} className="w-8 h-8 object-contain rounded bg-white p-0.5 border" alt="لوگو" referrerPolicy="no-referrer" />
                  <span className="text-[10px] font-bold">عکس لوگو با موفقیت بارگذاری شد</span>
                  <button
                    type="button"
                    onClick={() => setLogoImg("")}
                    className="text-rose-600 hover:text-rose-800 text-[10px] font-black underline mr-2 cursor-pointer"
                  >
                    حذف عکس
                  </button>
                </div>
              ) : (
                <span className="text-[10px] text-stone-400 font-semibold" id="no-logo-uploaded-label">تصویری بارگذاری نشده است (از حروف نام تجاری بالا استفاده می‌شود.)</span>
              )}
            </div>
          </div>

          <div className="md:col-span-2 pt-2 text-left flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4 text-slate-100" />
              <span>{isSaving ? "در حال ثبت تغییرات..." : "ذخیره تنظیمات عمومی کارگاه"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Database Storage Location Path */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/70 text-right">
        <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-stone-100">
          <Database className="w-5 h-5 text-indigo-600" />
          <h3 className="text-md font-bold text-slate-800">تعیین محل ذخیره‌سازی پایگاه‌داده (Database Config)</h3>
        </div>

        <form onSubmit={handleSaveDbPath} className="space-y-4">
          <p className="text-xs text-stone-500 leading-relaxed font-semibold">
            با توجه به اینکه برنامه به صورت ویندوزی یا وب‌اپ اجرا می‌شود، می‌توانید مسیر ذخیره‌سازی فایل پایگاه داده SQLite (<code className="bg-stone-50 px-1.5 py-0.5 rounded font-mono">.db</code>) را در اینجا مشخص کنید. برای ذخیره در پوشه برنامه، یک مسیر نسبی مانند <code className="bg-stone-50 px-1.5 py-0.5 rounded font-mono text-indigo-600 font-bold">inventory.db</code> وارد نمایید.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={databasePath}
              onChange={(e) => setDatabasePath(e.target.value)}
              placeholder="مثال: inventory.db یا C:\Apps\data\inventory.db"
              className="flex-1 px-3 py-2.5 bg-[#fcfbfa] border border-stone-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl text-xs font-bold text-stone-850 font-mono text-left"
              dir="ltr"
            />
            <button
              type="submit"
              disabled={isDbPathSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              {isDbPathSaving ? "در حال تغییر و اتصال..." : "تغییر و اتصال دیتابیس"}
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Backup DB Download */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/70 flex flex-col justify-between space-y-6">
          <div className="space-y-3 text-right">
            <div className="inline-flex p-3 bg-emerald-50 text-emerald-800 rounded-2xl">
              <Database className="w-6 h-6 text-[#15803d]" />
            </div>
            <h3 className="text-sm font-black text-slate-800">پشتیبان‌گیری یکپارچه دیتابیس مرکزی (.db)</h3>
            <p className="text-[11px] text-stone-500 leading-relaxed font-semibold">
              بارگیری پرونده فیزیکی اصلی پایگاه داده مرکزی سیستم کارگاه شامل تجمیع اطلاعات ۳ بخش انبارداری کالاها، تراکنش پیمانکاران، و کارکرد ماشین‌آلات.
            </p>
          </div>

          <button
            onClick={handleDownloadBackup}
            className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-[#15803d] hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-205" />
            <span>بارگیری پشتیبان کامل Central (.db)</span>
          </button>
        </div>

        {/* Card 2: Restore DB Upload */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/70 flex flex-col justify-between space-y-6">
          <div className="space-y-3 text-right">
            <div className="inline-flex p-3 bg-indigo-50 text-indigo-800 rounded-2xl">
              <Upload className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-sm font-black text-slate-800 font-bold">بازگردانی دیتابیس پشتیبان کارگاه (DB Restore)</h3>
            <p className="text-[11px] text-stone-500 leading-relaxed font-semibold">
              بارگذاری و بازنشانی دیتابیس بیرونی یا فایل پشتیبان دانلود شده با پسوند <strong className="font-sans font-bold text-stone-600">.db</strong> در سامانه برای همگام‌سازی کامل مجدد.
            </p>
          </div>

          <div>
            <input
              type="file"
              accept=".db"
              ref={fileInputRef}
              onChange={handleRestoreDatabase}
              className="hidden"
              disabled={isRestoringDb}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isRestoringDb}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs disabled:bg-indigo-300"
            >
              {isRestoringDb ? (
                <RefreshCw className="w-4 h-4 text-indigo-200 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-indigo-100" />
              )}
              <span>{isRestoringDb ? "در حال بازیابی فایل..." : "بارگذاری و بازیابی پرونده .db"}</span>
            </button>
          </div>
        </div>

        {/* Card 3: Reset DB */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/70 flex flex-col justify-between space-y-6">
          <div className="space-y-3 text-right">
            <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-rose-700">پاکسازی یکپارچه و بازنشانی سیستم (Database Reset)</h3>
            <p className="text-[11px] text-rose-600 leading-relaxed font-semibold">
              حذف کلیه اسناد صادر شده انبار، اقلام، صورت‌وضعیت‌ها و تراکنش‌های مالی پیمانکاران، کارکردهای ثبت شده ماشین‌آلات و پاکسازی کامل.
            </p>
          </div>

          <button
            onClick={handleReset}
            disabled={isResetting}
            className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs disabled:bg-rose-300"
          >
            <RefreshCw className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`} />
            <span>{isResetting ? "در حال پاکسازی..." : "حذف کامل کل کارگاه (ریست)"}</span>
          </button>
        </div>
      </div>

      <div className="bg-[#fcfbfa] p-5 rounded-2xl border border-stone-200/70 text-xs text-stone-550 leading-relaxed font-semibold space-y-2">
        <h4 className="font-bold text-stone-850">توصیه‌های امنیتی پیشگیری خروج اطلاعات:</h4>
        <ol className="list-decimal list-inside pr-2 space-y-1">
          <li>پیشنهاد می‌شود حداکثر هر دوشب یک‌بار از دیتابیس پشتیبان بگیرید.</li>
          <li>برای انتقال سیستم انبار به سرور یا دستگاه جدید کافیست دیتابیس را دانلود کرده و در پوشه اصلی کپی نمایید.</li>
          <li>برای بازیابی سریع کالاها پس از بازنشانی کلی، از قابلیت بارگذاری فایل کاتالوگ اکسل استفاده کنید.</li>
        </ol>
      </div>
    </div>
  );
}
