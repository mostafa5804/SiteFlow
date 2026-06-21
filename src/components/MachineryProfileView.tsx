import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  ArrowLeft, 
  Truck, 
  Plus, 
  Trash2, 
  Clock, 
  Calendar, 
  Coins, 
  DollarSign, 
  FileText,
  Printer,
  Archive,
  ArchiveRestore
} from "lucide-react";
import { MachineProfile } from "../types";
import { formatCurrency, formatNumber, convertToPersianDigits, formatInputNumber, parseInputNumber } from "../utils/formatters";
import { SleekLicensePlate } from "./SleekLicensePlate";

interface MachineryProfileViewProps {
  machineId: number;
  onBack: () => void;
  onRefreshNotifications?: () => void;
}

const MONTHS_LIST = [
  { index: 1, name: "فروردین", days: 31 },
  { index: 2, name: "اردیبهشت", days: 31 },
  { index: 3, name: "خرداد", days: 31 },
  { index: 4, name: "تیر", days: 31 },
  { index: 5, name: "مرداد", days: 31 },
  { index: 6, name: "شهریور", days: 31 },
  { index: 7, name: "مهر", days: 30 },
  { index: 8, name: "آبان", days: 30 },
  { index: 9, name: "آذر", days: 30 },
  { index: 10, name: "دی", days: 30 },
  { index: 11, name: "بهمن", days: 30 },
  { index: 12, name: "اسفند", days: 30 },
];

