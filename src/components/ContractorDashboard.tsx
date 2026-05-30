import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Building2, 
  Plus, 
  Trash2, 
  Download, 
  Search, 
  ArrowRight, 
  Briefcase, 
  Calculator, 
  DollarSign, 
  ShieldAlert, 
  Coins,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Printer,
  X
} from "lucide-react";
import { Contractor } from "../types";
import { formatCurrency, formatNumber, convertToPersianDigits, formatInputNumber, parseInputNumber, getJalaliDateStr } from "../utils/formatters";
import { exportContractorsToExcel } from "../utils/excelExport";

interface ContractorDashboardProps {
  onBack: () => void;
  onSelectContractor: (id: number) => void;
  onRefreshNotifications?: () => void;
}

export default function ContractorDashboard({ onBack, onSelectContractor, onRefreshNotifications }: ContractorDashboardProps) {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState("");

  const [filterActivity, setFilterActivity] = useState("all");
  const [filterBalance, setFilterBalance] = useState("all");
  const [sortBy, setSortBy] = useState("id");
  const [activeTab, setActiveTab] = useState<"list" | "consolidated" | "settings">("list");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  // Printing state for consolidated reports
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printReportType, setPrintReportType] = useState<"summary" | "detailed">("summary");
  const [printContractorFilter, setPrintContractorFilter] = useState("all");
  const [printActivityFilter, setPrintActivityFilter] = useState("all");
  const [showActiveQuickSelect, setShowActiveQuickSelect] = useState(false);

  const formatDateForDisplayToday = () => {
    return getJalaliDateStr();
  };

  const [newContractorName, setNewContractorName] = useState("");
  const [newActivityField, setNewActivityField] = useState("");

  // Detailed Rates defaults
  const [newRetentionRate, setNewRetentionRate] = useState("10");
  const [newInsuranceRate, setNewInsuranceRate] = useState("5");
  const [newIsExempt, setNewIsExempt] = useState(false);
  const [newHasTaxVal, setNewHasTaxVal] = useState(false);
  
  // Contract specific optionals
  const [newContractNo, setNewContractNo] = useState("");
  const [newAppendixNo, setNewAppendixNo] = useState("");
  const [newContractStart, setNewContractStart] = useState("");
  const [newContractEnd, setNewContractEnd] = useState("");
  const [newInitialAmount, setNewInitialAmount] = useState("");

  useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contractors");
      if (!res.ok) throw new Error("خطا در بارگذاری اطلاعات پیمانکاران");
      const data = await res.json();
      setContractors(data);
      onRefreshNotifications?.();
    } catch (err: any) {
      setError(err.message || "مشکلی رخ داده است.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await fetch("/api/contractors/export");
      if (!res.ok) throw new Error("خطا در ارتباط با سرور");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `contractor_backup_${new Date().toLocaleDateString("fa-IR").replace(/\//g, "-")}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("خطا در پشتیبان‌گیری: " + err.message);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmRestore = confirm(
      "هشدار: این کار تمام توازنات کنونی پیمانکاران جزء و فیش‌های ثبت شده را حذف کـرده و فایل پشتیبان را جایگزین می‌کند. آیا اطمینان کامل دارید؟"
    );
    if (!confirmRestore) {
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const raw = event.target?.result;
        if (!raw) return;
        const parsed = JSON.parse(raw as string);
        const res = await fetch("/api/contractors/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed)
        });

        if (!res.ok) {
          const detail = await res.json();
          throw new Error(detail.error || "خطا در بارگذاری فایل پشتیبان");
        }

        alert("بازیابی پشتیبان با موفقیت انجام شد.");
        fetchContractors();
      } catch (err: any) {
        alert("خطا در خواندن یا بازیابی فایل: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleAddContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContractorName.trim() || !newActivityField.trim()) {
      alert("لطفا تمامی فیلدها را پر کنید.");
      return;
    }

    try {
      const res = await fetch("/api/contractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newContractorName.trim(),
          activity_field: newActivityField.trim(),
          retention_rate: newRetentionRate ? parseFloat(newRetentionRate) : 10,
          insurance_rate: newInsuranceRate ? parseFloat(newInsuranceRate) : 5,
          is_tax_and_insurance_exempt: newIsExempt ? 1 : 0,
          has_tax_val: newHasTaxVal ? 1 : 0,
          contract_no: newContractNo.trim() || null,
          appendix_no: newAppendixNo.trim() || null,
          contract_start_date: newContractStart.trim() || null,
          contract_end_date: newContractEnd.trim() || null,
          initial_amount: newInitialAmount ? parseFloat(parseInputNumber(newInitialAmount)) : null,
        }),
      });

      if (!res.ok) throw new Error("خطا در ثبت پیمانکار جدید");
      
      setNewContractorName("");
      setNewActivityField("");
      setNewRetentionRate("10");
      setNewInsuranceRate("5");
      setNewIsExempt(false);
      setNewHasTaxVal(false);
      setNewContractNo("");
      setNewAppendixNo("");
      setNewContractStart("");
      setNewContractEnd("");
      setNewInitialAmount("");
      setShowAddModal(false);
      fetchContractors();
    } catch (err: any) {
      alert(err.message || "مشکلی رخ داده است.");
    }
  };

  const handleDeleteContractor = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("آیا از حذف این پیمانکار و کلیه اسناد مالی مربوطه اطمینان دارید؟ این عمل غیرقابل بازگشت است.")) {
      return;
    }
    if (!confirm("تأیید مجدد جهت اطمینان نهایی:\nبا حذف پیمانکار، کلیه اسناد مالی، کارکردها و پرداخت‌های این پیمانکار به طور دائمی پاک می‌شوند. آیا کاملاً مطمئن و موافق هستید؟")) {
      return;
    }

    try {
      const res = await fetch(`/api/contractors/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("خطا در حذف اطلاعات");
      fetchContractors();
    } catch (err: any) {
      alert(err.message || "مشکلی در حذف رخ داد.");
    }
  };

  const totalGross = contractors.reduce((sum, c) => sum + (c.total_gross || 0), 0);
  const totalRetention = contractors.reduce((sum, c) => sum + (c.total_retention || 0), 0);
  const totalInsurance = contractors.reduce((sum, c) => sum + (c.total_insurance || 0), 0);
  const totalDeductions = totalRetention + totalInsurance;
  const totalNet = contractors.reduce((sum, c) => sum + (c.total_net || 0), 0);
  const totalPaid = contractors.reduce((sum, c) => sum + (c.total_paid || 0), 0);
  const totalRemaining = contractors.reduce((sum, c) => sum + (c.remaining_balance || 0), 0);

  const filteredContractors = contractors
    .filter(c => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        c.name.toLowerCase().includes(q) ||
        c.activity_field.toLowerCase().includes(q) ||
        String(c.id).includes(q);

      const matchesActivity = filterActivity === "all" || c.activity_field === filterActivity;

      let matchesBalance = true;
      if (filterBalance === "has_balance") {
        matchesBalance = (c.remaining_balance || 0) > 0;
      } else if (filterBalance === "no_balance") {
        matchesBalance = (c.remaining_balance || 0) <= 0;
      }

      return matchesSearch && matchesActivity && matchesBalance;
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, "fa");
      }
      if (sortBy === "balance_desc") {
        return (b.remaining_balance || 0) - (a.remaining_balance || 0);
      }
      if (sortBy === "gross_desc") {
        return (b.total_gross || 0) - (a.total_gross || 0);
      }
      return a.id - b.id;
    });

  return (
    <div id="contractors-dashboard-root" className="container mx-auto px-4 py-6 max-w-7xl animate-fade-in">
      {/* Header and Nav */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button 
            id="back-to-landing-btn"
            onClick={onBack}
            className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-750 rounded-xl shadow-sm transition-all cursor-pointer"
            title="بازگشت به منوی کل"
          >
            <ArrowRight className="w-5 h-5 text-con-main" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">۲. پیمانکاران (تراز مالی و کارکاری)</h1>
            <p className="text-xs text-slate-500 mt-1">رهگیری دقیق کارکرد ناخالص، کسورات قانونی ۱۵% تفکیکی (سپرده ۱۰% و بیمه ۵%) و باقیمانده حساب</p>
          </div>
        </div>

        {/* Section Selector Tab: List or Settings */}
        <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200/60 font-semibold text-xs text-stone-600 gap-1 mt-3 md:mt-0 leading-none">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-4 py-2.5 rounded-lg cursor-pointer transition-all ${
              activeTab === "list"
                ? "bg-white text-stone-900 shadow-xs font-bold"
                : "hover:text-stone-900"
            }`}
          >
            مدیریت تراز پیمانکاران
          </button>
          <button
            onClick={() => setActiveTab("consolidated")}
            className={`px-4 py-2.5 rounded-lg cursor-pointer transition-all ${
              activeTab === "consolidated"
                ? "bg-white text-stone-900 shadow-xs font-bold"
                : "hover:text-stone-900"
            }`}
          >
            تراز تجمیعی چندقرارداده‌ها
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2.5 rounded-lg cursor-pointer transition-all ${
              activeTab === "settings"
                ? "bg-white text-stone-900 shadow-xs font-bold"
                : "hover:text-stone-900"
            }`}
          >
            تنظیمات فرعی و پشتیبان
          </button>
        </div>

        <div className="flex flex-row items-center gap-2 shrink-0">
          <input
            id="import-backup-file-input"
            type="file"
            accept=".json"
            onChange={handleImportBackup}
            className="hidden"
          />
          <button
            id="export-contractors-excel-btn"
            onClick={() => exportContractorsToExcel(contractors)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>خروجی اکسل گزارش تراز</span>
          </button>
          {activeTab === "list" && (
            <button
              id="open-add-contractor-modal-btn"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-con-dark hover:bg-blue-900 text-white px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت پیمانکار / رسته جدید</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === "settings" ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/70 text-right">
            <h2 className="text-md sm:text-lg font-bold text-slate-800 tracking-tight">تنظیمات و نگهداری سیستمی پیمانکاران</h2>
            <p className="text-stone-500 text-xs mt-1">با شباهت به بخش تنظیمات انبار، در این قسمت می‌توانید از پایگاه داده اختصاصی پیمانکاران پشتیبان تهیه کرده یا اطلاعات جدید بارگذاری کنید.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
            {/* Backup Card */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="inline-flex p-3 bg-blue-50 text-blue-700 rounded-2xl">
                  <Download className="w-6 h-6" />
                </div>
                <h3 className="text-md font-bold text-slate-900">پشتیبان‌گیری کامل پیمانکاران (JSON Export)</h3>
                <p className="text-xs text-stone-500 leading-relaxed font-semibold">
                  با کلیک روی دکمه زیر، فایل جامع پشتیبان پیمانکاران را به صورت سند متنی استریل JSON دانلود و در آرشیو محلی خود نگه دارید.
                </p>
              </div>

              <button
                onClick={handleExportBackup}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4 text-blue-100" />
                <span>دانلود نسخه پشتیبان پیمانکاران (.json)</span>
              </button>
            </div>

            {/* Restore Card */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-2xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-md font-bold text-slate-900">بازیابی پشتیبان پرونده‌ها (JSON Import)</h3>
                <p className="text-xs text-stone-500 leading-relaxed font-semibold">
                  در صورت لزوم جهت بازیافت اطلاعات پیشین، فایل پشتیبان دانلود شده قبلی را آپلود کنید. توجه کنید تمامی رکوردهای فعلی بازنویسی می‌شود.
                </p>
              </div>

              <button
                onClick={() => document.getElementById("import-backup-file-input")?.click()}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4 text-emerald-100" />
                <span>پیمایش رایانه و بازیابی اطلاعات</span>
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === "consolidated" ? (
        <div className="space-y-6 text-right animate-fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/70 text-right">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-5 h-5 text-con-main" />
              <h2 className="text-md sm:text-lg font-black text-slate-800 tracking-tight">گزارش تجمیعی پیمانکاران چندقراردادی</h2>
            </div>
            <p className="text-stone-500 text-xs mt-1">
              در این بخش، کلیه قراردادها و متمم‌های مربوط به اشخاص یا شرکت‌هایی که چندین قرارداد جداگانه دارند به صورت هوشمند و خودکار تجمیع شده‌اند. شما می‌توانید تراز کلی هر پیمانکار را به صورت یکجا، در کنار جزییات هر قرارداد به تفکیک مشاهده نمایید.
            </p>
          </div>

          {/* Search tool for consolidation */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative w-full max-w-md mr-auto">
              <Search className="absolute right-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="پویش نام پیمانکار یا جزئیات متمم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-9 py-1.5 bg-slate-50 border border-stone-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-con-main transition-all text-right font-medium"
              />
            </div>
            <button
              onClick={() => setShowPrintModal(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs shrink-0 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Printer className="w-4 h-4" />
              <span>پیش‌نمایش و چاپ گزارش تجمیعی</span>
            </button>
          </div>

          <div className="space-y-4">
            {(() => {
              // Grouping contractors by exact trimmed name
              const grouped: Record<string, Contractor[]> = {};
              contractors.forEach((c) => {
                const nameKey = (c.name || "").trim();
                if (!nameKey) return;
                if (!grouped[nameKey]) {
                  grouped[nameKey] = [];
                }
                grouped[nameKey].push(c);
              });

              // Filter based on searchQuery
              const filteredGroups = Object.entries(grouped).filter(([name, list]) => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                const nameMatch = name.toLowerCase().includes(query);
                const fieldMatch = list.some((c) => (c.activity_field || "").toLowerCase().includes(query));
                const numMatch = list.some((c) => (c.contract_no || "").toLowerCase().includes(query));
                return nameMatch || fieldMatch || numMatch;
              });

              if (filteredGroups.length === 0) {
                return (
                  <div className="bg-white p-12 text-center border border-stone-200 rounded-2xl">
                    <Layers className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                    <p className="text-xs text-stone-500">هیچ پیمانکاری همخوان با فیلتر جستجوی شما یافت نشد.</p>
                  </div>
                );
              }

              return filteredGroups.map(([name, list]) => {
                const isExpanded = !!expandedGroups[name];
                
                // Group totals
                const totalGrossGrp = list.reduce((sum, c) => sum + (c.total_gross || 0), 0);
                const totalDeductGrp = list.reduce((sum, c) => sum + ((c.total_retention || 0) + (c.total_insurance || 0)), 0);
                const totalNetGrp = list.reduce((sum, c) => sum + (c.total_net || 0), 0);
                const totalPaidGrp = list.reduce((sum, c) => sum + (c.total_paid || 0), 0);
                const totalBalanceGrp = list.reduce((sum, c) => sum + (c.remaining_balance || 0), 0);

                return (
                  <div key={name} className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden transition-all text-right">
                    {/* Header bar of the grouped contractor */}
                    <div 
                      onClick={() => {
                        setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
                      }}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/65 transition-colors select-none"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-blue-50 text-con-main rounded-xl mt-0.5">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-800 text-sm">{name}</h3>
                          <span className="text-[10px] text-stone-500 font-bold bg-stone-100 px-2 py-0.5 rounded-md mt-1 inline-block">
                            تعداد قراردادها: {convertToPersianDigits(list.length)} پرونده فعال در کارگاه
                          </span>
                        </div>
                      </div>

                      {/* Header Financial Bento */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50 p-3 rounded-xl border border-stone-100 font-mono text-[11px] shrink-0">
                        <div>
                          <div className="text-[9px] text-stone-500 font-sans font-bold">مجموع ناخالص</div>
                          <div className="font-bold text-slate-700 mt-0.5 text-left">{formatCurrency(totalGrossGrp)}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-stone-500 font-sans font-bold font-bold text-rose-700">کسورات تفکیکی</div>
                          <div className="font-bold text-rose-600 mt-0.5 text-left">-{formatCurrency(totalDeductGrp)}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-stone-500 font-sans font-bold text-emerald-700">کل دریافتی</div>
                          <div className="font-bold text-emerald-700 mt-0.5 text-left">{formatCurrency(totalPaidGrp)}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-orange-700 font-sans font-bold">تراز تجمعی طلبکار</div>
                          <div className="font-black text-orange-700 text-xs mt-0.5 text-left">{formatCurrency(totalBalanceGrp)}</div>
                        </div>
                      </div>

                      {/* Fold toggle button */}
                      <div className="flex justify-end pr-2">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-stone-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-stone-400" />
                        )}
                      </div>
                    </div>

                    {/* Expandable detailed area */}
                    {isExpanded && (
                      <div className="border-t border-stone-100 p-5 bg-stone-50/10">
                        <div className="mb-3 text-[10px] text-stone-500 font-bold">زیرمجموعه قراردادهای ثبت‌شده برای {name} :</div>
                        <div className="overflow-x-auto rounded-xl border border-stone-200 max-w-full bg-white">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-slate-50 text-stone-500 font-bold border-b border-stone-150">
                              <tr>
                                <th className="p-3 text-center">شناسه سیستم</th>
                                <th className="p-3">رسته فنی / پروژه</th>
                                <th className="p-3">شماره / متمم قرارداد</th>
                                <th className="p-3 text-left">مبلغ اولیه پیمان</th>
                                <th className="p-3 text-left">صورت‌وضعیت ناخالص</th>
                                <th className="p-3 text-left text-rose-600">کسورات تفکیکی (۱۵٪)</th>
                                <th className="p-3 text-left text-con-main font-bold">خالص کارکرد</th>
                                <th className="p-3 text-left text-emerald-700 font-bold">کل دریافتی مالی‌</th>
                                <th className="p-3 text-left text-orange-700 font-black">مانده تراز طلب</th>
                                <th className="p-3 text-center">ورق کالیبره</th>
                                <th className="p-3 text-center">عملیات</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-150/50">
                              {list.map((sub) => {
                                const subPercentage = sub.initial_amount && sub.initial_amount > 0 ? (sub.total_gross / sub.initial_amount) * 100 : 0;
                                return (
                                  <tr key={sub.id} className="hover:bg-blue-50/10 transition-colors text-[11px]">
                                    <td className="p-3 text-center font-mono text-stone-400">{convertToPersianDigits(sub.id)}</td>
                                    <td className="p-3">
                                      <span className="px-2 py-0.5 bg-slate-100 text-stone-700 rounded text-[10px] font-semibold">
                                        {sub.activity_field}
                                      </span>
                                    </td>
                                    <td className="p-3 font-semibold text-slate-700 font-mono">
                                      {sub.contract_no ? `${convertToPersianDigits(sub.contract_no)}` : "—"}
                                      {sub.appendix_no ? ` / متمم ${convertToPersianDigits(sub.appendix_no)}` : ""}
                                    </td>
                                    <td className="p-3 text-left font-mono text-stone-500">
                                      {sub.initial_amount && sub.initial_amount > 0 ? (
                                        <div>
                                          <div>{formatCurrency(sub.initial_amount)} ریال</div>
                                          <div className="text-[9px] text-stone-400 mt-0.5">({convertToPersianDigits(subPercentage.toFixed(1))}% پیشرفت)</div>
                                        </div>
                                      ) : "ثبت نشده"}
                                    </td>
                                    <td className="p-3 text-left font-mono text-stone-700 font-bold">{formatCurrency(sub.total_gross)}</td>
                                    <td className="p-3 text-left font-mono text-rose-500">-{formatCurrency((sub.total_retention || 0) + (sub.total_insurance || 0))}</td>
                                    <td className="p-3 text-left font-mono text-con-main font-bold">{formatCurrency(sub.total_net)}</td>
                                    <td className="p-3 text-left font-mono text-emerald-700 font-bold">{formatCurrency(sub.total_paid)}</td>
                                    <td className="p-3 text-left font-mono text-orange-700 font-black">{formatCurrency(sub.remaining_balance)}</td>
                                    <td className="p-3 text-center">
                                      <button 
                                        onClick={() => onSelectContractor(sub.id)}
                                        className="text-con-main hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap"
                                      >
                                        مشاهده جزئیات ورق کالیبره
                                      </button>
                                    </td>
                                    <td className="p-3 text-center">
                                      <button
                                        onClick={(e) => handleDeleteContractor(sub.id, e)}
                                        className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded transition-colors cursor-pointer"
                                        title="حذف این ردیف قرارداد فرعی"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 inline-block" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      ) : (
        <>

      {/* Aggregate Cards Summary Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div id="metric-card-gross" className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">کارکرد ناخالص کل</span>
            <span className="p-1 px-2 bg-slate-50 rounded text-slate-650">
              <Calculator className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-md sm:text-lg font-extrabold text-slate-900 tracking-tight mt-2">{formatCurrency(totalGross)}</p>
        </div>

        <div id="metric-card-deductions" className="bg-white p-4 rounded-xl border border-stone-200/80 border-r-4 border-r-rose-600 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">کسورات قانونی (۱۵٪)</span>
            <span className="p-1 px-2 bg-rose-50 rounded text-rose-600">
              <ShieldAlert className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-md sm:text-lg font-extrabold text-rose-700 tracking-tight mt-2">{formatCurrency(totalDeductions)}</p>
        </div>

        <div id="metric-card-net" className="bg-white p-4 rounded-xl border border-stone-200/80 border-r-4 border-r-con-dark shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">جمع کارکرد خالص</span>
            <span className="p-1 px-2 bg-slate-100 rounded text-con-dark">
              <Coins className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-md sm:text-lg font-extrabold text-con-dark tracking-tight mt-2">{formatCurrency(totalNet)}</p>
        </div>

        <div id="metric-card-payments" className="bg-white p-4 rounded-xl border border-stone-200/80 border-r-4 border-r-emerald-600 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">مجموع کل پرداختی‌ها</span>
            <span className="p-1 px-2 bg-emerald-50 rounded text-emerald-650">
              <DollarSign className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-md sm:text-lg font-extrabold text-emerald-700 tracking-tight mt-2">{formatCurrency(totalPaid)}</p>
        </div>

        <div id="metric-card-remaining" className="bg-white p-4 rounded-xl border border-stone-200/80 border-r-4 border-r-orange-600 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-700">کل طلبکاران (طلب نهایی)</span>
            <span className="p-1 px-2 bg-orange-50 rounded text-orange-600">
              <Building2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-md sm:text-lg font-extrabold text-orange-700 tracking-tight mt-2">{formatCurrency(totalRemaining)}</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div id="contractor-table-container-card" className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
        {/* Table Filters */}
        <div className="p-5 border-b border-stone-100 bg-slate-50/20 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            
            {/* Search Query */}
            <div className="relative w-full xl:max-w-xs">
              <Search className="absolute right-3.1 top-3 text-slate-400 w-4 h-4" />
              <input
                id="contractor-search-input"
                type="text"
                placeholder="پویش سریع نام پیمانکار یا تخصص..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-9 py-2 bg-white border border-stone-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-con-main transition-all text-right font-medium"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-4">
              
              {/* Activity filter */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-stone-500">رسته پروژه:</span>
                <select
                  value={filterActivity}
                  onChange={(e) => setFilterActivity(e.target.value)}
                  className="bg-white border border-stone-200 rounded-xl text-[11px] px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-con-main cursor-pointer"
                >
                  <option value="all">همه رسته‌ها</option>
                  {Array.from(new Set(contractors.map(c => c.activity_field))).map(act => (
                    <option key={act} value={act}>{act}</option>
                  ))}
                </select>
              </div>

              {/* Balance status filter */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-stone-500">وضعیت حساب:</span>
                <select
                  value={filterBalance}
                  onChange={(e) => setFilterBalance(e.target.value)}
                  className="bg-white border border-stone-200 rounded-xl text-[11px] px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-con-main cursor-pointer"
                >
                  <option value="all">همه پیمانکاران</option>
                  <option value="has_balance">طلبکار (مانده تراز &gt; ۰)</option>
                  <option value="no_balance">تسویه کامل یا علی‌الحساب صاف</option>
                </select>
              </div>

              {/* Sorting rule */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-stone-500">ترتیب چیدمان:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-stone-200 rounded-xl text-[11px] px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-con-main cursor-pointer"
                >
                  <option value="id">شناسه کارگاه</option>
                  <option value="name">ترتیب حروف الفبا</option>
                  <option value="balance_desc">بیشترین موازنه طلبکاری</option>
                  <option value="gross_desc">بیشترین مجموع صورت‌وضعیت ناخالص</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-stone-500 bg-slate-50/50 px-4 py-2.5 rounded-xl border border-stone-100">
            <span>
              پیمانکاران همخوان: <strong className="text-slate-800">{convertToPersianDigits(filteredContractors.length)}</strong> از شرکت‌های فعال
            </span>
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterActivity("all");
                setFilterBalance("all");
                setSortBy("id");
              }}
              className="text-[10px] text-con-main font-bold hover:underline cursor-pointer"
            >
              پاک کردن فیلترها
            </button>
          </div>
        </div>

        {/* Real Dynamic Data Table */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-con-main mb-2"></div>
            <p className="text-xs text-stone-500">در حال دریافت و واکشی فهرست تراز پیمانکاران...</p>
          </div>
        ) : filteredContractors.length === 0 ? (
          <div className="p-16 text-center">
            <Briefcase className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-stone-600">موردی برای نمایش یافت نشد</h3>
            <p className="text-xs text-stone-400 mt-1">با کلیک روی دکمهثبت پیمانکار جدید، پرونده کارگاهی باز کنید.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-stone-500 font-bold border-b border-stone-100">
                <tr>
                  <th className="py-4 px-6 text-center">شناسه</th>
                  <th className="py-4 px-6">عنوان پیمانکار / کارگاه جزء</th>
                  <th className="py-4 px-6">رسته عملیاتی</th>
                  <th className="py-4 px-6 text-left">مجموع ناخالص (۱۰۰٪)</th>
                  <th className="py-4 px-6 text-left">مجموع کسورات (۱۵٪)</th>
                  <th className="py-4 px-6 text-left text-con-main font-extrabold">کارکرد خالص (۸۵٪)</th>
                  <th className="py-4 px-6 text-left text-emerald-700">مجموع دریافتی</th>
                  <th className="py-4 px-6 text-left text-orange-700 font-extrabold">مانده طلب نهایی</th>
                  <th className="py-4 px-6 text-center">پرونده</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100/50">
                {filteredContractors.map((c, index) => (
                  <tr 
                    key={c.id} 
                    onClick={() => onSelectContractor(c.id)}
                    className="hover:bg-blue-50/20 transition-all cursor-pointer group"
                  >
                    <td className="py-4 px-6 text-center text-stone-400 font-mono text-[11px]">{convertToPersianDigits(c.id)}</td>
                    <td className="py-4 px-6 font-bold text-slate-800 group-hover:text-con-main transition-colors">
                      <div>{c.name}</div>
                      {c.initial_amount && c.initial_amount > 0 ? (
                        (() => {
                          const initAmt = parseFloat(String(c.initial_amount));
                          const cPercentage = (c.total_gross / initAmt) * 100;
                          return (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                              <div className="w-16 bg-stone-100 rounded-full h-1 overflow-hidden" title={`ارزش اولیه: ${formatCurrency(initAmt)} ریال`}>
                                <div 
                                  className={`h-full ${
                                    cPercentage > 125 ? "bg-red-500" :
                                    cPercentage >= 100 ? "bg-amber-500" :
                                    cPercentage < 75 ? "bg-sky-500" : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${Math.min(cPercentage, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-[10px] font-mono text-stone-500 font-semibold">
                                {convertToPersianDigits(cPercentage.toFixed(1))}% پیمان
                              </span>
                              {cPercentage > 125 && (
                                <span className="text-[9px] bg-red-50 text-red-600 px-1 py-0.2 rounded font-black border border-red-200">
                                  غیرمجاز (بیش از ۱۲۵٪)
                                </span>
                              )}
                              {cPercentage >= 100 && cPercentage <= 125 && (
                                <span className="text-[9px] bg-amber-50 text-amber-700 px-1 py-0.2 rounded font-black border border-amber-200" title="بین ۱۰۰ الی ۱۲۵ درصد ارزش اولیه">
                                  هشدار موازنه (+۲۵٪)
                                </span>
                              )}
                              {cPercentage < 75 && (
                                <span className="text-[9px] bg-blue-50 text-blue-700 px-1 py-0.2 rounded font-black border border-blue-200" title="کمتر از ۷۵ درصد ارزش قطعی پیمان">
                                  کاهش کار (کمتر از ۷۵٪)
                                </span>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-[10px] text-stone-400 font-medium">مبلغ اولیه قرارداد ثبت نشده</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 bg-slate-100 text-stone-700 rounded text-[11px] font-semibold">
                        {c.activity_field}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-left text-stone-700 font-medium font-mono">{formatCurrency(c.total_gross)}</td>
                    <td className="py-4 px-6 text-left text-rose-500 font-medium font-mono">-{formatCurrency((c.total_retention || 0) + (c.total_insurance || 0))}</td>
                    <td className="py-4 px-6 text-left text-con-main font-black font-mono">{formatCurrency(c.total_net)}</td>
                    <td className="py-4 px-6 text-left text-emerald-700 font-bold font-mono">{formatCurrency(c.total_paid)}</td>
                    <td className="py-4 px-6 text-left font-black font-mono">
                      <span className={(c.remaining_balance || 0) > 0 ? "text-orange-700 text-sm" : "text-stone-400"}>
                        {formatCurrency(c.remaining_balance)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        id={`delete-contractor-${c.id}-btn`}
                        onClick={(e) => handleDeleteContractor(c.id, e)}
                        className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                        title="حذف پیمانکار و متعلقات"
                      >
                        <Trash2 className="w-4 h-4 inline-block" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* Add Contractor Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full overflow-hidden text-right"
          >
            <div className="p-5 bg-con-dark text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm">ثبت پرونده پیمانکاری کارگاهی</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white transition-all cursor-pointer text-xl"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleAddContractor} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">نام پیمانکار یا شرکت پیمانکاری جزء</label>
                <input
                  id="new-contractor-name"
                  type="text"
                  required
                  list="existing-contractors-list"
                  placeholder="مثال: آرماتوربندی برادران فضلی"
                  value={newContractorName}
                  onChange={(e) => setNewContractorName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-right"
                />
                <datalist id="existing-contractors-list">
                  {Array.from(new Set(contractors.map(c => c.name.trim()))).map(name => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                {contractors.length > 0 && (
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={() => setShowActiveQuickSelect(!showActiveQuickSelect)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold transition-all flex items-center gap-1 cursor-pointer inline-flex"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showActiveQuickSelect ? "rotate-180" : ""}`} />
                      <span>{showActiveQuickSelect ? "پنهان‌سازی مراجع پیمانکاران فعال" : "انتخاب سریع از پیمانکاران فعال کارگاه..."}</span>
                    </button>
                    {showActiveQuickSelect && (
                      <motion.div 
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1.5 flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 bg-slate-50 border border-stone-100 rounded-lg select-none"
                      >
                        {Array.from(new Set(contractors.map(c => c.name.trim()))).map(name => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setNewContractorName(name)}
                            className="px-2 py-0.5 text-[9px] bg-white hover:bg-slate-100 border border-stone-200 hover:border-indigo-500/40 text-stone-700 rounded transition-all cursor-pointer truncate max-w-[150px]"
                          >
                            {name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">رسته تخصصی یا حوزه واگذاری</label>
                <input
                  id="new-contractor-field"
                  type="text"
                  required
                  placeholder="مثال: بتن‌ریزی فونداسیون و پایه‌ها"
                  value={newActivityField}
                  onChange={(e) => setNewActivityField(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-right"
                />
              </div>

              <details className="border border-stone-100 rounded-xl p-3 bg-stone-50/50 group cursor-pointer">
                <summary className="text-[11px] font-bold text-slate-700 select-none flex items-center justify-between">
                  <span>⚙️ تنظیمات پیشرفته قرارداد و نرخ کسورات (اختیاری)</span>
                  <span className="text-[10px] text-stone-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                
                <div className="pt-3 space-y-3 cursor-default" onClick={(e) => e.stopPropagation()}>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-stone-500 mb-1">شماره قرارداد</label>
                      <input
                        type="text"
                        placeholder="۹۸/۱۱۲/پ"
                        value={newContractNo}
                        onChange={(e) => setNewContractNo(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-[11px] text-slate-800 text-right font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-500 mb-1">شماره الحاقیه</label>
                      <input
                        type="text"
                        placeholder="الف/۱"
                        value={newAppendixNo}
                        onChange={(e) => setNewAppendixNo(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-[11px] text-slate-800 text-right font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-stone-500 mb-1">تاریخ شروع پیمان</label>
                      <input
                        type="text"
                        placeholder="۱۴۰۴/۰۱/۱۵"
                        value={newContractStart}
                        onChange={(e) => setNewContractStart(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-[11px] text-slate-800 text-right font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-500 mb-1">تاریخ پایان پیمان</label>
                      <input
                        type="text"
                        placeholder="۱۴۰۵/۱۲/۲۹"
                        value={newContractEnd}
                        onChange={(e) => setNewContractEnd(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-[11px] text-slate-800 text-right font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-stone-500 mb-1">مبلغ اولیه پیمان (ریال)</label>
                    <input
                      type="text"
                      placeholder="مثال: ۲,۵۰۰,۰۰۰,۰۰۰"
                      value={newInitialAmount}
                      onChange={(e) => setNewInitialAmount(formatInputNumber(e.target.value))}
                      className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-[11px] text-slate-800 text-right font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-stone-500 mb-1">درصد حسن‌انجام ٪</label>
                      <input
                        type="number"
                        value={newRetentionRate}
                        onChange={(e) => setNewRetentionRate(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-[11px] text-slate-800 text-right font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-500 mb-1">درصد بیمه‌ کارکرد ٪</label>
                      <input
                        type="number"
                        value={newInsuranceRate}
                        onChange={(e) => setNewInsuranceRate(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-[11px] text-slate-800 text-right font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-1.5">
                      <input
                        id="new-exempt-chk"
                        type="checkbox"
                        checked={newIsExempt}
                        onChange={(e) => setNewIsExempt(e.target.checked)}
                        className="w-3.5 h-3.5 border-stone-300 rounded text-slate-900 cursor-pointer"
                      />
                      <label htmlFor="new-exempt-chk" className="text-[10px] text-stone-600 font-bold cursor-pointer select-none">
                        معاف کامل از کسورات (قرارداد خرید کالا)
                      </label>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        id="new-tax-chk"
                        type="checkbox"
                        checked={newHasTaxVal}
                        onChange={(e) => setNewHasTaxVal(e.target.checked)}
                        className="w-3.5 h-3.5 border-stone-300 rounded text-slate-900 cursor-pointer"
                      />
                      <label htmlFor="new-tax-chk" className="text-[10px] text-stone-600 font-bold cursor-pointer select-none">
                        قانون مالیات ارزش افزوده فعال شود (۱۰٪ مازاد)
                      </label>
                    </div>
                  </div>
                </div>
              </details>

              <div className="flex gap-2 pt-2">
                <button
                  id="cancel-add-contractor-btn"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  id="confirm-add-contractor-btn"
                  type="submit"
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  ثبت پرونده حساب
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Printing Modal for Consolidated Report */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-5xl w-full overflow-hidden text-right no-print flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-400" />
                <h3 className="font-extrabold text-sm">پیش‌نمایش و تنظیمات چاپ گزارش تجمیعی پیمانکاران</h3>
              </div>
              <button 
                onClick={() => setShowPrintModal(false)}
                className="text-slate-400 hover:text-white transition-all cursor-pointer text-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Print Settings & Filters */}
            <div className="p-4 bg-slate-50 border-b border-stone-200 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold shrink-0">
              <div>
                <label className="block text-stone-500 mb-1">نوع ساختار گزارش:</label>
                <select
                  value={printReportType}
                  onChange={(e) => setPrintReportType(e.target.value as "summary" | "detailed")}
                  className="w-full bg-white border border-stone-200 rounded-lg p-2 text-[11px] text-slate-800 focus:ring-1 focus:ring-slate-900 cursor-pointer"
                >
                  <option value="summary">تجمیعی کلی (خلاصه تراز اشخاص)</option>
                  <option value="detailed">مشروح تفکیکی (نمایش جزء به جزء قراردادها)</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-500 mb-1">فیلتر شخص پیمانکار:</label>
                <select
                  value={printContractorFilter}
                  onChange={(e) => setPrintContractorFilter(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-lg p-2 text-[11px] text-slate-800 focus:ring-1 focus:ring-slate-900 cursor-pointer"
                >
                  <option value="all">همه پیمانکاران</option>
                  {Array.from(new Set(contractors.map(c => c.name.trim()))).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-500 mb-1">فیلتر رسته فنی / حوزه:</label>
                <select
                  value={printActivityFilter}
                  onChange={(e) => setPrintActivityFilter(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-lg p-2 text-[11px] text-slate-800 focus:ring-1 focus:ring-slate-900 cursor-pointer"
                >
                  <option value="all">همه رسته‌های فعال</option>
                  {Array.from(new Set(contractors.map(c => c.activity_field.trim()))).map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => window.print()}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>چاپ سند / خروجی PDF</span>
                </button>
              </div>
            </div>

            {/* Printable Preview Sheet Container */}
            <div className="p-8 overflow-y-auto bg-stone-100 flex-1">
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  #root, #root-container, #primary-navigation-header, .fixed, .no-print, button, select, input, header, footer {
                    display: none !important;
                    visibility: hidden !important;
                  }
                  #printable-area-grouped-contractors {
                    display: block !important;
                    visibility: visible !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    background: white !important;
                    padding: 20px !important;
                    color: black !important;
                    font-size: 10pt !important;
                  }
                  .print-table th {
                    background-color: #f1f5f9 !important;
                    color: #000 !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                }
              `}} />

              {/* Printable Area */}
              <div 
                id="printable-area-grouped-contractors"
                className="bg-white border border-stone-300 text-slate-800 p-8 rounded-xl space-y-6 shadow-sm max-w-4xl mx-auto text-right"
              >
                {/* Letterhead */}
                <div className="flex justify-between items-center border-b pb-4">
                  <div className="flex flex-col space-y-1">
                    <span className="font-extrabold text-sm text-slate-900 border-r-4 border-slate-900 pr-2.5">
                      گزارش مالی تجمیعی موازنه حساب پیمانکاران جزء
                    </span>
                    <span className="text-[10px] text-stone-500 block">پروژه فعال کارگاهی انبارداری و پیمانکاران</span>
                  </div>
                  <div className="text-left font-mono text-[10px] text-stone-500 space-y-0.5 animate-pulse">
                    <div>تاریخ خروجی: {formatDateForDisplayToday()}</div>
                    <div>وضعیت گزارش: تجمیع چندقراردادی</div>
                  </div>
                </div>

                {/* Main Print content */}
                {(() => {
                  // Filter contractors according to selection
                  const filtered = contractors.filter(c => {
                    const matchName = printContractorFilter === "all" || c.name.trim() === printContractorFilter;
                    const matchActivity = printActivityFilter === "all" || c.activity_field.trim() === printActivityFilter;
                    return matchName && matchActivity;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-12 text-center text-stone-400">
                        هیچ اطلاعاتی مطابق با فیلترهای انتخابی یافت نگردید.
                      </div>
                    );
                  }

                  if (printReportType === "summary") {
                    // Group by contractor name
                    const grouped: Record<string, Contractor[]> = {};
                    filtered.forEach(c => {
                      const name = c.name.trim();
                      if (!grouped[name]) grouped[name] = [];
                      grouped[name].push(c);
                    });

                    let totalGrossGlobal = 0;
                    let totalDeductGlobal = 0;
                    let totalNetGlobal = 0;
                    let totalPaidGlobal = 0;
                    let totalBalanceGlobal = 0;

                    return (
                      <div className="space-y-4">
                        <div className="text-[11px] font-bold text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          ساختار گزارش خلاصه تجمیعی تراز کلی اشخاص و شرکتها
                        </div>
                        <table className="w-full border-collapse border border-stone-300 text-right text-[10px] print-table">
                          <thead>
                            <tr className="bg-slate-100 text-slate-705 font-bold border-b border-stone-300">
                              <th className="border border-stone-300 p-2 text-center w-8">ردیف</th>
                              <th className="border border-stone-300 p-2">نام پیمانکار تجمعی</th>
                              <th className="border border-stone-300 p-2 text-center">تعداد تفویض</th>
                              <th className="border border-stone-300 p-2 text-left">مجموع ناخالص کارکرد</th>
                              <th className="border border-stone-300 p-2 text-left">مجموع کسورات (سپرده و بیمه)</th>
                              <th className="border border-stone-300 p-2 text-left">کارکرد خالص قطعی</th>
                              <th className="border border-stone-300 p-2 text-left">مجموع پرداختی‌های مالی</th>
                              <th className="border border-stone-300 p-2 text-left font-black">صافی طلبکاری پیمانکار</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(grouped).map(([name, list], index) => {
                              const gross = list.reduce((sum, c) => sum + (c.total_gross || 0), 0);
                              const deduct = list.reduce((sum, c) => sum + ((c.total_retention || 0) + (c.total_insurance || 0)), 0);
                              const net = list.reduce((sum, c) => sum + (c.total_net || 0), 0);
                              const paid = list.reduce((sum, c) => sum + (c.total_paid || 0), 0);
                              const balance = list.reduce((sum, c) => sum + (c.remaining_balance || 0), 0);

                              totalGrossGlobal += gross;
                              totalDeductGlobal += deduct;
                              totalNetGlobal += net;
                              totalPaidGlobal += paid;
                              totalBalanceGlobal += balance;

                              return (
                                <tr key={name} className="hover:bg-slate-50 transition-colors">
                                  <td className="border border-stone-300 p-2 text-center font-mono">{convertToPersianDigits(index + 1)}</td>
                                  <td className="border border-stone-300 p-2 font-bold">{name}</td>
                                  <td className="border border-stone-300 p-2 text-center font-mono">{convertToPersianDigits(list.length)}</td>
                                  <td className="border border-stone-300 p-2 text-left font-mono">{formatCurrency(gross)}</td>
                                  <td className="border border-stone-300 p-2 text-left font-mono">-{formatCurrency(deduct)}</td>
                                  <td className="border border-stone-300 p-2 text-left font-mono font-bold">{formatCurrency(net)}</td>
                                  <td className="border border-stone-300 p-2 text-left font-mono">{formatCurrency(paid)}</td>
                                  <td className="border border-stone-300 p-2 text-left font-mono font-black">{formatCurrency(balance)} ریال</td>
                                </tr>
                              );
                            })}
                            {/* Totals */}
                            <tr className="bg-slate-50 font-bold border-t-2 border-stone-400">
                              <td className="border border-stone-300 p-2 text-center" colSpan={3}>جمع کل گزارش تجمیعی</td>
                              <td className="border border-stone-300 p-2 text-left font-mono">{formatCurrency(totalGrossGlobal)}</td>
                              <td className="border border-stone-300 p-2 text-left font-mono">-{formatCurrency(totalDeductGlobal)}</td>
                              <td className="border border-stone-300 p-2 text-left font-mono font-bold">{formatCurrency(totalNetGlobal)}</td>
                              <td className="border border-stone-300 p-2 text-left font-mono">{formatCurrency(totalPaidGlobal)}</td>
                              <td className="border border-stone-300 p-2 text-left font-mono font-black text-rose-700">{formatCurrency(totalBalanceGlobal)} ریال</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  } else {
                    // Detailed List printout
                    return (
                      <div className="space-y-4">
                        <div className="text-[11px] font-bold text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          ساختار گزارش مشروح کلیه قراردادهای ثبت‌شده به همراه الحاقیه‌ها
                        </div>
                        <table className="w-full border-collapse border border-stone-300 text-right text-[9px] print-table">
                          <thead>
                            <tr className="bg-slate-100 text-slate-750 font-bold border-b border-stone-300">
                              <th className="border border-stone-300 p-2 text-center">شناسه</th>
                              <th className="border border-stone-300 p-2">نام پیمانکار</th>
                              <th className="border border-stone-300 p-2">رسته تخصصی</th>
                              <th className="border border-stone-300 p-2">شماره قرارداد / متمم</th>
                              <th className="border border-stone-300 p-2 text-left">مبلغ اولیه</th>
                              <th className="border border-stone-300 p-2 text-left">صورت‌وضعیت</th>
                              <th className="border border-stone-300 p-2 text-left">کسورات</th>
                              <th className="border border-stone-300 p-2 text-left">خالص کارکرد</th>
                              <th className="border border-stone-300 p-2 text-left">کل پرداختی</th>
                              <th className="border border-stone-300 p-2 text-left font-black">مانده تراز طلب</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((sub) => (
                              <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                                <td className="border border-stone-300 p-2 text-center font-mono">{convertToPersianDigits(sub.id)}</td>
                                <td className="border border-stone-300 p-2 font-bold">{sub.name}</td>
                                <td className="border border-stone-300 p-2">{sub.activity_field}</td>
                                <td className="border border-stone-300 p-2 font-mono text-center">
                                  {sub.contract_no ? `${convertToPersianDigits(sub.contract_no)}` : "—"}
                                  {sub.appendix_no ? ` / متمم ${convertToPersianDigits(sub.appendix_no)}` : ""}
                                </td>
                                <td className="border border-stone-300 p-2 text-left font-mono">{sub.initial_amount ? formatCurrency(sub.initial_amount) : "—"}</td>
                                <td className="border border-stone-300 p-2 text-left font-mono">{formatCurrency(sub.total_gross)}</td>
                                <td className="border border-stone-300 p-2 text-left font-mono">-{formatCurrency((sub.total_retention || 0) + (sub.total_insurance || 0))}</td>
                                <td className="border border-stone-300 p-2 text-left font-mono font-bold">{formatCurrency(sub.total_net)}</td>
                                <td className="border border-stone-300 p-2 text-left font-mono">{formatCurrency(sub.total_paid)}</td>
                                <td className="border border-stone-300 p-2 text-left font-mono font-black">{formatCurrency(sub.remaining_balance)} ریال</td>
                              </tr>
                            ))}
                            {/* Detailed Totals */}
                            <tr className="bg-slate-50 font-bold border-t-2 border-stone-400">
                              <td className="border border-stone-300 p-2 text-center" colSpan={4}>مجموع کل قراردادهای جزء به کار رفته</td>
                              <td className="border border-stone-300 p-2 text-left font-mono">{formatCurrency(filtered.reduce((s,c) => s+(c.initial_amount||0), 0))}</td>
                              <td className="border border-stone-300 p-2 text-left font-mono">{formatCurrency(filtered.reduce((s,c) => s+(c.total_gross||0), 0))}</td>
                              <td className="border border-stone-300 p-2 text-left font-mono">-{formatCurrency(filtered.reduce((s,c) => s+((c.total_retention||0)+(c.total_insurance||0)), 0))}</td>
                              <td className="border border-stone-300 p-2 text-left font-mono font-bold">{formatCurrency(filtered.reduce((s,c) => s+(c.total_net||0), 0))}</td>
                              <td className="border border-stone-300 p-2 text-left font-mono">{formatCurrency(filtered.reduce((s,c) => s+(c.total_paid||0), 0))}</td>
                              <td className="border border-stone-300 p-2 text-left font-mono font-black text-rose-700">{formatCurrency(filtered.reduce((s,c) => s+(c.remaining_balance||0), 0))} ریال</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  }
                })()}

                {/* Footer Signatures */}
                <div className="grid grid-cols-3 gap-4 pt-12 text-center text-[10px] font-bold text-slate-600">
                  <div className="border-t border-dashed border-stone-400 pt-2 pb-8">تهیه‌کننده دایره مالی کارگاه</div>
                  <div className="border-t border-dashed border-stone-400 pt-2 pb-8">سرپرست عملیات کارگاهی</div>
                  <div className="border-t border-dashed border-stone-400 pt-2 pb-8">مدیر مالی و اداری پروژه</div>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-slate-900 border-t border-stone-850 flex justify-end gap-3 shrink-0 no-print">
              <button
                onClick={() => setShowPrintModal(false)}
                className="bg-stone-800 hover:bg-stone-750 text-slate-300 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-stone-700"
              >
                بستن پنجره گزارش
              </button>
              <button
                onClick={() => window.print()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>شروع فرآیند چاپ</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
