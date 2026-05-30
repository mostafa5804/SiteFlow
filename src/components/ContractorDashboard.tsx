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
  AlertTriangle 
} from "lucide-react";
import { Contractor } from "../types";
import { formatCurrency, formatNumber, convertToPersianDigits, formatInputNumber, parseInputNumber } from "../utils/formatters";
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
  const [activeTab, setActiveTab] = useState<"list" | "settings">("list");

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
                  placeholder="مثال: آرماتوربندی برادران فضلی"
                  value={newContractorName}
                  onChange={(e) => setNewContractorName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-right"
                />
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
    </div>
  );
}