export default function MachineryProfileView({ machineId, onBack, onRefreshNotifications }: MachineryProfileViewProps) {
  const [profile, setProfile] = useState<MachineProfile | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"performance" | "payments">("performance");

  const [perfSearch, setPerfSearch] = useState("");
  const [perfSort, setPerfSort] = useState("id_desc");
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("all");

  const [paySearch, setPaySearch] = useState("");
  const [paySort, setPaySort] = useState("id_desc");

  const [showPerfModal, setShowPerfModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printYearFilter, setPrintYearFilter] = useState<string>("all");

  const [selectedMonthIndex, setSelectedMonthIndex] = useState(1);
  const [performanceValue, setPerformanceValue] = useState("");
  const [rateValue, setRateValue] = useState("");
  const [performanceYear, setPerformanceYear] = useState<number>(1405);

  const [paymentDate, setPaymentDate] = useState("1405/03/01");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");

  // 1. Machine general edit states
  const [showMachineEditModal, setShowMachineEditModal] = useState(false);
  const [editOwnerName, setEditOwnerName] = useState("");
  const [editMachineType, setEditMachineType] = useState("");
  const [editLicensePlate, setEditLicensePlate] = useState("");
  const [editContractType, setEditContractType] = useState<"hourly" | "daily" | "monthly">("hourly");
  const [editBaseRent, setEditBaseRent] = useState("");
  const [editMachineCategory, setEditMachineCategory] = useState("سنگین");
  const [editLeapYearAdjusted, setEditLeapYearAdjusted] = useState(false);
  const [editContractNo, setEditContractNo] = useState("");
  const [editAppendixNo, setEditAppendixNo] = useState("");
  const [editContractStart, setEditContractStart] = useState("");
  const [editContractEnd, setEditContractEnd] = useState("");

  // 2. Performance edit states
  const [showPerfEditModal, setShowPerfEditModal] = useState(false);
  const [editingPerformanceId, setEditingPerformanceId] = useState<number | null>(null);
  const [editingMonthIndex, setEditingMonthIndex] = useState(1);
  const [editingPerformanceValue, setEditingPerformanceValue] = useState("");
  const [editingPerformanceRate, setEditingPerformanceRate] = useState("");
  const [editingPerformanceYear, setEditingPerformanceYear] = useState<number>(1405);

  // 3. Payment edit states
  const [showPaymentEditModal, setShowPaymentEditModal] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [editingPaymentDate, setEditingPaymentDate] = useState("");
  const [editingPaymentAmount, setEditingPaymentAmount] = useState("");
  const [editingPaymentDescription, setEditingPaymentDescription] = useState("");

  const startEditMachine = () => {
    if (!profile) return;
    setEditOwnerName(profile.owner_name);
    setEditMachineType(profile.machine_type);
    setEditLicensePlate(profile.license_plate || "");
    setEditContractType(profile.contract_type as "hourly" | "daily" | "monthly");
    setEditBaseRent(profile.base_rent ? formatInputNumber(profile.base_rent) : "");
    setEditMachineCategory(profile.machine_category || "سنگین");
    setEditLeapYearAdjusted(!!profile.leap_year_adjusted);
    setEditContractNo(profile.contract_no || "");
    setEditAppendixNo(profile.appendix_no || "");
    setEditContractStart(profile.contract_start_date || "");
    setEditContractEnd(profile.contract_end_date || "");
    setShowMachineEditModal(true);
  };

  const startEditPerformance = (perf: any) => {
    setEditingPerformanceId(perf.id);
    setEditingMonthIndex(perf.month_index || 1);
    setEditingPerformanceValue(String(perf.performance_value));
    setEditingPerformanceRate(String(perf.rate_used || ""));
    setEditingPerformanceYear(perf.year || 1405);
    setShowPerfEditModal(true);
  };

  const startEditPayment = (pay: any) => {
    setEditingPaymentId(pay.id);
    setEditingPaymentDate(pay.payment_date);
    setEditingPaymentAmount(formatInputNumber(pay.amount));
    setEditingPaymentDescription(pay.description || "");
    setShowPaymentEditModal(true);
  };

  const handleEditMachineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBaseRent = parseFloat(parseInputNumber(editBaseRent));
    if (!editOwnerName.trim() || !editMachineType.trim() || isNaN(parsedBaseRent) || parsedBaseRent <= 0) {
      alert("لطفا مقادیر اجباری را تکمیل نمایید.");
      return;
    }

    try {
      const res = await fetch(`/api/machinery/${machineId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_name: editOwnerName.trim(),
          machine_type: editMachineType.trim(),
          license_plate: editLicensePlate.trim(),
          contract_type: editContractType,
          base_rent: parsedBaseRent,
          machine_category: editMachineCategory,
          leap_year_adjusted: editLeapYearAdjusted ? 1 : 0,
          contract_no: editContractNo.trim() || null,
          appendix_no: editAppendixNo.trim() || null,
          contract_start_date: editContractStart.trim() || null,
          contract_end_date: editContractEnd.trim() || null,
        })
      });

      if (!res.ok) throw new Error("بروزرسانی ماشین‌آلات متوقف شد");
      alert("تنظیمات و مشخصات دستگاه با موفقیت اصلاح گردید.");
      setShowMachineEditModal(false);
      fetchProfile();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditPerformanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerformanceId || !editingPerformanceValue) return;

    const monthObj = MONTHS_LIST.find(m => m.index === editingMonthIndex);
    if (!monthObj) return;

    try {
      const res = await fetch(`/api/machinery/performance/${editingPerformanceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month_name: monthObj.name,
          month_index: monthObj.index,
          performance_value: parseFloat(editingPerformanceValue),
          rate_used: editingPerformanceRate ? parseFloat(editingPerformanceRate) : null,
          year: editingPerformanceYear,
        })
      });

      if (!res.ok) throw new Error("خطا در همگام‌سازی اطلاعات کارکرد");
      setShowPerfEditModal(false);
      fetchProfile();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(parseInputNumber(editingPaymentAmount));
    if (!editingPaymentId || isNaN(parsedAmount) || parsedAmount <= 0) return;

    try {
      const res = await fetch(`/api/machinery/payments/${editingPaymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_date: editingPaymentDate,
          amount: parsedAmount,
          description: editingPaymentDescription,
        })
      });

      if (!res.ok) throw new Error("خطا در ثبت فیش‌های اصلاحی مالی");
      setShowPaymentEditModal(false);
      fetchProfile();
    } catch (err: any) {
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [machineId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const [profileRes, settingsRes] = await Promise.all([
        fetch(`/api/machinery/${machineId}`),
        fetch("/api/settings")
      ]);

      if (!profileRes.ok) throw new Error("خطا در دریافت اطلاعات دستگاه");
      const data = await profileRes.json();
      setProfile(data);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }

      onRefreshNotifications?.();
    } catch (err: any) {
      alert(err.message || "خطا در بارگیری اطلاعات");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!profile) return;
    const actionName = profile.is_archived ? "خروج از بایگانی" : "بایگانی (آرشیو)";
    if (!confirm(`آیا اطمینان دارید که می‌خواهید دستگاه جاری را ${actionName} نمایید؟`)) {
      return;
    }
    try {
      const res = await fetch(`/api/machinery/${machineId}/archive`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: !profile.is_archived ? 1 : 0 })
      });
      if (!res.ok) throw new Error("خطا در تغییر وضعیت بایگانی دستگاه");
      fetchProfile();
    } catch (err: any) {
      alert(err.message || "مشکلی رخ داده است.");
    }
  };

  const handleAddPerformance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!performanceValue || parseFloat(performanceValue) <= 0) {
      alert("لطفا میزان کارکرد معتبری وارد نمایید.");
      return;
    }

    const monthObj = MONTHS_LIST.find(m => m.index === selectedMonthIndex);
    if (!monthObj) return;

    const parsedRate = rateValue ? parseFloat(parseInputNumber(rateValue)) : undefined;

    try {
      const res = await fetch(`/api/machinery/${machineId}/performance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month_name: monthObj.name,
          month_index: monthObj.index,
          performance_value: parseFloat(performanceValue),
          rate_used: parsedRate,
          year: performanceYear,
        }),
      });

      if (!res.ok) throw new Error("خطا در ثبت کارکرد دستگاه");
      
      setPerformanceValue("");
      setRateValue("");
      setShowPerfModal(false);
      fetchProfile();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeletePerformance = async (id: number) => {
    if (!confirm("آیا از حذف این سند کارکرد اطمینان دارید؟")) return;
    if (!confirm("تأیید مجدد جهت اطمینان نهایی:\nپیرو هشدار قبلی، آیا واقعاً قصد حذف دائمی گزارش کارکرد این تجهیز را دارید؟ ساعات پیمایش کم شده و حساب تغییر می‌کند.")) return;

    try {
      const res = await fetch(`/api/machinery/performance/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("خطا در حذف کارکرد");
      fetchProfile();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(parseInputNumber(paymentAmount));
    if (!paymentDate.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("اطلاعات سند پرداخت ناقص یا نامعتبر است.");
      return;
    }

    try {
      const res = await fetch(`/api/machinery/${machineId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_date: paymentDate.trim(),
          amount: parsedAmount,
          description: paymentDescription.trim()
        }),
      });

      if (!res.ok) throw new Error("خطا در ثبت پرداخت مالی");
      
      setPaymentAmount("");
      setPaymentDescription("");
      setShowPaymentModal(false);
      fetchProfile();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeletePayment = async (id: number) => {
    if (!confirm("آیا از حذف این ردیف پرداخت مایل هستید؟")) return;
    if (!confirm("تأیید مجدد جهت اطمینان نهایی:\nپیرو هشدار پیشین، آیا مایلید این تراکنش پرداختی به مالک تجهیز برای همیشه باطل شده و حذف گردد؟ موازنه حساب تغییر خواهد کرد.")) return;

    try {
      const res = await fetch(`/api/machinery/payments/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("خطا در حذف حواله پرداختی");
      fetchProfile();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div id="machinery-profile-loading" className="p-16 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mac-main mb-2"></div>
        <p className="text-xs text-stone-500">در حال بارگیری تاریخچه کارکرد و حساب...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-16 text-center text-xs">
        <p className="text-rose-500 font-bold">اطلاعات دستگاه یافت نشد.</p>
        <button onClick={onBack} className="mt-4 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs cursor-pointer">بازگشت</button>
      </div>
    );
  }

  const printedPerformances = (profile.performance || [])
    .filter(p => printYearFilter === "all" || String(p.year || 1405) === printYearFilter);

  const printTotalCalculated = printedPerformances.reduce((sum, p) => sum + p.total_calculated_amount, 0);

  const printedPayments = (profile.payments || [])
    .filter(pay => {
      if (printYearFilter === "all") return true;
      const yr = pay.payment_date?.split("/")[0] || "1405";
      return yr === printYearFilter;
    });

  const printTotalPaid = printedPayments.reduce((sum, p) => sum + p.amount, 0);
  const printRemainingBalance = printTotalCalculated - printTotalPaid;

  const filteredPerformance = (profile.performance || [])
    .filter(perf => {
      const q = perfSearch.toLowerCase().trim();
      const matchSearch = !q ||
        perf.month_name.toLowerCase().includes(q) ||
        String(perf.performance_value).includes(q) ||
        String(perf.total_calculated_amount).includes(q);
      const matchYear = selectedYearFilter === "all" || String(perf.year || 1405) === selectedYearFilter;
      return matchSearch && matchYear;
    })
    .sort((a, b) => {
      if (perfSort === "value_desc") return b.performance_value - a.performance_value;
      if (perfSort === "cost_desc") return b.total_calculated_amount - a.total_calculated_amount;
      return b.month_index - a.month_index;
    });

  const filteredPayments = (profile.payments || [])
    .filter(pay => {
      const q = paySearch.toLowerCase().trim();
      return !q ||
        pay.payment_date.toLowerCase().includes(q) ||
        (pay.description && pay.description.toLowerCase().includes(q)) ||
        String(pay.amount).includes(q);
    })
    .sort((a, b) => {
      if (paySort === "amount_desc") return b.amount - a.amount;
      if (paySort === "date_desc") return b.payment_date.localeCompare(a.payment_date);
      return b.id - a.id;
    });

  return (
    <div id="machinery-profile-root" className="container mx-auto px-4 py-6 max-w-7xl animate-fade-in">
      {/* Profile Header Title Card */}
      <div className="bg-white rounded-2xl border border-stone-150 p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-right">
          <div className="p-3 bg-mac-dark text-white rounded-2xl shadow-xs">
            <Truck className="w-6 h-6 text-orange-200" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-950">{profile.machine_type}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs">
              {profile.license_plate ? (
                <span className="inline-flex items-center gap-1.5 bg-slate-100 text-stone-850 border border-stone-200 rounded px-2.5 py-0.5 font-bold">
                  <span>پلاک:</span>
                  <SleekLicensePlate plate={profile.license_plate} />
                </span>
              ) : null}
              <span className="text-stone-500">مالک: <span className="font-bold text-slate-800">{profile.owner_name}</span></span>
              <span className="bg-orange-50 text-orange-850 border border-orange-200 px-2.5 py-0.5 rounded-full font-bold">
                محاسبه: {profile.contract_type === "hourly" ? "قرارداد ساعتی" : profile.contract_type === "daily" ? "قرارداد روزانه" : "قرارداد ماهانه"}
              </span>
              {profile.contract_no && (
                <span className="bg-neutral-100 text-neutral-800 border border-neutral-200 rounded px-2 py-0.5 font-mono text-[11px]">
                  سند: {profile.contract_no} {profile.appendix_no ? `(متمم: ${profile.appendix_no})` : ""}
                </span>
              )}
              {profile.contract_start_date && (
                <span className="text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded text-[11px] font-mono">
                  مدت: {profile.contract_start_date} تا {profile.contract_end_date || "نامحدود"}
                </span>
              )}
              {profile.leap_year_adjusted ? (
                <span className="bg-amber-50 text-amber-850 border border-amber-200 rounded px-2 py-0.5 text-[11px] font-semibold">
                  ⚙️ تصحیح سال کبیسه فعال
                </span>
              ) : null}
              {profile.is_archived ? (
                <span className="bg-amber-100 text-amber-800 border border-amber-300 rounded px-2 py-0.5 text-[11px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  بایگانی شده (آرشیو)
                </span>
              ) : (
                <span className="bg-emerald-50 text-emerald-850 border border-emerald-200 rounded px-2 py-0.5 text-[11px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  پرونده فعال کارگاه
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto justify-between md:justify-start">
          <button
            onClick={handleToggleArchive}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              profile.is_archived
                ? "bg-amber-50 text-amber-850 hover:bg-amber-100 border-amber-200"
                : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700"
            }`}
          >
            {profile.is_archived ? (
              <>
                <ArchiveRestore className="w-3.5 h-3.5" />
                <span>خروج دستگاه از آرشیو</span>
              </>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5" />
                <span>بایگانی (آرشیو) دستگاه</span>
              </>
            )}
          </button>
          <button 
            onClick={startEditMachine}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-900"
          >
            📂 ویرایش مشخصات دستگاه
          </button>
          <button 
            id="back-to-machinery-dashboard-btn"
            onClick={onBack}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-mac-main" />
            <span>بازگشت به فهرست ماشین‌آلات</span>
          </button>
        </div>
      </div>

      {/* Aggregate Financial Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div id="machinery-profile-card-perf" className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-stone-500">مجموع کل کارکرد ثبت‌شده</span>
          <p className="text-md sm:text-lg font-black text-slate-900 mt-2">
            {formatNumber(profile.total_performance)} 
            <span className="text-xs text-stone-400 font-normal mr-1">
              {profile.contract_type === "hourly" ? "ساعت" : "روز"}
            </span>
          </p>
        </div>

        <div id="machinery-profile-card-rent" className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-stone-500">نرخ پایه قرارداد اجاره</span>
          <p className="text-md sm:text-lg font-black text-slate-850 mt-2">{formatCurrency(profile.base_rent)}</p>
        </div>

        <div id="machinery-profile-card-debt" className="bg-white p-4 rounded-xl border border-stone-200 border-r-4 border-r-mac-dark shadow-xs">
          <span className="text-xs font-bold text-slate-600">بدهی انباشته کارکرد</span>
          <p className="text-md sm:text-lg font-black text-mac-dark mt-2">{formatCurrency(profile.total_calculated)}</p>
        </div>

        <div id="machinery-profile-card-paid" className="bg-white p-4 rounded-xl border border-stone-200 border-r-4 border-r-emerald-600 shadow-xs">
          <span className="text-xs font-bold text-emerald-700">کل مبالغ پرداختی</span>
          <p className="text-md sm:text-lg font-black text-emerald-700 mt-2">{formatCurrency(profile.total_paid)}</p>
        </div>

        <div id="machinery-profile-card-remaining" className="bg-white p-4 rounded-xl border border-stone-200 border-r-4 border-r-orange-650 shadow-xs">
          <span className="text-xs font-bold text-orange-700 font-bold">باقیمانده حساب مالک</span>
          <p className="text-md sm:text-lg font-black text-orange-700 mt-2">{formatCurrency(profile.remaining_balance)}</p>
        </div>
      </div>

      {/* Operations Log Sheets Tabs */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl self-start">
            <button
              id="activate-machinery-performance-tab-btn"
              onClick={() => setActiveTab("performance")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "performance" 
                  ? "bg-white text-mac-dark shadow-sm" 
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              ریز سوابق دوره‌ای کارکرد
            </button>
            <button
              id="activate-machinery-payments-tab-btn"
              onClick={() => setActiveTab("payments")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "payments" 
                  ? "bg-white text-mac-dark shadow-sm" 
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              ریز پرداختی‌ها
            </button>
          </div>

          <div className="flex gap-2">
            <button
              id="open-add-machinery-perf-modal-btn"
              onClick={() => {
                if (profile?.machine) {
                  setRateValue(profile.machine.base_rent.toString());
                }
                setShowPerfModal(true);
              }}
              className="flex items-center gap-1.5 bg-mac-dark hover:bg-orange-850 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت سابقه کارکرد جدید</span>
            </button>
            <button
              id="open-add-machinery-payment-modal-btn"
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت پرداختی جدید</span>
            </button>
            <button
              id="print-machinery-statement-btn"
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ صورت وضعیت</span>
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-4 text-xs">
          {activeTab === "performance" ? (
            <div className="space-y-4">
              <div className="bg-slate-50/50 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-stone-100">
                <div className="relative flex-1 max-w-xs">
                  <input
                    type="text"
                    placeholder="جست‌وجو در دوره‌ها و مقادیر..."
                    value={perfSearch}
                    onChange={(e) => setPerfSearch(e.target.value)}
                    className="w-full text-xs px-3.5 py-1.5 bg-white border border-stone-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-mac-main text-right"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-stone-400">فیلتر سال مالی:</span>
                    <select
                      value={selectedYearFilter}
                      onChange={(e) => setSelectedYearFilter(e.target.value)}
                      className="bg-white border border-stone-200 rounded-lg text-[10px] px-2 py-1 text-slate-850 cursor-pointer font-bold"
                    >
                      <option value="all">همه سال‌ها</option>
                      {Array.from(new Set((profile.performance || []).map(p => Number(p.year || 1405))))
                        .sort((a: any, b: any) => Number(b) - Number(a))
                        .map(yr => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))
                      }
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-stone-400">ترتیب نمایش:</span>
                    <select
                      value={perfSort}
                      onChange={(e) => setPerfSort(e.target.value)}
                      className="bg-white border border-stone-200 rounded-lg text-[10px] px-2 py-1 text-slate-650 cursor-pointer"
                    >
                      <option value="id_desc">جدید‌ترین دوره‌های ثبت‌شده</option>
                      <option value="value_desc">بیشترین کارکرد ثبت‌شده</option>
                      <option value="cost_desc">بیشترین هزینه کل محاسبه‌شده</option>
                    </select>
                  </div>
                </div>
              </div>

              {profile.performance.length === 0 ? (
                <div className="p-16 text-center">
                  <FileText className="w-12 h-12 text-stone-300 mx-auto mb-2" />
                  <h3 className="text-xs font-bold text-stone-600">هنوز کارکردی برای این تجهیز ثبت نشده است</h3>
                  <p className="text-[10px] text-stone-400 mt-1">با ثبت کارکرد جدید، موازنه فرمول را فعال فرمایید.</p>
                </div>
              ) : filteredPerformance.length === 0 ? (
                <div className="p-12 text-center text-stone-400">
                  <p>هیچ سابقه کارکردی مطابق با فیلتر یافت نشد.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 text-stone-500 font-bold border-b border-stone-100">
                      <tr>
                        <th className="py-3 px-4">ماه کارکرد</th>
                        <th className="py-3 px-4 text-center">مقدار کارکرد</th>
                        <th className="py-3 px-4 text-left">مبنای دقیق فرمولی</th>
                        <th className="py-3 px-4 text-left text-mac-main font-bold">کل هزینه کارکرد دوره</th>
                        <th className="py-3 px-4 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100/50">
                      {filteredPerformance.map((perf) => {
                        const daysInMonth = perf.month_index <= 6 ? 31 : (perf.month_index === 12 ? (profile.leap_year_adjusted ? 30 : 29) : 30);
                        const currentRate = perf.rate_used || profile.base_rent;
                        return (
                          <tr key={perf.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-4 font-bold text-stone-700">{perf.month_name} <span className="text-[11px] text-stone-400 font-normal">({perf.year || 1405})</span></td>
                            <td className="py-4 px-4 text-center font-bold text-stone-800 font-mono">
                              {formatNumber(perf.performance_value)} 
                              <span className="text-[10px] text-stone-400 font-normal mr-1">
                                {profile.contract_type === "hourly" ? " ساعت" : " روز"}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-left text-[11px] text-stone-500">
                              {profile.contract_type === "hourly" ? (
                                <span>ضرب مستقیم: {formatNumber(perf.performance_value)} ساعت × {formatCurrency(currentRate)}</span>
                              ) : profile.contract_type === "daily" ? (
                                <span>ضرب مستقیم: {formatNumber(perf.performance_value)} روز × {formatCurrency(currentRate)} (روزمزد)</span>
                              ) : (
                                <span>
                                  مبنای ماه {perf.month_name} ({daysInMonth} روزه) 
                                  - روزمزد تناسبی: {formatCurrency(Math.round(currentRate / daysInMonth))} از اجاره {formatCurrency(currentRate)}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-left text-mac-main font-black font-mono">{formatCurrency(perf.total_calculated_amount)}</td>
                            <td className="py-4 px-4 text-center whitespace-nowrap">
                              <button
                                onClick={() => startEditPerformance(perf)}
                                className="p-1 px-1.5 hover:bg-stone-100 text-stone-605 rounded-lg transition-colors cursor-pointer inline-block ml-1"
                                title="ویرایش کارکرد"
                              >
                                ✏️
                              </button>
                              <button
                                id={`delete-machinery-perf-${perf.id}-btn`}
                                onClick={() => handleDeletePerformance(perf.id)}
                                className="p-1 px-2 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-colors cursor-pointer inline-block"
                                title="حذف ردیف"
                              >
                                <Trash2 className="w-4 h-4 inline-block" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50/50 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-stone-100">
                <div className="relative flex-1 max-w-xs">
                  <input
                    type="text"
                    placeholder="جست‌وجو در پرداختی‌ها..."
                    value={paySearch}
                    onChange={(e) => setPaySearch(e.target.value)}
                    className="w-full text-xs px-3.5 py-1.5 bg-white border border-stone-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-mac-main text-right"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-stone-400">ترتیب مساعده‌ها:</span>
                  <select
                    value={paySort}
                    onChange={(e) => setPaySort(e.target.value)}
                    className="bg-white border border-stone-200 rounded-lg text-[10px] px-2 py-1 text-slate-650 cursor-pointer"
                  >
                    <option value="id_desc">آخرین ثبت‌شده‌ها</option>
                    <option value="amount_desc">بیشترین مبالغ پرداختی</option>
                    <option value="date_desc">بر مبنای تاریخ مالی</option>
                  </select>
                </div>
              </div>

              {profile.payments.length === 0 ? (
                <div className="p-16 text-center">
                  <DollarSign className="w-12 h-12 text-stone-300 mx-auto mb-2" />
                  <h3 className="text-xs font-bold text-stone-600">پرداختی مساعده‌ای پیدا نشد</h3>
                  <p className="text-[10px] text-stone-400 mt-1">فیش‌های مالی ثبت‌شده به محض افزودن در اینجا مرتب خواهند شد.</p>
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="p-12 text-center text-stone-400">
                  <p>هیچ پرداختی مطابق با فیلتر یافت نشد.</p>
                </div>
              ) : (
                <div className="overflow-x-auto text-xs text-right">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 text-stone-500 font-bold border-b border-stone-100">
                      <tr>
                        <th className="py-3 px-4">تاریخ پرداخت</th>
                        <th className="py-3 px-4 text-left">مبلغ واریزی</th>
                        <th className="py-3 px-4">توضیحات و بابت پرداخت فیش</th>
                        <th className="py-3 px-4 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100/50">
                      {filteredPayments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4 font-bold text-stone-700 font-mono">{convertToPersianDigits(pay.payment_date)}</td>
                          <td className="py-4 px-4 text-left text-emerald-700 font-black font-mono">{formatCurrency(pay.amount)}</td>
                          <td className="py-4 px-4 text-slate-605 max-w-md overflow-hidden text-ellipsis whitespace-nowrap">{pay.description || "بدون توضیحات مازاد"}</td>
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => startEditPayment(pay)}
                              className="p-1 px-1.5 hover:bg-stone-100 text-stone-605 rounded-lg transition-colors cursor-pointer inline-block ml-1"
                              title="ویرایش حواله"
                            >
                              ✏️
                            </button>
                            <button
                              id={`delete-machinery-payment-${pay.id}-btn`}
                              onClick={() => handleDeletePayment(pay.id)}
                              className="p-1 px-2 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-colors cursor-pointer inline-block"
                              title="حذف رسید"
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
          )}
        </div>
      </div>

      {/* 1. Modal machinery performance input */}
      {showPerfModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-right">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full overflow-hidden"
          >
            <div className="p-5 bg-mac-dark text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm font-bold">ثبت کارکرد زمانی دستگاه</h3>
              <button onClick={() => setShowPerfModal(false)} className="text-slate-400 hover:text-white text-xl cursor-pointer">&times;</button>
            </div>
            
            <form onSubmit={handleAddPerformance} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5 font-bold text-stone-605">انتخاب سال مالی</label>
                  <select
                    value={performanceYear}
                    onChange={(e) => setPerformanceYear(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-mac-main text-right cursor-pointer font-bold"
                  >
                    {[1402, 1403, 1404, 1405, 1406, 1407, 1408].map(y => (
                      <option key={y} value={y}>{y} هجری شمسی</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5 font-bold text-stone-605">انتخاب ماه کارکرد</label>
                  <select
                    id="month-index-select"
                    value={selectedMonthIndex}
                    onChange={(e) => setSelectedMonthIndex(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-mac-main text-right cursor-pointer"
                  >
                    {MONTHS_LIST.map((m) => (
                      <option key={m.index} value={m.index}>{m.name} ({m.days} روزه)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">
                  {profile.contract_type === "hourly" ? "تعداد ساعت کارکرد دستگاه" : "تعداد روز کارکرد در ماه انتخاب‌شده"}
                </label>
                <input
                  id="perf-value-input"
                  type="number"
                  step="0.1"
                  required
                  placeholder={profile.contract_type === "hourly" ? "مثال: ۱۴۰ ساعت" : "مثال: ۲۲ روز"}
                  value={performanceValue}
                  onChange={(e) => setPerformanceValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-mac-main text-right"
                />
                {profile.contract_type === "monthly" && (
                  <p className="text-[10px] text-stone-400 mt-2 leading-relaxed">
                    * توجه: سیستم اجاره کل ماه را بر روزهای واقعی تقویم ماه مشخص‌شده تقسیم کرده و تناسب به روزهای کارکرد را محاسبه می‌کند.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">
                  {profile.contract_type === "hourly" 
                    ? "نرخ افزوده/الحاقی هر ساعت برای این دوره (ریال)" 
                    : profile.contract_type === "daily" 
                    ? "نرخ افزوده/الحاقی روزمزد برای این دوره (ریال)" 
                    : "كل مبلغ اجاره ماهانه جدید اعمالی برای این دوره (ریال)"}
                </label>
                <input
                  id="perf-rate-input"
                  type="text"
                  placeholder={`پیش‌فرض قرارداد: ${formatCurrency(profile.base_rent)}`}
                  value={rateValue}
                  onChange={(e) => setRateValue(formatInputNumber(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-mac-main text-right font-medium font-mono font-bold"
                  dir="ltr"
                />
                <span className="text-[10px] text-stone-400 mt-1.5 block leading-relaxed">
                  {profile.contract_type === "hourly" 
                    ? "* نرخ الحاقی این کارکرد را به صورت «ریال برای هر ساعت» درج کنید." 
                    : profile.contract_type === "daily" 
                    ? "* نرخ الحاقی این کارکرد را به صورت «نرخ روزمرد (ریال برای هر روز)» درج کنید." 
                    : "* نرخ الحاقی این کارکرد را به صورت «اجاره کل ماه (ریال)» درج کنید تا سیستم بر اساس روزهای ماهیانه تناسب کارکرد را محاسبه کند."}
                </span>
                <span className="text-[10px] text-amber-600 block mt-1 font-bold">
                  * در صورت خالی ماندن، نرخ پیش‌فرض قرارداد مبنا قرار خواهد گرفت (نیاز به وارد کردن مقدار تکراری نیست).
                </span>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  id="cancel-add-perf-btn"
                  type="button"
                  onClick={() => setShowPerfModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  id="confirm-add-perf-btn"
                  type="submit"
                  className="flex-1 py-2.5 bg-mac-dark hover:bg-orange-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  محاسبه و ثبت کارکرد
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 2. Modal machinery payment input */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-right">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full overflow-hidden"
          >
            <div className="p-5 bg-mac-dark text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm font-bold">ثبت مساعده / علی‌الحساب پرداختی</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white text-xl cursor-pointer">&times;</button>
            </div>
            
            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">تاریخ فیش پرداخت (شمسی)</label>
                <input
                  id="payment-date-input"
                  type="text"
                  required
                  placeholder="مثال: ۱۴۰۵/۰۳/۱۵"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-mac-main text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">مبلغ مساعده (ریال)</label>
                <input
                  id="payment-amount-input"
                  type="text"
                  required
                  placeholder="مثال: ۸۰,۰۰۰,۰۰۰"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(formatInputNumber(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-mac-main text-right font-semibold font-mono font-bold"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">توضیحات و بابت پرداخت فیش</label>
                <textarea
                  id="payment-desc-textarea"
                  placeholder="مثال: حواله پایا پایند بابت مساعده خرداد - تنخواه فنی"
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-mac-main text-right resize-none"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  id="cancel-add-payment-btn"
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  id="confirm-add-payment-btn"
                  type="submit"
                  className="flex-1 py-2.5 bg-mac-dark hover:bg-orange-850 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  ثبت سند پرداخت مالی
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 3. Printable Statement Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          {/* Dynamic print-override styles */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body {
                background: white !important;
                color: black !important;
                font-size: 11pt !important;
                direction: rtl !important;
              }
              /* Hide all elements on the body during print */
              body * {
                visibility: hidden !important;
              }
              /* Bring back only the printable area and its offspring */
              #printable-area-machinery,
              #printable-area-machinery * {
                visibility: visible !important;
              }
              #printable-area-machinery {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
              }
              .border-stone-200 {
                border-color: #666 !important;
              }
              .text-mac-main {
                color: black !important;
              }
            }
          `}} />

          <motion.div 
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 md:p-8 overflow-y-auto max-h-[90vh] text-right text-slate-800 printing-modal-card"
          >
            {/* Modal actions panel - hidden on print */}
            <div className="no-print">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 mb-6 gap-3">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-mac-main" />
                  <h3 className="font-extrabold text-base">پیش‌نمایش سند چاپی صورت وضعیت مالک</h3>
                </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-500">فیلتر سال مالی چاپی:</span>
                  <select
                    value={printYearFilter || "all"}
                    onChange={(e) => setPrintYearFilter(e.target.value)}
                    className="bg-stone-50 border border-stone-200 rounded-xl text-xs px-2 sm:px-3 py-1.5 text-slate-800 font-bold cursor-pointer"
                  >
                    <option value="all">همه دوره‌های ثبت‌شده</option>
                    {Array.from(new Set((profile.performance || []).map(p => Number(p.year || 1405))))
                      .sort((a: any, b: any) => Number(b) - Number(a))
                      .map(yr => (
                        <option key={yr} value={yr}>سال {yr}</option>
                      ))
                    }
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    id="trigger-print-btn"
                    onClick={() => window.print()}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>چاپ سند یا ذخیره PDF</span>
                  </button>
                  <button
                    onClick={() => setShowPrintModal(false)}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Printable Document Box */}
          <div 
              id="printable-area-machinery" 
              className="bg-white border-2 border-stone-300 p-8 rounded-xl font-sans text-xs flex flex-col space-y-6 leading-relaxed"
              style={{ direction: "rtl" }}
            >
              {/* Header Letterhead */}
              <div className="flex items-start justify-between border-b-2 border-neutral-800 pb-5">
                {/* Right col: Office brand */}
                <div className="flex flex-col space-y-1">
                  <span className="font-black text-sm text-slate-900 border-r-4 border-slate-900 pr-2.5">
                    {settings.enterprise_name || "دفتر فنی"}
                  </span>
                  <span className="text-[10px] text-stone-500 pr-2.5">سامانه ردیابی هوشمند ماشین‌آلات کارگاهی</span>
                </div>

                {/* Center col: Document general identity */}
                <div className="flex flex-col items-center space-y-2 text-center">
                  <span className="font-black text-base tracking-tight text-slate-950 font-bold">خلاصه تراز صورت وضعیت و کارکرد ماشین‌آلات</span>
                  <span className="text-[10px] bg-neutral-100 px-3 py-1 rounded-full font-bold">
                    {settings.project_name || "نرم افزار کارگاهی"}
                  </span>
                </div>

                {/* Left col: Date & metadata */}
                <div className="text-[9pt] flex flex-col space-y-1 text-left font-mono">
                  <span>تاریخ: {convertToPersianDigits(new Date().toLocaleDateString("fa-IR"))}</span>
                  <span>کد مالک: M-{profile.id}</span>
                </div>
              </div>

              {/* Machinery Core Metadata Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-stone-50/50 p-4 rounded-xl border border-stone-200">
                <div>
                  <span className="text-[10px] text-stone-400 block mb-0.5">نام مالک ماشین آلات:</span>
                  <strong className="text-stone-850 font-bold">{profile.owner_name}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block mb-0.5">مدل دستگاه و تجهیز:</span>
                  <strong className="text-stone-850 font-bold block truncate" title={profile.machine_type}>
                    {profile.machine_type}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block mb-0.5">شماره پلاک شهربانی:</span>
                  <div className="pt-0.5">
                    {profile.license_plate ? (
                      <SleekLicensePlate plate={profile.license_plate} />
                    ) : (
                      <strong className="text-stone-850 font-bold">-</strong>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block mb-0.5">مبنای قرارداد و نرخ پایه:</span>
                  <strong className="text-stone-850 font-bold font-mono">
                    {formatCurrency(profile.base_rent)} ({profile.contract_type === "hourly" ? "ساعتی" : "ماهانه"})
                  </strong>
                </div>
              </div>

              {/* Unified Ledger Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Performance History Details */}
                <div>
                  <h4 className="font-black text-[11px] border-b pb-2 mb-3 text-slate-900">سوابق کارکرد دوره‌ای (صورت وضعیت کار)</h4>
                  {printedPerformances.length === 0 ? (
                    <div className="text-center py-4 text-stone-400">هیچ کارکردی برای این فیلتر ثبت نشده است</div>
                  ) : (
                    <table className="w-full text-right border border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b text-stone-600">
                          <th className="p-2 border-l">دوره (ماه)</th>
                          <th className="p-2 border-l text-center">میزان کارکرد</th>
                          <th className="p-2 border-l text-left">نرخ اعمال‌شده (ریال)</th>
                          <th className="p-2 text-left">جمع ناخالص</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {printedPerformances.map((p) => (
                          <tr key={p.id}>
                            <td className="p-2 border-l font-bold">
                              {p.month_name} <span className="text-[9px] text-stone-400 font-normal">({p.year || 1405})</span>
                            </td>
                            <td className="p-2 border-l text-center font-bold font-mono">
                              {formatNumber(p.performance_value)} {profile.contract_type === "hourly" ? "ساعت" : "روز"}
                            </td>
                            <td className="p-2 border-l text-left font-mono">{formatCurrency(p.rate_used || profile.base_rent)}</td>
                            <td className="p-2 text-left font-black font-mono text-mac-main">{formatCurrency(p.total_calculated_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Payment Ledger Details */}
                <div>
                  <h4 className="font-black text-[11px] border-b pb-2 mb-3 text-slate-900">ریز اسناد پرداختی کارفرما</h4>
                  {printedPayments.length === 0 ? (
                    <div className="text-center py-4 text-stone-400">هیچ حواله‌ای برای این فیلتر واریز نشده است</div>
                  ) : (
                    <table className="w-full text-right border border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b text-stone-600">
                          <th className="p-2 border-l">تاریخ فیش</th>
                          <th className="p-2 border-l">شرح سند بابت پرداخت</th>
                          <th className="p-2 text-left">مبلغ پرداختی (ریال)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {printedPayments.map((pay) => (
                          <tr key={pay.id}>
                            <td className="p-2 border-l font-bold font-mono">{convertToPersianDigits(pay.payment_date)}</td>
                            <td className="p-2 border-l text-stone-600 max-w-[170px] overflow-hidden text-ellipsis whitespace-nowrap">{pay.description || "ـ"}</td>
                            <td className="p-2 text-left font-black font-mono text-emerald-800">{formatCurrency(pay.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Verified Ledger Bottom Summary */}
              <div className="border-t-2 border-neutral-800 pt-5 flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Signature box */}
                <div className="flex gap-12 text-center text-[10px] font-bold text-stone-600">
                  <div className="flex flex-col space-y-6">
                    <span>واحد حسابداری دفتر الوان</span>
                    <span className="text-[8px] text-stone-400">(امضاء و مهر)</span>
                  </div>
                  <div className="flex flex-col space-y-6">
                    <span>مدیر فنی پروژه</span>
                    <span className="text-[8px] text-stone-400">(امضاء و تایید کارکرد)</span>
                  </div>
                </div>

                {/* Final balanced accounts aggregates */}
                <div className="rounded-xl p-5 flex items-center justify-between gap-6 md:min-w-[340px] border" style={{ backgroundColor: '#fffbfb', borderColor: '#1c1919', color: '#100e0e' }}>
                  <div className="space-y-1">
                    <span className="text-[10px] block" style={{ color: '#111010' }}>مانده حساب {printYearFilter !== "all" ? `سال ${printYearFilter}` : "(طلب قطعی کل)"}</span>
                    <strong className="text-base font-black tracking-tight font-mono" style={{ color: '#11110e' }}>
                      {formatCurrency(printRemainingBalance)}
                    </strong>
                  </div>
                  <div className="border-r pr-5 space-y-0.5 text-right font-mono text-[10px]" style={{ borderColor: '#1c1919' }}>
                    <div>کارکرد دوره انتخابی: {formatCurrency(printTotalCalculated)}</div>
                    <div>پرداختی دوره انتخابی: {formatCurrency(printTotalPaid)}</div>
                  </div>
                </div>
              </div>

              {/* Informative footer signature */}
              <div className="text-[8px] text-center text-stone-400 pt-2 border-t border-dashed">
                تنظیم شده به روش حسابداری تعهدی تجمیعی ماشین‌آلات • استفاده غیرقانونی یا دست‌کاری ارقام پیگرد قانونی دارد.
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* 4. Edit Machinery Specs Modal */}
      {showMachineEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-right">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full overflow-hidden text-xs text-slate-800"
          >
            <div className="p-5 bg-mac-dark text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm font-bold">اصلاح قرارداد و مشخصات فنی</h3>
              <button onClick={() => setShowMachineEditModal(false)} className="text-slate-400 hover:text-white text-xl cursor-pointer">&times;</button>
            </div>
            
            <form onSubmit={handleEditMachineSubmit} className="p-6 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">نام مالک دستگاه</label>
                <input
                  type="text"
                  required
                  value={editOwnerName}
                  onChange={(e) => setEditOwnerName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">نوع دستگاه و مدل</label>
                <input
                  type="text"
                  required
                  value={editMachineType}
                  onChange={(e) => setEditMachineType(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">شماره پلاک شهربانی (اختیاری)</label>
                <input
                  type="text"
                  value={editLicensePlate}
                  onChange={(e) => setEditLicensePlate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                   <label className="block text-[11px] font-bold text-stone-500 mb-1">مبنای قرارداد</label>
                   <select
                     value={editContractType}
                     onChange={(e) => setEditContractType(e.target.value as "hourly" | "daily" | "monthly")}
                     className="w-full px-2 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs cursor-pointer"
                   >
                     <option value="hourly">ساعتی</option>
                     <option value="daily">روزانه</option>
                     <option value="monthly">ماهانه</option>
                   </select>
                </div>
                <div>
                   <label className="block text-[11px] font-bold text-stone-500 mb-1">رسته ماشین‌آلات</label>
                   <select
                     value={editMachineCategory}
                     onChange={(e) => setEditMachineCategory(e.target.value)}
                     className="w-full px-2 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs cursor-pointer"
                   >
                     <option value="سنگین">سنگین</option>
                     <option value="سبک">سبک</option>
                   </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">
                  {editContractType === "hourly" 
                    ? "نرخ اجاره هر ساعت (ریال)" 
                    : editContractType === "daily" 
                    ? "نرخ اجاره هر روز (ریال)" 
                    : "مبلغ کل اجاره ماهانه پایه (ریال)"}
                </label>
                <input
                  type="text"
                  required
                  value={editBaseRent}
                  onChange={(e) => setEditBaseRent(formatInputNumber(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-bold text-right"
                  dir="ltr"
                />
              </div>

              <div className="border border-stone-150 bg-stone-50/50 rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    id="edit-leap-chk"
                    type="checkbox"
                    checked={editLeapYearAdjusted}
                    onChange={(e) => setEditLeapYearAdjusted(e.target.checked)}
                    className="w-4 h-4 cursor-pointer text-slate-900"
                  />
                  <label htmlFor="edit-leap-chk" className="text-[10px] text-stone-600 font-bold cursor-pointer select-none">
                    تصحیح سال کبیسه برای اسفند ماه (اسفند ۳۰ روزه)
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-stone-400 mb-1">شماره پیمان</label>
                    <input
                      type="text"
                      placeholder="بی‌کد"
                      value={editContractNo}
                      onChange={(e) => setEditContractNo(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-stone-200 rounded-md text-[11px] font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-400 mb-1">شماره الحاقیه</label>
                    <input
                      type="text"
                      placeholder="بی‌کد"
                      value={editAppendixNo}
                      onChange={(e) => setEditAppendixNo(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-stone-200 rounded-md text-[11px] font-mono text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-stone-400 mb-1">تاریخ واگذاری</label>
                    <input
                      type="text"
                      placeholder="۱۴۰۴/۰۱/۰۱"
                      value={editContractStart}
                      onChange={(e) => setEditContractStart(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-stone-200 rounded-md text-[11px] font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-400 mb-1">تاریخ ترخیص</label>
                    <input
                      type="text"
                      placeholder="۱۴۰۴/۱۲/۲۹"
                      value={editContractEnd}
                      onChange={(e) => setEditContractEnd(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-stone-200 rounded-md text-[11px] font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMachineEditModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-stone-700 font-bold rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 text-white font-bold rounded-lg cursor-pointer"
                >
                  تایید اصلاحات
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 5. Edit Performance Modal */}
      {showPerfEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-right">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full overflow-hidden text-xs text-slate-800"
          >
            <div className="p-5 bg-mac-dark text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm font-bold">اصلاح سند کارکرد ثبتی</h3>
              <button onClick={() => setShowPerfEditModal(false)} className="text-slate-400 hover:text-white text-xl cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleEditPerformanceSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5">انتخاب سال مالی</label>
                  <select
                    value={editingPerformanceYear}
                    onChange={(e) => setEditingPerformanceYear(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-mac-main text-right cursor-pointer font-bold"
                  >
                    {[1402, 1403, 1404, 1405, 1406, 1407, 1408].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5">انتخاب ماه کارکرد</label>
                  <select
                    value={editingMonthIndex}
                    onChange={(e) => setEditingMonthIndex(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-mac-main text-right cursor-pointer font-bold"
                  >
                    {MONTHS_LIST.map((m) => (
                      <option key={m.index} value={m.index}>{m.name} ({m.days} روزه)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">
                  {profile?.contract_type === "hourly" ? "میزان ساعت واقعی کارکرد" : "میزان روزکارکرد واقعی در ماه"}
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={editingPerformanceValue}
                  onChange={(e) => setEditingPerformanceValue(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 font-black font-mono text-center"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">
                  {profile?.contract_type === "hourly" 
                    ? "نرخ افزوده/الحاقی هر ساعت برای این دوره (ریال)" 
                    : profile?.contract_type === "daily" 
                    ? "نرخ افزوده/الحاقی روزمزد برای این دوره (ریال)" 
                    : "كل مبلغ اجاره ماهانه جدید اعمالی برای این دوره (ریال)"}
                </label>
                <input
                  type="number"
                  value={editingPerformanceRate}
                  onChange={(e) => setEditingPerformanceRate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-center font-bold text-mac-main"
                  placeholder={profile ? `پیش‌فرض قرارداد: ${profile.base_rent} ریال` : ""}
                />
                <span className="text-[10px] text-stone-400 mt-1.5 block leading-relaxed">
                  {profile?.contract_type === "hourly" 
                    ? "* نرخ الحاقی این کارکرد را به صورت «ریال برای هر ساعت» درج کنید." 
                    : profile?.contract_type === "daily" 
                    ? "* نرخ الحاقی این کارکرد را به صورت «نرخ روزمرد (ریال برای هر روز)» درج کنید." 
                    : "* نرخ الحاقی این کارکرد را به صورت «اجاره کل ماه (ریال)» درج کنید تا سیستم بر اساس روزهای ماهیانه تناسب کارکرد را محاسبه کند."}
                </span>
                <span className="text-[10px] text-amber-600 block mt-1 font-bold">
                  * در صورت خالی ماندن، نرخ پیش‌فرض قرارداد مبنا قرار خواهد گرفت (نیاز به وارد کردن مقدار تکراری نیست).
                </span>
              </div>

              <div className="flex gap-2 pt-2 col-span-2">
                <button
                  type="button"
                  onClick={() => setShowPerfEditModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-stone-700 font-bold rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 text-white font-bold rounded-lg cursor-pointer"
                >
                  تایید ویرایش
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 6. Edit Payment Modal */}
      {showPaymentEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-right">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full overflow-hidden text-xs text-slate-800"
          >
            <div className="p-5 bg-emerald-600 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm font-bold">اصلاح سند حواله پرداختی</h3>
              <button onClick={() => setShowPaymentEditModal(false)} className="text-slate-400 hover:text-white text-xl cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleEditPaymentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">تاریخ فیش پرداخت</label>
                <input
                  type="text"
                  required
                  value={editingPaymentDate}
                  onChange={(e) => setEditingPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-center font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">مبلغ واریزی (ریال)</label>
                <input
                  type="text"
                  required
                  value={editingPaymentAmount}
                  onChange={(e) => setEditingPaymentAmount(formatInputNumber(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-center font-bold"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">توضیحات و بابت فیش</label>
                <textarea
                  value={editingPaymentDescription}
                  onChange={(e) => setEditingPaymentDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs leading-relaxed h-20 text-right"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentEditModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-stone-700 font-bold rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  ثبت قطعی تغییرات
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
