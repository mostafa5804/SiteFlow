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
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Printer,
  X,
  Archive,
  ArchiveRestore,
  FileText
} from "lucide-react";
import { Machine } from "../types";
import { formatCurrency, formatNumber, convertToPersianDigits, formatInputNumber, parseInputNumber, getJalaliDateStr } from "../utils/formatters";
import { exportMachineryToExcel } from "../utils/excelExport";
import { generateDirectPDF } from "../utils/pdfGenerator";
import { SleekLicensePlate } from "./SleekLicensePlate";

const PERSIAN_MONTHS: Record<number, string> = {
  1: "فروردین",
  2: "اردیبهشت",
  3: "خرداد",
  4: "تیر",
  5: "مرداد",
  6: "شهریور",
  7: "مهر",
  8: "آبان",
  9: "آذر",
  10: "دی",
  11: "بهمن",
  12: "اسفند",
};

interface MachineryDashboardProps {
  settings?: Record<string, string>;
  onBack: () => void;
  onSelectMachine: (id: number) => void;
  onRefreshNotifications?: () => void;
}

export default function MachineryDashboard({ settings = {}, onBack, onSelectMachine, onRefreshNotifications }: MachineryDashboardProps) {
  const [machinery, setMachinery] = useState<Machine[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState("");

  const [filterContractType, setFilterContractType] = useState("all");
  const [filterBalance, setFilterBalance] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterArchive, setFilterArchive] = useState<"active" | "archived" | "all">("active");
  const [sortBy, setSortBy] = useState("id");
  const [activeTab, setActiveTab] = useState<"list" | "consolidated" | "settings">("list");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedMonth, setSelectedMonth] = useState<"all" | number>("all");
  const [selectedYear, setSelectedYear] = useState<"all" | number>("all");

  // Printing state for consolidated reports
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ active: boolean; message: string }>({ active: false, message: "" });
  const [pdfOrientation, setPdfOrientation] = useState<"portrait" | "landscape">("portrait");
  const [printReportType, setPrintReportType] = useState<"summary" | "detailed">("summary");
  const [printOwnerFilter, setPrintOwnerFilter] = useState("all");
  const [printCategoryFilter, setPrintCategoryFilter] = useState("all");
  const [showActiveQuickSelect, setShowActiveQuickSelect] = useState(false);

  const formatDateForDisplayToday = () => {
    return getJalaliDateStr();
  };

  const [ownerName, setOwnerName] = useState("");
  const [machineType, setMachineType] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [contractType, setContractType] = useState<"hourly" | "daily" | "monthly">("hourly");
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
    if (!ownerName.trim() || !machineType.trim() || isNaN(parsedBaseRent) || parsedBaseRent <= 0) {
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

  const handleToggleArchiveMachine = async (id: number, is_archived: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const actionName = is_archived ? "خروج از بایگانی" : "بایگانی (آرشیو)";
    if (!confirm(`آیا مطمئن هستید که می‌خواهید دستگاه جاری را ${actionName} نمایید؟`)) {
      return;
    }
    try {
      const res = await fetch(`/api/machinery/${id}/archive`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: !is_archived ? 1 : 0 })
      });
      if (!res.ok) throw new Error("خطا در تغییر وضعیت بایگانی");
      fetchMachinery();
    } catch (err: any) {
      alert(err.message || "مشکلی رخ داده است.");
    }
  };

  const totalCalculated = machinery.reduce((sum, m) => sum + (m.total_calculated || 0), 0);
  const totalPaid = machinery.reduce((sum, m) => sum + (m.total_paid || 0), 0);
  const totalRemaining = machinery.reduce((sum, m) => sum + (m.remaining_balance || 0), 0);
  const hourlyCount = machinery.filter(m => m.contract_type === "hourly").length;
  const dailyCount = machinery.filter(m => m.contract_type === "daily").length;
  const monthlyCount = machinery.filter(m => m.contract_type === "monthly").length;

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

      const matchesArchive = filterArchive === "all" ||
        (filterArchive === "archived" && m.is_archived) ||
        (filterArchive === "active" && !m.is_archived);

      return matchesSearch && matchesContract && matchesBalance && matchesCategory && matchesArchive;
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
    <div id="machinery-dashboard-root" className="container mx-auto px-4 py-6 max-w-7xl animate-fade-in" style={{ width: "1250px", maxWidth: "none" }}>
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
            onClick={() => setActiveTab("consolidated")}
            className={`px-4 py-2.5 rounded-lg cursor-pointer transition-all ${
              activeTab === "consolidated"
                ? "bg-white text-stone-900 shadow-xs font-bold"
                : "hover:text-stone-900"
            }`}
          >
            گزارش تجمیعی مالکین
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
      ) : activeTab === "consolidated" ? (
        <div className="space-y-6 text-right animate-fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/70 text-right">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-5 h-5 text-slate-850 animate-pulse" />
              <h2 className="text-md sm:text-lg font-black text-slate-800 tracking-tight">گزارش تجمیعی تراز مالکین ماشین‌آلات</h2>
            </div>
            <p className="text-stone-500 text-xs mt-1">
              در این پانل ویژه، ماشین‌آلات متعدد متعلق به یک مالک به صورت هوشمند و خودکار تجمیع و تحلیل شده‌اند. شما می‌توانید تراز مالی و موازنه طلبکاری کلی هر مالک (برای کل ناوگان فعال او در پروژه) را در این قسمت به همراه تفکیک جزء به جزء هر خودرو رصد فرمایید.
            </p>
          </div>

          {/* Filter Bar with Search, Month, and Year selects */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <div className="relative w-full max-w-xs">
                <Search className="absolute right-3 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="پویش نام مالک، مدل خودرو یا پلاک..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-9 py-1.5 bg-slate-50 border border-stone-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-right font-medium"
                />
              </div>

              {/* Month selector */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-stone-500 whitespace-nowrap">دوره گزارش:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedMonth(val === "all" ? "all" : parseInt(val, 10));
                  }}
                  className="p-1.5 px-3 border border-stone-200 rounded-xl bg-white text-stone-850 font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="all">📊 تجمعی (مجموع سال)</option>
                  <option value="1">فروردین (۰۱)</option>
                  <option value="2">اردیبهشت (۰۲)</option>
                  <option value="3">خرداد (۰۳)</option>
                  <option value="4">تیر (۰۴)</option>
                  <option value="5">مرداد (۰۵)</option>
                  <option value="6">شهریور (۰۶)</option>
                  <option value="7">مهر (۰۷)</option>
                  <option value="8">آبان (۰۸)</option>
                  <option value="9">آذر (۰۹)</option>
                  <option value="10">دی (۱۰)</option>
                  <option value="11">بهمن (۱۱)</option>
                  <option value="12">اسفند (۱۲)</option>
                </select>
              </div>

              {/* Year selector */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-stone-500 whitespace-nowrap">سال مالی:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedYear(val === "all" ? "all" : parseInt(val, 10));
                  }}
                  className="p-1.5 px-3 border border-stone-200 rounded-xl bg-white text-stone-850 font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="all">📆 تجمعی (همه سال‌ها)</option>
                  <option value="1406">سال ۱۴۰۶</option>
                  <option value="1405">سال ۱۴۰۵</option>
                  <option value="1404">سال ۱۴۰۴</option>
                  <option value="1403">سال ۱۴۰۳</option>
                  <option value="1402">سال ۱۴۰۲</option>
                </select>
              </div>
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
              // 1. First map and filter machinery by selected month and year
              const periodFilteredMachinery = machinery.map((m) => {
                const performances = (m as any).performance || [];
                const payments = (m as any).payments || [];

                const filteredPerformances = performances.filter((perf: any) => {
                  if (selectedMonth !== "all" && perf.month_index !== selectedMonth) return false;
                  if (selectedYear !== "all") {
                    const pYear = perf.year || 1405;
                    if (pYear !== selectedYear) return false;
                  }
                  return true;
                });

                const filteredPayments = payments.filter((pay: any) => {
                  if (selectedMonth !== "all") {
                    if (!pay.payment_date) return false;
                    const parts = pay.payment_date.split("/");
                    if (parts.length < 2 || parseInt(parts[1], 10) !== selectedMonth) return false;
                  }
                  if (selectedYear !== "all") {
                    if (!pay.payment_date) return false;
                    const parts = pay.payment_date.split("/");
                    if (parts.length < 1 || parseInt(parts[0], 10) !== selectedYear) return false;
                  }
                  return true;
                });

                const total_performance = filteredPerformances.reduce((sum: number, p: any) => sum + (p.performance_value || 0), 0);
                const total_calculated = filteredPerformances.reduce((sum: number, p: any) => sum + (p.total_calculated_amount || 0), 0);
                const total_paid = filteredPayments.reduce((sum: number, pay: any) => sum + (pay.amount || 0), 0);
                const remaining_balance = total_calculated - total_paid;

                return {
                  ...m,
                  total_performance,
                  total_calculated,
                  total_paid,
                  remaining_balance,
                };
              }).filter((m) => {
                if (selectedMonth !== "all" || selectedYear !== "all") {
                  return m.total_calculated !== 0 || m.total_paid !== 0;
                }
                return true;
              });

              // 2. Grouping machinery by ownerName
              const grouped: Record<string, Machine[]> = {};
              periodFilteredMachinery.forEach((m) => {
                const nameKey = (m.owner_name || "").trim();
                if (!nameKey) return;
                if (!grouped[nameKey]) {
                  grouped[nameKey] = [];
                }
                grouped[nameKey].push(m);
              });

              // 3. Apply Search query
              const filteredGroups = Object.entries(grouped).filter(([name, list]) => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                const nameMatch = name.toLowerCase().includes(query);
                const typeMatch = list.some((m) => (m.machine_type || "").toLowerCase().includes(query));
                const plateMatch = list.some((m) => (m.license_plate || "").toLowerCase().includes(query));
                return nameMatch || typeMatch || plateMatch;
              });

              if (filteredGroups.length === 0) {
                return (
                  <div className="bg-white p-12 text-center border border-stone-200 rounded-2xl">
                    <Layers className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                    <p className="text-xs text-stone-500">هیچ مالکی همخوان با فیلتر جستجوی شما پیدا نشد.</p>
                  </div>
                );
              }

              return filteredGroups.map(([name, list]) => {
                const isExpanded = !!expandedGroups[name];

                // Group totals
                const totalCalculatedGrp = list.reduce((sum, m) => sum + (m.total_calculated || 0), 0);
                const totalPaidGrp = list.reduce((sum, m) => sum + (m.total_paid || 0), 0);
                const totalBalanceGrp = list.reduce((sum, m) => sum + (m.remaining_balance || 0), 0);

                return (
                  <div key={name} className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden text-right">
                    {/* Collapsible header */}
                    <div
                      onClick={() => setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }))}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/65 transition-colors select-none"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl mt-0.5">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-800 text-sm">{name}</h3>
                          <span className="text-[10px] text-stone-500 font-bold bg-stone-100 px-2 py-0.5 rounded-md mt-1 inline-block">
                            تعداد تجهیزات ناوگان: {convertToPersianDigits(list.length)} دستگاه فعال
                          </span>
                        </div>
                      </div>

                      {/* Header Financial Bento */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/50 p-3 rounded-xl border border-stone-100 font-mono text-[11px] shrink-0">
                        <div>
                          <div className="text-[9px] text-stone-500 font-sans font-bold">کل کارکرد ناوگان</div>
                          <div className="font-bold text-slate-700 mt-0.5 text-left">{formatCurrency(totalCalculatedGrp)}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-stone-500 font-sans font-bold">مجموع کل دریافتی</div>
                          <div className="font-bold text-emerald-700 mt-0.5 text-left">{formatCurrency(totalPaidGrp)}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-orange-700 font-sans font-bold">باقیمانده موازنه طلبکاری</div>
                          <div className="font-black text-orange-700 text-xs mt-0.5 text-left">{formatCurrency(totalBalanceGrp)}</div>
                        </div>
                      </div>

                      {/* Folder indicator */}
                      <div className="flex justify-end pr-2">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-stone-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-stone-400" />
                        )}
                      </div>
                    </div>

                    {/* Detailed expanded content */}
                    {isExpanded && (
                      <div className="border-t border-stone-100 p-5 bg-stone-50/10">
                        <div className="mb-3 text-[10px] text-stone-500 font-bold">زیرمجموعه ماشین‌آلات متعلق به {name} :</div>
                        <div className="overflow-x-auto rounded-xl border border-stone-200 max-w-full bg-white">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-slate-50 text-stone-500 font-bold border-b border-stone-150">
                              <tr>
                                <th className="p-3 text-center">شناسه دستگاه</th>
                                <th className="p-3">نوع و کدهای فنی ماشین</th>
                                <th className="p-3">پلاک خودرو کالیبره</th>
                                <th className="p-3">مبنا قرارداد تعرفه</th>
                                <th className="p-3 text-left text-slate-800">مبلغ دوره گزارش (ریال)</th>
                                <th className="p-3 text-left text-emerald-700">مجموع پرداختی</th>
                                <th className="p-3 text-left text-orange-700 font-extrabold">صافی مانده طلب</th>
                                <th className="p-3 text-center">ورق کالیبره</th>
                                <th className="p-3 text-center">عملیات</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-150/50">
                              {list.map((m) => (
                                <tr key={m.id} className="hover:bg-blue-50/10 transition-colors text-[11px]">
                                  <td className="p-3 text-center font-mono text-stone-400">{convertToPersianDigits(m.id)}</td>
                                  <td className="p-3 font-bold text-slate-800 max-w-[150px] truncate" title={m.machine_type}>
                                    <span className="block truncate max-w-full text-right">{m.machine_type}</span>
                                  </td>
                                  <td className="p-3">
                                    {m.license_plate ? (
                                      <SleekLicensePlate plate={m.license_plate} />
                                    ) : (
                                      <span className="text-stone-400 italic">بدون پلاک</span>
                                    )}
                                  </td>
                                  <td className="p-3 font-medium">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      m.contract_type === "hourly" 
                                        ? "bg-amber-50 text-amber-700 border border-amber-200" 
                                        : "bg-purple-50 text-purple-700 border border-purple-200"
                                    }`}>
                                      {m.contract_type === "hourly" ? "ساعتی" : "ماهانه مستقیم / روزی"}
                                    </span>
                                  </td>
                                  <td className="p-3 text-left font-mono text-slate-700 font-bold">{formatCurrency(m.total_calculated)}</td>
                                  <td className="p-3 text-left font-mono text-emerald-700 font-semibold">{formatCurrency(m.total_paid)}</td>
                                  <td className="p-3 text-left font-mono text-orange-700 font-black">{formatCurrency(m.remaining_balance)}</td>
                                  <td className="p-3 text-center">
                                    <button 
                                      onClick={() => onSelectMachine(m.id)}
                                      className="text-slate-900 hover:text-black bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap"
                                    >
                                      گزارش کارکرد و حسابداری
                                    </button>
                                  </td>
                                  <td className="p-3 text-center">
                                    <button
                                      onClick={(e) => handleDeleteMachine(m.id, e)}
                                      className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded transition-colors cursor-pointer"
                                      title="حذف این تجهیز از ناوگان"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 inline-block" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
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
            <span className="text-xs font-bold text-slate-500">قراردادهای روزانه</span>
            <span className="p-1 px-2 bg-emerald-50 text-emerald-600 rounded border border-emerald-200">
              <Calendar className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-sm sm:text-base font-extrabold text-slate-900 mt-2">
            {convertToPersianDigits(dailyCount)} <span className="text-xs text-stone-400 font-normal">دستگاه</span>
          </p>
        </div>

        <div id="machinery-card-monthly" className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">قراردادهای ماهانه</span>
            <span className="p-1 px-2 bg-blue-50 text-blue-600 rounded border border-blue-200">
              <Calendar className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-sm sm:text-base font-extrabold text-slate-900 mt-2">
            {convertToPersianDigits(monthlyCount)} <span className="text-xs text-stone-400 font-normal">دستگاه</span>
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
                  <option value="daily">روزانه</option>
                  <option value="monthly">ماهانه</option>
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

              {/* Archive filter */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-bold text-stone-500 font-sans">بایگانی:</span>
                <select
                  value={filterArchive}
                  onChange={(e) => setFilterArchive(e.target.value as "active" | "archived" | "all")}
                  className="bg-white border border-stone-200 rounded-xl text-[10px] w-[110px] px-1.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-mac-main cursor-pointer truncate"
                >
                  <option value="active">دستگاه‌های فعال</option>
                  <option value="archived">بایگانی شده (آرشیو)</option>
                  <option value="all">همه موارد</option>
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
                setFilterArchive("active");
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
                  <th className="py-4 px-2 text-center w-12">ردیف</th>
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
                    <td className="py-4 px-2 text-center text-stone-400 font-mono text-[11px] w-12">{convertToPersianDigits(index + 1)}</td>
                    <td className="py-4 px-6 font-bold text-slate-800 group-hover:text-mac-main transition-colors">
                      <div className="flex items-center gap-1.5">
                        <span>{m.owner_name}</span>
                        {m.is_archived ? (
                          <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-black">بایگانی شده</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-stone-700">
                      <div className="truncate max-w-[170px] whitespace-nowrap block" title={m.machine_type}>
                        {m.machine_type}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {m.license_plate ? (
                        <SleekLicensePlate plate={m.license_plate} />
                      ) : (
                        <span className="text-stone-400 italic">بدون پلاک</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        m.contract_type === "hourly" 
                          ? "bg-amber-50 text-amber-800 border border-amber-200" 
                          : m.contract_type === "daily"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-blue-50 text-blue-800 border border-blue-200"
                      }`}>
                        {m.contract_type === "hourly" ? "ساعتی" : m.contract_type === "daily" ? "روزانه" : "ماهانه"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-left font-mono font-medium">
                      {formatCurrency(m.base_rent)} 
                      <span className="text-[10px] text-stone-400 mr-1">
                        / {m.contract_type === "hourly" ? "ساعت" : m.contract_type === "daily" ? "روز" : "ماه"}
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
                      <div className="flex items-center justify-center gap-1">
                        <button
                          id={`archive-machine-${m.id}-btn`}
                          onClick={(e) => handleToggleArchiveMachine(m.id, !!m.is_archived, e)}
                          className={`p-1 px-2.5 rounded-lg transition-all cursor-pointer ${
                            m.is_archived 
                              ? "bg-amber-100 hover:bg-amber-200 text-amber-800" 
                              : "hover:bg-slate-100 text-stone-400 hover:text-stone-700"
                          }`}
                          title={m.is_archived ? "خروج پرونده از آرشیو" : "بایگانی و آرشیو پرونده"}
                        >
                          {m.is_archived ? (
                            <ArchiveRestore className="w-3.5 h-3.5 inline-block" />
                          ) : (
                            <Archive className="w-3.5 h-3.5 inline-block" />
                          )}
                        </button>
                        <button
                          id={`delete-machine-${m.id}-btn`}
                          onClick={(e) => handleDeleteMachine(m.id, e)}
                          className="p-1 px-2 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                          title="حذف کلیه اطلاعات"
                        >
                          <Trash2 className="w-4 h-4 inline-block" />
                        </button>
                      </div>
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
                  list="existing-owners-list"
                  placeholder="مثال: آقای حسین جمشیدی"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-mac-main text-right"
                />
                <datalist id="existing-owners-list">
                  {Array.from(new Set(machinery.map(m => m.owner_name.trim()))).map(name => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                {machinery.length > 0 && (
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={() => setShowActiveQuickSelect(!showActiveQuickSelect)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold transition-all flex items-center gap-1 cursor-pointer inline-flex"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showActiveQuickSelect ? "rotate-180" : ""}`} />
                      <span>{showActiveQuickSelect ? "پنهان‌سازی مراجع مالکین فعال" : "انتخاب سریع از مالکین فعال موجود..."}</span>
                    </button>
                    {showActiveQuickSelect && (
                      <motion.div 
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1.5 flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 bg-slate-50 border border-stone-100 rounded-lg select-none"
                      >
                        {Array.from(new Set(machinery.map(m => m.owner_name.trim()))).map(name => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setOwnerName(name)}
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
                <label className="block text-xs font-bold text-stone-500 mb-1.5">شماره پلاک شهربانی (اختیاری)</label>
                <input
                  id="license-plate-input"
                  type="text"
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
                  onChange={(e) => setContractType(e.target.value as "hourly" | "daily" | "monthly")}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-mac-main text-right"
                >
                  <option value="hourly">ساعتی (بر اساس ساعات واقعی کارکرد)</option>
                  <option value="daily">روزانه (نرخ روزمرد مستقل از تعداد روزهای ماه)</option>
                  <option value="monthly">ماهانه (اجاره پایه ماهانه تقسیم بر روزهای ماه)</option>
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
                  {contractType === "hourly" 
                    ? "نرخ اجاره هر ساعت (ریال)" 
                    : contractType === "daily" 
                    ? "نرخ اجاره هر روز (ریال)" 
                    : "مبلغ کل اجاره ماهانه پایه (ریال)"}
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

      {/* Printing Modal for Consolidated Report */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-5xl w-full overflow-hidden text-right printing-modal-card flex flex-col max-h-[90vh]"
          >
            {/* Modal Header - Hidden on Print */}
            <div className="no-print">
              <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-extrabold text-sm">پیش‌نمایش و تنظیمات چاپ گزارش تجمیعی ناوگان ماشین‌آلات</h3>
                </div>
                <button 
                  onClick={() => setShowPrintModal(false)}
                  className="text-slate-400 hover:text-white transition-all cursor-pointer text-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Settings & Filters - Hidden on Print */}
            <div className="no-print">
              <div className="p-4 bg-slate-50 border-b border-stone-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs font-semibold shrink-0 font-sans">
                <div>
                  <label className="block text-stone-500 mb-1">نوع ساختار گزارش:</label>
                  <select
                    value={printReportType}
                    onChange={(e) => setPrintReportType(e.target.value as "summary" | "detailed")}
                    className="w-full bg-white border border-stone-200 rounded-lg p-2 text-[11px] text-slate-800 focus:ring-1 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="summary">تجمیعی کلی (خلاصه تراز مالکین)</option>
                    <option value="detailed">مشروح تفکیکی (سیاهه جزء به جزء ناوگان)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-500 mb-1">دوره گزارش ماهانه:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedMonth(val === "all" ? "all" : parseInt(val, 10));
                    }}
                    className="w-full bg-white border border-stone-200 rounded-lg p-2 text-[11px] text-slate-800 focus:ring-1 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="all">📊 تجمعی (مجموع سال)</option>
                    <option value="1">فروردین (۰۱)</option>
                    <option value="2">اردیبهشت (۰۲)</option>
                    <option value="3">خرداد (۰۳)</option>
                    <option value="4">تیر (۰۴)</option>
                    <option value="5">مرداد (۰۵)</option>
                    <option value="6">شهریور (۰۶)</option>
                    <option value="7">مهر (۰۷)</option>
                    <option value="8">آبان (۰۸)</option>
                    <option value="9">آذر (۰۹)</option>
                    <option value="10">دی (۱۰)</option>
                    <option value="11">بهمن (۱۱)</option>
                    <option value="12">اسفند (۱۲)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-500 mb-1">سال مالی گزارش:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedYear(val === "all" ? "all" : parseInt(val, 10));
                    }}
                    className="w-full bg-white border border-stone-200 rounded-lg p-2 text-[11px] text-slate-800 focus:ring-1 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="all">📆 تجمعی (همه سال‌ها)</option>
                    <option value="1406">سال ۱۴۰۶</option>
                    <option value="1405">سال ۱۴۰۵</option>
                    <option value="1404">سال ۱۴۰۴</option>
                    <option value="1403">سال ۱۴۰۳</option>
                    <option value="1402">سال ۱۴۰۲</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-500 mb-1">فیلتر شخص مالک / پیمانکار:</label>
                  <select
                    value={printOwnerFilter}
                    onChange={(e) => setPrintOwnerFilter(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-lg p-1.5 text-[11px] text-slate-800 focus:ring-1 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="all">همه مالکین ناوگان</option>
                    {Array.from(new Set(machinery.map(m => m.owner_name.trim()))).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-500 mb-1">فیلتر مبنای اجاره / قرارداد:</label>
                  <select
                    value={printCategoryFilter}
                    onChange={(e) => setPrintCategoryFilter(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-lg p-2 text-[11px] text-slate-800 focus:ring-1 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="all">همه مبناها</option>
                    <option value="hourly">ساعتی (کارکرد کارگاهی)</option>
                    <option value="daily">روزانه / ماهانه ثابت</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-500 mb-1">جهت صفحه PDF:</label>
                  <select
                    value={pdfOrientation}
                    onChange={(e) => setPdfOrientation(e.target.value as any)}
                    className="w-full bg-white border border-stone-200 rounded-lg p-2 text-[11px] text-slate-800 focus:ring-1 focus:ring-slate-900 cursor-pointer font-sans"
                  >
                    <option value="portrait">عمودی (Portrait)</option>
                    <option value="landscape">افقی (Landscape)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Printable Preview Sheet Container */}
            <div className="p-8 overflow-y-auto bg-stone-100 flex-1">
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  @page {
                    size: A4 portrait;
                    margin: 15mm 15mm 15mm 15mm !important;
                  }
                  body {
                    background: white !important;
                    color: black !important;
                    font-size: 10pt !important;
                    direction: rtl !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  /* Collapse parent layout padding/margins/heights completely */
                  html, body, #root, #unified-app-root, main {
                    display: block !important;
                    background: white !important;
                    color: black !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    height: auto !important;
                    min-height: 0 !important;
                    overflow: visible !important;
                    box-shadow: none !important;
                    border: none !important;
                  }
                  /* Fully strip centering from fixed backdrops & modals */
                  div.fixed.inset-0, 
                  div.fixed.inset-0 > div,
                  .printing-modal-card {
                    display: block !important;
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    width: 100% !important;
                    height: auto !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    min-height: 0 !important;
                    transform: none !important;
                    box-shadow: none !important;
                    background: white !important;
                    border: none !important;
                    border-radius: 0 !important;
                  }
                  /* Hide all headers, footers and no-print elements */
                  header, footer, #primary-navigation-header, .no-print, button, select, input {
                    display: none !important;
                  }
                  /* Hide all sibling elements of the main layout to avoid blank pages and spacing */
                  body:has(#printable-area-grouped-machinery) main > *:not(:has(#printable-area-grouped-machinery)) {
                    display: none !important;
                  }
                  #printable-area-grouped-machinery {
                    display: block !important;
                    position: relative !important;
                    width: 100% !important;
                    background: white !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    border: none !important;
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
                id="printable-area-grouped-machinery"
                className="bg-white border border-stone-300 text-slate-800 p-8 rounded-xl space-y-6 shadow-sm max-w-4xl mx-auto text-right"
              >
                {/* Letterhead */}
                <div className="flex justify-between items-center border-b pb-4">
                  <div className="flex items-center gap-3">
                    {settings.logo_img ? (
                      <img src={settings.logo_img} className="w-10 h-10 object-contain rounded bg-white p-0.5 border" alt="لوگو" referrerPolicy="no-referrer" />
                    ) : settings.logo_text ? (
                      <div className="w-10 h-10 rounded bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                        {settings.logo_text}
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                        فنی
                      </div>
                    )}
                    <div className="flex flex-col space-y-1">
                      <span className="font-extrabold text-sm text-slate-900 border-r-4 border-slate-900 pr-2.5">
                        {settings.enterprise_name || "دفتر کارگاه فنی الوان"}
                      </span>
                      <span className="text-[10px] text-stone-500 pr-2.5 font-bold">پروژه: {settings.project_name || "سامانه انبارداری و ماشین‌آلات"}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center space-y-0.5">
                    <strong className="text-sm font-black text-slate-950">گزارش مالی تجمیعی موازنه حساب و کارکرد مالکین ماشین‌آلات</strong>
                    <span className="text-[9px] bg-neutral-100 px-3 py-0.5 rounded-full font-bold">
                      روکش جامع کارکرد ناوگان و موازنه معوقات کارگاهی
                    </span>
                  </div>

                  <div className="text-left font-mono text-[9px] text-stone-500 space-y-0.5">
                    <div>تاریخ خروجی: {formatDateForDisplayToday()}</div>
                    <div>وضعیت گزارش: تجمیع تراز مالکین ناوگان</div>
                  </div>
                </div>

                {/* Main Print content */}
                {(() => {
                  // 1. Filter machinery by month/year chosen on Dashboard
                  const periodFiltered = machinery.map((m) => {
                    const performances = (m as any).performance || [];
                    const payments = (m as any).payments || [];

                    const filteredPerformances = performances.filter((perf: any) => {
                      if (selectedMonth !== "all" && perf.month_index !== selectedMonth) return false;
                      if (selectedYear !== "all") {
                        const pYear = perf.year || 1405;
                        if (pYear !== selectedYear) return false;
                      }
                      return true;
                    });

                    const filteredPayments = payments.filter((pay: any) => {
                      if (selectedMonth !== "all") {
                        if (!pay.payment_date) return false;
                        const parts = pay.payment_date.split("/");
                        if (parts.length < 2 || parseInt(parts[1], 10) !== selectedMonth) return false;
                      }
                      if (selectedYear !== "all") {
                        if (!pay.payment_date) return false;
                        const parts = pay.payment_date.split("/");
                        if (parts.length < 1 || parseInt(parts[0], 10) !== selectedYear) return false;
                      }
                      return true;
                    });

                    const total_performance = filteredPerformances.reduce((sum: number, p: any) => sum + (p.performance_value || 0), 0);
                    const total_calculated = filteredPerformances.reduce((sum: number, p: any) => sum + (p.total_calculated_amount || 0), 0);
                    const total_paid = filteredPayments.reduce((sum: number, pay: any) => sum + (pay.amount || 0), 0);
                    const remaining_balance = total_calculated - total_paid;

                    return {
                      ...m,
                      total_performance,
                      total_calculated,
                      total_paid,
                      remaining_balance,
                    };
                  }).filter((m) => {
                    if (selectedMonth !== "all" || selectedYear !== "all") {
                      return m.total_calculated !== 0 || m.total_paid !== 0;
                    }
                    return true;
                  });

                  // 2. Filter machinery according to print options selected in modal
                  const filtered = periodFiltered.filter(m => {
                    const matchOwner = printOwnerFilter === "all" || m.owner_name.trim() === printOwnerFilter;
                    const matchCat = printCategoryFilter === "all" || m.contract_type === printCategoryFilter;
                    return matchOwner && matchCat;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-12 text-center text-stone-400">
                        هیچ اطلاعات ناوگانی مطابق با فیلترهای انتخابی یافت نگردید.
                      </div>
                    );
                  }

                  if (printReportType === "summary") {
                    // Group by owner name
                    const grouped: Record<string, Machine[]> = {};
                    filtered.forEach(m => {
                      const name = m.owner_name.trim();
                      if (!grouped[name]) grouped[name] = [];
                      grouped[name].push(m);
                    });

                    let totalGrossGlobal = 0;
                    let totalPaidGlobal = 0;
                    let totalBalanceGlobal = 0;

                    return (
                      <div className="space-y-4">
                        <div className="text-[11px] font-bold text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          ساختار گزارش خلاصه تجمیعی تراز مالکین ماشین‌آلات (مجموع تراز ناوگان)
                        </div>
                        <table className="w-full border-collapse border border-stone-300 text-right text-[10px] print-table">
                          <thead>
                            <tr className="bg-slate-100 text-slate-705 font-bold border-b border-stone-300">
                              <th className="border border-stone-300 p-2 text-center w-8">ردیف</th>
                              <th className="border border-stone-300 p-2">نام مالک ناوگان</th>
                              <th className="border border-stone-300 p-2 text-center">تعداد ماشین‌آلات</th>
                              <th className="border border-stone-300 p-2 text-left">مجموع مبلغ دوره گزارش (ریال)</th>
                              <th className="border border-stone-300 p-2 text-left">مجموع پرداختی‌های مالی</th>
                              <th className="border border-stone-300 p-2 text-left font-black">صافی طلبکاری مالک</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(grouped).map(([name, list], index) => {
                              const gross = list.reduce((sum, m) => sum + (m.total_calculated || 0), 0);
                              const paid = list.reduce((sum, m) => sum + (m.total_paid || 0), 0);
                              const balance = list.reduce((sum, m) => sum + (m.remaining_balance || 0), 0);

                              totalGrossGlobal += gross;
                              totalPaidGlobal += paid;
                              totalBalanceGlobal += balance;

                              return (
                                <tr key={name} className="hover:bg-slate-50 transition-colors">
                                  <td className="border border-stone-300 p-2 text-center font-mono">{convertToPersianDigits(index + 1)}</td>
                                  <td className="border border-stone-300 p-2 font-bold">{name}</td>
                                  <td className="border border-stone-300 p-2 text-center font-mono">{convertToPersianDigits(list.length)} دستگاه</td>
                                  <td className="border border-stone-300 p-2 text-left font-mono">{formatCurrency(gross)}</td>
                                  <td className="border border-stone-300 p-2 text-left font-mono">{formatCurrency(paid)}</td>
                                  <td className="border border-stone-300 p-2 text-left font-mono font-black">{formatCurrency(balance)}</td>
                                </tr>
                              );
                            })}
                            {/* Totals */}
                            <tr className="bg-slate-50 font-bold border-t-2 border-stone-400">
                              <td className="border border-stone-300 p-2 text-center" colSpan={3}>جمع کل گزارش تجمیعی ناوگان</td>
                              <td className="border border-stone-300 p-2 text-left font-mono">{formatCurrency(totalGrossGlobal)}</td>
                              <td className="border border-stone-300 p-2 text-left font-mono">{formatCurrency(totalPaidGlobal)}</td>
                              <td className="border border-stone-300 p-2 text-left font-mono font-black text-emerald-800">{formatCurrency(totalBalanceGlobal)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  } else {
                    // Detailed List printout
                    const sortedFiltered = [...filtered].sort((a, b) => a.owner_name.trim().localeCompare(b.owner_name.trim(), "fa"));

                    // Calculate spans for grouped owners
                    const ownerRowsSpans: Record<number, number> = {};
                    let lastOwner = "";
                    let lastStartIndex = -1;

                    sortedFiltered.forEach((item, index) => {
                      const trimmedOwner = item.owner_name.trim();
                      if (trimmedOwner !== lastOwner) {
                        lastOwner = trimmedOwner;
                        lastStartIndex = index;
                        ownerRowsSpans[index] = 1;
                      } else {
                        ownerRowsSpans[lastStartIndex]++;
                      }
                    });

                    let groupNo = 0;

                    return (
                      <div className="space-y-4">
                        <div className="text-[11px] font-bold text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          ساختار گزارش تفصیلی و سیاهه‌بندی جزء به جزء کل خودروهای ناوگان فعال (با ادغام واحدهای دارای مالک مشترک)
                        </div>
                        <table className="w-full border-collapse border border-stone-300 text-right text-[9px] print-table">
                          <thead>
                            <tr className="bg-slate-100 text-slate-755 font-bold border-b border-stone-300">
                              <th className="border border-stone-300 p-2 text-center w-12">شناسه</th>
                              <th className="border border-stone-300 p-2">نام مالک</th>
                              <th className="border border-stone-300 p-2">نوع دستگاه و مدل</th>
                              <th className="border border-stone-300 p-2">شماره پلاک شهربانی</th>
                              <th className="border border-stone-300 p-2">مبنای قرارداد</th>
                              <th className="border border-stone-300 p-2 text-left">مبلغ دوره گزارش (ریال)</th>
                              <th className="border border-stone-300 p-2 text-left">کل مبالغ پرداختی</th>
                              <th className="border border-stone-300 p-2 text-left font-black">مانده تراز طلب</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedFiltered.map((item, index) => {
                              const isFirst = ownerRowsSpans[index] !== undefined;
                              if (isFirst) {
                                groupNo++;
                              }
                              return (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                  {isFirst ? (
                                    <>
                                      <td className="border border-stone-300 p-2 text-center font-mono font-bold bg-slate-50/50" rowSpan={ownerRowsSpans[index]}>
                                        {convertToPersianDigits(groupNo)}
                                      </td>
                                      <td className="border border-stone-300 p-2 font-bold bg-slate-50/40" rowSpan={ownerRowsSpans[index]}>
                                        {item.owner_name}
                                      </td>
                                    </>
                                  ) : null}
                                  <td className="border border-stone-300 p-2 font-semibold truncate max-w-[150px]" title={item.machine_type}>{item.machine_type}</td>
                                  <td className="border border-stone-300 p-2 text-center align-middle">
                                    {item.license_plate ? (
                                      <div className="flex justify-center items-center">
                                        <SleekLicensePlate plate={item.license_plate} />
                                      </div>
                                    ) : (
                                      <span className="text-stone-400 italic">بدون پلاک</span>
                                    )}
                                  </td>
                                  <td className="border border-stone-300 p-2 text-center">
                                    {item.contract_type === "hourly" ? "ساعتی" : item.contract_type === "daily" ? "روزمزد روزانه" : "ماهانه"}
                                  </td>
                                  <td className="border border-stone-300 p-2 text-left font-mono">{formatCurrency(item.total_calculated)}</td>
                                  <td className="border border-stone-300 p-2 text-left font-mono">{formatCurrency(item.total_paid)}</td>
                                  <td className="border border-stone-300 p-2 text-left font-mono font-black">{formatCurrency(item.remaining_balance)}</td>
                                </tr>
                              );
                            })}
                            {/* Detailed Totals */}
                            <tr className="bg-slate-50 font-bold border-t-2 border-stone-400">
                              <td className="border border-stone-300 p-2 text-center" colSpan={5}>جمع کل ناوگان کارگاه</td>
                              <td className="border border-stone-300 p-2 text-left font-mono">{formatCurrency(sortedFiltered.reduce((s,c) => s+(c.total_calculated||0), 0))}</td>
                              <td className="border border-stone-300 p-2 text-left font-mono">{formatCurrency(sortedFiltered.reduce((s,c) => s+(c.total_paid || 0), 0))}</td>
                              <td className="border border-stone-300 p-2 text-left font-mono font-black text-emerald-800">{formatCurrency(sortedFiltered.reduce((s,c) => s+(c.remaining_balance||0), 0))}</td>
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
                  <div className="border-t border-dashed border-stone-400 pt-2 pb-8">سرپرست لجستیک و ترابری</div>
                  <div className="border-t border-dashed border-stone-400 pt-2 pb-8">سرپرست نظارت کارگاهی</div>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-slate-900 border-t border-stone-850 flex flex-col gap-3 shrink-0 no-print">
              {pdfProgress.active && (
                <div className="bg-amber-500/15 text-amber-300 border-r-4 border-amber-500 p-2.5 rounded text-[11px] font-bold flex items-center gap-2 animate-pulse text-right">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0"></span>
                  <span>{pdfProgress.message}</span>
                </div>
              )}
              <div className="flex justify-end gap-3 flex-wrap">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="bg-stone-800 hover:bg-stone-750 text-slate-300 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-stone-700"
                  disabled={pdfProgress.active}
                >
                  بستن پنجره گزارش
                </button>
                <button
                  onClick={() => generateDirectPDF("printable-area-grouped-machinery", "گزارش_تجمعی_ناوگان_ماشین_آلات", (active, message) => setPdfProgress({ active, message }), { orientation: pdfOrientation })}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
                  disabled={pdfProgress.active}
                >
                  {pdfProgress.active ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>دانلود مستقیم PDF</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
                  disabled={pdfProgress.active}
                >
                  <Printer className="w-4 h-4" />
                  <span>چاپ با پرینتر مرورگر</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
