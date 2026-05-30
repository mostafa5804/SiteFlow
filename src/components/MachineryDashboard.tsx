import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Truck, 
  Plus, 
  Trash2, 
  Download, 
  Search, 
  ArrowRight, 
  Settings, 
  DollarSign, 
  Clock, 
  Calendar, 
  Coins,
  AlertTriangle 
} from "lucide-react";
import { Machine } from "../types";
import { formatCurrency, formatNumber, convertToPersianDigits, formatInputNumber, parseInputNumber } from "../utils/formatters";
import { exportMachineryToExcel } from "../utils/excelExport";

interface MachineryDashboardProps {
  onBack: () => void;
  onSelectMachine: (id: number) => void;
  onRefreshNotifications?: () => void;
}

export default function MachineryDashboard({ onBack, onSelectMachine, onRefreshNotifications }: MachineryDashboardProps) {
  const [machinery, setMachinery] = useState<Machine[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState("");

  const [filterContractType, setFilterContractType] = useState("all");
  const [filterBalance, setFilterBalance] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("id");
  const [activeTab, setActiveTab] = useState<"list" | "settings">("list");

  const [ownerName, setOwnerName] = useState("");
  const [machineType, setMachineType] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [contractType, setContractType] = useState<"hourly" | "daily">("hourly");
  const [baseRent, setBaseRent] = useState("");
  const [machineCategory, setMachineCategory] = useState("سنگین");

  // Optional Contract specifics
  const [newLeapYearAdjusted, setNewLeapYearAdjusted] = useState(false);
  const [newContractNo, setNewContractNo] = useState("");
  const [newAppendixNo, setNewAppendixNo] = useState("");
  const [newContractStart, setNewContractStart] = useState("");
  const [newContractEnd, setNewContractEnd] = useState("");

  useEffect(() => {
    fetchMachinery();
  }, []);

  const fetchMachinery = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/machinery");
      if (!res.ok) throw new Error("خطا در بارگذاری اطلاعات ماشین‌آلات");
      const data = await res.json();
      setMachinery(data);
      onRefreshNotifications?.();
    } catch (err: any) {
      setError(err.message || "مشکلی رخ داده است.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await fetch("/api/machinery/export");
      if (!res.ok) throw new Error("خطا در پاسخ‌دهی سرور");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `machinery_backup_${new Date().toLocaleDateString("fa-IR").replace(/\//g, "-")}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("خطا در استخراج پشتیبان ماشین‌آلات: " + err.message);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("هشدار: این کار تمام اطلاعات ماشین‌آلات فعلی و کارکردهای ثبت‌شده را حذف کرده و نسخه پشتیبان را جایگزین می‌کند. تضمین می‌کنید مایل به ادامه هستید؟")) {
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const raw = event.target?.result;
        if (!raw) return;
        const parsed = JSON.parse(raw as string);
        const res = await fetch("/api/machinery/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed)
        });

        if (!res.ok) {
          const detail = await res.json();
          throw new Error(detail.error || "خطا در پردازش پشتیبان");
        }

        alert("بازیابی پشتیبان ماشین‌آلات با موفقیت انجام شد.");
        fetchMachinery();
      } catch (err: any) {
        alert("خطا در بارگذاری یا فرمت پشتیبان: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBaseRent = parseFloat(parseInputNumber(baseRent));
    if (!ownerName.trim() || !machineType.trim() || !licensePlate.trim() || isNaN(parsedBaseRent) || parsedBaseRent <= 0) {
      alert("لطفا تمامی فیلدها را با دقت تکمیل نمایید.");
      return;
    }

    try {
      const res = await fetch("/api/machinery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_name: ownerName.trim(),
          machine_type: machineType.trim(),
          license_plate: licensePlate.trim(),
          contract_type: contractType,
          base_rent: parsedBaseRent,
          machine_category: machineCategory,
          leap_year_adjusted: newLeapYearAdjusted ? 1 : 0,
          contract_no: newContractNo.trim() || null,
          appendix_no: newAppendixNo.trim() || null,
          contract_start_date: newContractStart.trim() || null,
          contract_end_date: newContractEnd.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("خطا در ثبت ماشین‌آلات جدید");

      setOwnerName("");
      setMachineType("");
      setLicensePlate("");
      setContractType("hourly");
      setBaseRent("");
      setMachineCategory("سنگین");
      setNewLeapYearAdjusted(false);
      setNewContractNo("");
      setNewAppendixNo("");
      setNewContractStart("");
      setNewContractEnd("");
      setShowAddModal(false);
      fetchMachinery();
    } catch (err: any) {
      alert(err.message || "خطا در شبکه رخ داد.");
    }
  };

  const handleDeleteMachine = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("آیا از حذف اطلاعات این دستگاه و کلیه سوابق کارکردی و مالی آن اطمینان دارید؟")) {
      return;
    }
    if (!confirm("تأیید مجدد جهت اطمینان نهایی:\nکلیه کارکردها، شیفت‌ها، گزارش کار و پرداخت‌های این دستگاه برای همیشه پاک خواهند شد. آیا واقعاً برای حذف اطمینان کامل دارید؟")) {
      return;
    }

    try {
      const res = await fetch(`/api/machinery/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("خطا در حذف ماشین‌آلات");
      fetchMachinery();
    } catch (err: any) {
      alert(err.message || "خطا در ثبت درخواست حذف.");
    }
  };

  const totalCalculated = machinery.reduce((sum, m) => sum + (m.total_calculated || 0), 0);
  const totalPaid = machinery.reduce((sum, m) => sum + (m.total_paid || 0), 0);
  const totalRemaining = machinery.reduce((sum, m) => sum + (m.remaining_balance || 0), 0);
  const hourlyCount = machinery.filter(m => m.contract_type === "hourly").length;
  const dailyCount = machinery.filter(m => m.contract_type === "daily").length;

  const filteredMachinery = machinery
    .filter(m => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        m.owner_name.toLowerCase().includes(q) ||
        m.machine_type.toLowerCase().includes(q) ||
        m.license_plate.includes(q) ||
        String(m.id).includes(q);

      const matchesContract = filterContractType === "all" || m.contract_type === filterContractType;
      const matchesCategory = filterCategory === "all" || m.machine_category === filterCategory;

      let matchesBalance = true;
      if (filterBalance === "has_balance") {
        matchesBalance = (m.remaining_balance || 0) > 0;
      } else if (filterBalance === "no_balance") {
        matchesBalance = (m.remaining_balance || 0) <= 0;
      }

      return matchesSearch && matchesContract && matchesBalance && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "owner") {
        return a.owner_name.localeCompare(b.owner_name, "fa");
      }
      if (sortBy === "balance_desc") {
        return (b.remaining_balance || 0) - (a.remaining_balance || 0);
      }
      if (sortBy === "calculated_desc") {
        return (b.total_calculated || 0) - (a.total_calculated || 0);
      }
      return a.id - b.id;
    });

  return (
    <div id="machinery-dashboard-root" className="container mx-auto px-4 py-6 max-w-7xl animate-fade-in">
      {/* Header and Nav */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button 
            id="back-to-landing-btn-machinery"
            onClick={onBack}
            className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-755 rounded-xl shadow-sm transition-all cursor-pointer"
            title="بازگشت به منوی کل"
          >
            <ArrowRight className="w-5 h-5 text-mac-main" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">۳. ماشین‌آلات (پایش کارکرد و حساب)</h1>
            <p className="text-xs text-slate-500 mt-1">رهگیری اجاره ماهانه (فرمول متناسب ۳۰/۳۱ روزه ماه شمسی) و محاسبه کارکرد ساعتی تجهیزات سنگین و سبک</p>
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
            مدیریت ماشین‌آلات
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
            id="import-machinery-backup-input"
            type="file"
            accept=".json"
            onChange={handleImportBackup}
            className="hidden"
          />
          <button
            id="export-machinery-excel-btn"
            onClick={() => exportMachineryToExcel(machinery)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>خروجی اکسل کارکردها</span>
          </button>
          {activeTab === "list" && (
            <button
              id="open-add-machinery-modal-btn"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 text-white px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت دستگاه کارگاهی جدید</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === "settings" ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/70 text-right">
            <h2 className="text-md sm:text-lg font-bold text-slate-800 tracking-tight">تنظیمات و نگهداری سیستمی ماشین‌آلات</h2>
            <p className="text-stone-500 text-xs mt-1">همانند بخش انبار کارگاه، در این پانل می‌توانید پرونده کامل کارکرد و پرداخت‌های ماشین‌آلات سنگین و سبک را برون‌بری یا بازیابی فرمایید.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
            {/* Backup Card */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="inline-flex p-3 bg-blue-50 text-blue-700 rounded-2xl">
                  <Download className="w-6 h-6" />
                </div>
                <h3 className="text-md font-bold text-slate-900">پشتیبان‌گیری کامل از ماشین‌آلات (JSON Export)</h3>
                <p className="text-xs text-stone-500 leading-relaxed font-semibold">
                  دریافت نسخه بک‌آپ تفصیلی برای آرشیو سوابق، ترازهای باقیمانده، کارکرد ساعتی یا اجاره‌ای دوره‌ای از ماشین‌آلات ترابری کارگاه.
                </p>
              </div>

              <button
                onClick={handleExportBackup}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4 text-blue-100" />
                <span>دانلود نسخه پشتیبان ماشین‌آلات (.json)</span>
              </button>
            </div>

            {/* Restore Card */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-2xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-md font-bold text-slate-900">بازیابی پرونده ماشین‌آلات (JSON Import)</h3>
                <p className="text-xs text-stone-500 leading-relaxed font-semibold">
                  با آپلود فایل پشتیبان متنی استریل <code className="bg-stone-50 px-1 py-0.5 rounded font-mono">.json</code>، اطلاعات کارگیری تجهیزات را همگام‌سازی و جایگزین کنید.
                </p>
              </div>

              <button
                onClick={() => document.getElementById("import-machinery-backup-input")?.click()}
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
        <div id="machinery-card-gross" className="bg-white p-4 rounded-xl border border-stone-200/80 border-r-4 border-r-mac-dark shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">کل کارکرد هزینه شده</span>
            <span className="p-1 px-2 bg-stone-100 text-mac-main rounded border border-stone-200">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-sm sm:text-base font-black text-mac-dark mt-2">{formatCurrency(totalCalculated)}</p>
        </div>

        <div id="machinery-card-payments" className="bg-white p-4 rounded-xl border border-stone-200/80 border-r-4 border-r-emerald-600 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">کل مبالغ پرداختی</span>
            <span className="p-1 px-2 bg-emerald-50 text-emerald-600 rounded border border-[#a7f3d0]">
              <DollarSign className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-sm sm:text-base font-black text-emerald-700 mt-2">{formatCurrency(totalPaid)}</p>
        </div>

        <div id="machinery-card-remaining" className="bg-white p-4 rounded-xl border border-stone-200/80 border-r-4 border-r-orange-650 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-700">مانده طلب معوق مالکین</span>
            <span className="p-1 px-2 bg-orange-50 text-orange-600 rounded border border-[#fed7aa]">
              <Coins className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-sm sm:text-base font-black text-orange-700 mt-2">{formatCurrency(totalRemaining)}</p>
        </div>

        <div id="machinery-card-hourly" className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">کارکردهای ساعتی</span>
            <span className="p-1 px-2 bg-amber-50 text-amber-600 rounded border border-amber-200">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-sm sm:text-base font-extrabold text-slate-900 mt-2">
            {convertToPersianDigits(hourlyCount)} <span className="text-xs text-stone-400 font-normal">دستگاه</span>
          </p>
        </div>

        <div id="machinery-card-daily" className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">قرارداد اجاره ماهانه</span>
            <span className="p-1 px-2 bg-indigo-50 text-indigo-600 rounded border border-indigo-200">
              <Calendar className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-sm sm:text-base font-extrabold text-slate-900 mt-2">
            {convertToPersianDigits(dailyCount)} <span className="text-xs text-stone-400 font-normal">دستگاه</span>
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div id="machinery-table-container-card" className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 border-b border-stone-100 bg-slate-50/20 space-y-3">
          <div className="flex flex-row flex-wrap sm:flex-nowrap items-center justify-between gap-3 w-full">
            
            {/* Search Query */}
            <div className="relative w-full sm:w-[220px] shrink-0">
              <Search className="absolute right-3.1 top-2.5 text-slate-400 w-3.5 h-3.5" />
              <input
                id="machinery-search-input"
                type="text"
                placeholder="پویش مدل، مالک یا پلاک..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 bg-white border border-stone-200 rounded-xl text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-mac-main transition-all text-right font-medium"
              />
            </div>

            {/* Dropdown Filters on a single row */}
            <div className="flex flex-row items-center gap-3 overflow-x-auto flex-nowrap shrink-0 py-0.5">
              
              {/* Category filter */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-bold text-stone-500 font-sans">دسته:</span>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-white border border-stone-200 rounded-xl text-[10px] w-[100px] px-1.5 py-1 text-slate-705 font-medium focus:outline-none focus:ring-1 focus:ring-mac-main cursor-pointer truncate"
                >
                  <option value="all">همه</option>
                  <option value="سنگین">سنگین</option>
                  <option value="سبک">سبک</option>
                </select>
              </div>

              {/* Contract type filter */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-bold text-stone-500 font-sans">مبنا:</span>
                <select
                  value={filterContractType}
                  onChange={(e) => setFilterContractType(e.target.value)}
                  className="bg-white border border-stone-200 rounded-xl text-[10px] w-[100px] px-1.5 py-1 text-slate-707 font-medium focus:outline-none focus:ring-1 focus:ring-mac-main cursor-pointer truncate"
                >
                  <option value="all">همه</option>
                  <option value="hourly">ساعتی</option>
                  <option value="daily">روزانه/ماهانه</option>
                </select>
              </div>

              {/* Balance status filter */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-bold text-stone-500 font-sans">حساب:</span>
                <select
                  value={filterBalance}
                  onChange={(e) => setFilterBalance(e.target.value)}
                  className="bg-white border border-stone-200 rounded-xl text-[10px] w-[100px] px-1.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-mac-main cursor-pointer truncate"
                >
                  <option value="all">همه</option>
                  <option value="has_balance">طلبکار</option>
                  <option value="no_balance">تسویه</option>
                </select>
              </div>

              {/* Sorting rule */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-bold text-stone-500 font-sans">چیدمان:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-stone-200 rounded-xl text-[10px] w-[100px] px-1.5 py-1 text-slate-705 font-medium focus:outline-none focus:ring-1 focus:ring-mac-main cursor-pointer truncate"
                >
                  <option value="id">شناسه</option>
                  <option value="owner">نام مالک</option>
                  <option value="balance_desc">بیشترین طلب</option>
                  <option value="calculated_desc">بیشترین کارکرد</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-stone-500 bg-slate-50/50 px-4 py-2.5 rounded-xl border border-stone-100">
            <span>
              دستگاه‌های همخوان فیلتر: <strong className="text-slate-800">{convertToPersianDigits(filteredMachinery.length)}</strong> دستگاه فعال کارگاه
            </span>
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterContractType("all");
                setFilterCategory("all");
                setFilterBalance("all");
                setSortBy("id");
              }}
              className="text-[10px] text-mac-main font-bold hover:underline cursor-pointer"
            >
              پاک کردن فیلترها
            </button>
          </div>
        </div>

        {/* Real Dynamic Data Table */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mac-main mb-2"></div>
            <p className="text-xs text-stone-500 font-bold">در حال بارگیری مشخصات و پرونده ماشین‌آلات سنگین...</p>
          </div>
        ) : filteredMachinery.length === 0 ? (
          <div className="p-16 text-center">
            <Truck className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-stone-600">تجهیزی یافت نشد</h3>
            <p className="text-xs text-stone-400 mt-1">با کلیک روی دکمه ثبت دستگاه کارگاه جدید، اولین تجهیز را معرفی نمایید.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-right">
              <thead className="bg-slate-50 text-stone-500 font-bold border-b border-stone-100">
                <tr>
                  <th className="py-4 px-6 text-center">ردیف</th>
                  <th className="py-4 px-6">نام مالک دستگاه</th>
                  <th className="py-4 px-6">مدل و تجهیز</th>
                  <th className="py-4 px-6">شماره پلاک شهربانی</th>
                  <th className="py-4 px-6">مبنای محاسبه</th>
                  <th className="py-4 px-6 text-left">نرخ قرارداد پایه (ریال)</th>
                  <th className="py-4 px-6 text-center">مجموع کارکرد</th>
                  <th className="py-4 px-6 text-left">کل هزینه کارکرد</th>
                  <th className="py-4 px-6 text-left text-emerald-700">مجموع دریافتی</th>
                  <th className="py-4 px-6 text-left text-orange-700 font-extrabold">مانده طلب ملک</th>
                  <th className="py-4 px-6 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100/50">
                {filteredMachinery.map((m, index) => (
                  <tr 
                    key={m.id} 
                    onClick={() => onSelectMachine(m.id)}
                    className="hover:bg-orange-50/10 transition-all cursor-pointer group"
                  >
                    <td className="py-4 px-6 text-center text-stone-400 font-mono text-[11px]">{convertToPersianDigits(index + 1)}</td>
                    <td className="py-4 px-6 font-bold text-slate-800 group-hover:text-mac-main transition-colors">{m.owner_name}</td>
                    <td className="py-4 px-6 font-bold text-stone-700">
                      <div className="flex items-center gap-2">
                        <span>{m.machine_type}</span>
                        {m.machine_category === "سبک" ? (
                          <span className="bg-cyan-50 text-cyan-700 text-[10px] font-black px-1.5 py-0.5 rounded border border-cyan-200/50">سبک</span>
                        ) : (
                          <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-1.5 py-0.5 rounded border border-indigo-200/50">سنگین</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-slate-100 text-stone-850 font-serif border border-stone-200 rounded px-2 py-0.5 text-[11px]">
                        {m.license_plate}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        m.contract_type === "hourly" 
                          ? "bg-amber-50 text-amber-800 border border-amber-200" 
                          : "bg-indigo-50 text-indigo-800 border border-indigo-200"
                      }`}>
                        {m.contract_type === "hourly" ? "ساعتی" : "ماهانه"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-left font-mono font-medium">
                      {formatCurrency(m.base_rent)} 
                      <span className="text-[10px] text-stone-400 mr-1">
                        / {m.contract_type === "hourly" ? "ساعت" : "ماه"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-stone-800">
                      {formatNumber(m.total_performance)} 
                      <span className="text-[10px] text-stone-400 font-normal mr-1">
                        {m.contract_type === "hourly" ? " ساعت" : " روز"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-left text-mac-main font-bold font-mono">{formatCurrency(m.total_calculated)}</td>
                    <td className="py-4 px-6 text-left text-emerald-700 font-bold font-mono">{formatCurrency(m.total_paid)}</td>
                    <td className="py-4 px-6 text-left font-black font-mono text-sm">
                      <span className={(m.remaining_balance || 0) > 0 ? "text-orange-700" : "text-stone-400"}>
                        {formatCurrency(m.remaining_balance)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        id={`delete-machine-${m.id}-btn`}
                        onClick={(e) => handleDeleteMachine(m.id, e)}
                        className="p-1 px-2 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                        title="حذف کلیه اطلاعات"
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

      {/* Add Machinery Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full overflow-hidden text-right"
          >
            <div className="p-5 bg-mac-dark text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm font-bold">ثبت تجهیز کارگاه و ماشین‌آلات</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xl"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleAddMachine} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">نام مالک دستگاه</label>
                <input
                  id="owner-name-input"
                  type="text"
                  required
                  placeholder="مثال: آقای حسین جمشیدی"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-mac-main text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">نوع دستگاه و مدل</label>
                <input
                  id="machine-type-input"
                  type="text"
                  required
                  placeholder="مثال: لودر کوماتسو WA470"
                  value={machineType}
                  onChange={(e) => setMachineType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-mac-main text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">شماره پلاک شهربانی</label>
                <input
                  id="license-plate-input"
                  type="text"
                  required
                  placeholder="مثال: ۲۲ الف ۴۵۶ ایران ۲۳"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-mac-main text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">نوع مبنای قرارداد اجاره</label>
                <select
                  id="contract-type-select"
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value as "hourly" | "daily")}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-mac-main text-right"
                >
                  <option value="hourly">ساعتی (بر اساس ساعات واقعی کارکرد)</option>
                  <option value="daily">روزانه (اجاره پایه ماهانه تقسیم بر روزهای ماه)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">دسته‌بندی ماشین‌آلات</label>
                <select
                  id="machine-category-select"
                  value={machineCategory}
                  onChange={(e) => setMachineCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-mac-main text-right"
                >
                  <option value="سنگین">سنگین (لودر، گریدر، بلدوزر، بیل مکانیکی و...)</option>
                  <option value="سبک">سبک (نیسان، سواری، تانکر آب پاش کوچک و...)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">
                  {contractType === "hourly" ? "نرخ اجاره هر ساعت (ریال)" : "مبلغ کل اجاره ماهانه پایه (ریال)"}
                </label>
                <input
                  id="base-rent-input"
                  type="text"
                  required
                  placeholder="مثال: ۴,۵۰۰,۰۰۰"
                  value={baseRent}
                  onChange={(e) => setBaseRent(formatInputNumber(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-805 focus:outline-none focus:ring-2 focus:ring-slate-900 text-right font-medium font-mono"
                  dir="ltr"
                />
              </div>

              <details className="border border-stone-100 rounded-xl p-3 bg-stone-50/50 group cursor-pointer text-xs">
                <summary className="text-[11px] font-bold text-slate-700 select-none flex items-center justify-between">
                  <span>⚙️ تنظیمات قرارداد و تصحیح ماه اسفند (اختیاری)</span>
                  <span className="text-[10px] text-stone-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                
                <div className="pt-3 space-y-3 cursor-default" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <input
                      id="leap-year-adj-chk"
                      type="checkbox"
                      checked={newLeapYearAdjusted}
                      onChange={(e) => setNewLeapYearAdjusted(e.target.checked)}
                      className="w-4 h-4 text-slate-900 border-stone-300 rounded cursor-pointer"
                    />
                    <label htmlFor="leap-year-adj-chk" className="text-[10px] text-slate-700 font-bold cursor-pointer select-none">
                      تصحیح سال کبیسه برای اسفند ماه فعال است (اسفند ۳۰ روز تمام حساب شود)
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-stone-500 mb-1">شماره پیمان</label>
                      <input
                        type="text"
                        placeholder="۱۰۴/ش/۰۵"
                        value={newContractNo}
                        onChange={(e) => setNewContractNo(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-[11px] text-slate-850 text-right font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-500 mb-1">شماره متمم الحاقیه</label>
                      <input
                        type="text"
                        placeholder="۱"
                        value={newAppendixNo}
                        onChange={(e) => setNewAppendixNo(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-[11px] text-slate-850 text-right font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-stone-500 mb-1">تاریخ واگذاری دستگاه</label>
                      <input
                        type="text"
                        placeholder="۱۴۰۴/۰۱/۱۵"
                        value={newContractStart}
                        onChange={(e) => setNewContractStart(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-[11px] text-slate-850 text-right font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-500 mb-1">تاریخ ترخیص دستگاه</label>
                      <input
                        type="text"
                        placeholder="۱۴۰۴/۱۲/۲۹"
                        value={newContractEnd}
                        onChange={(e) => setNewContractEnd(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-[11px] text-slate-850 text-right font-mono"
                      />
                    </div>
                  </div>
                </div>
              </details>

              <div className="flex gap-2 pt-3">
                <button
                  id="cancel-add-machinery-btn"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  id="confirm-add-machinery-btn"
                  type="submit"
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  ثبت مشخصات قرارداد
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
