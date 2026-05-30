import React, { useState, useEffect } from "react";
import { 
  Product, 
  Person, 
  DocumentHeader, 
  DocumentDetail, 
  AppNotification, 
  Contractor, 
  Machine 
} from "./types";
import Dashboard from "./components/Dashboard";
import BaseData from "./components/BaseData";
import DocumentForm from "./components/DocumentForm";
import DocumentsList from "./components/DocumentsList";
import DocumentPrint from "./components/DocumentPrint";
import Settings from "./components/Settings";
import CardexReports from "./components/CardexReports";
import WarehouseSettings from "./components/WarehouseSettings";

// New components
import ContractorDashboard from "./components/ContractorDashboard";
import ContractorProfileView from "./components/ContractorProfileView";
import MachineryDashboard from "./components/MachineryDashboard";
import MachineryProfileView from "./components/MachineryProfileView";

import { 
  LayoutDashboard, 
  Layers, 
  FolderOpen, 
  Wrench, 
  Menu, 
  X, 
  Database,
  Building,
  CheckCircle2,
  AlertCircle,
  FileText,
  Truck,
  Bell,
  Check,
  Plus,
  Trash2,
  Calendar,
  Layers2,
  Printer,
  ShieldAlert
} from "lucide-react";
import { formatCurrency, convertToPersianDigits } from "./utils/formatters";

export function getNicePersianDate() {
  try {
    const d = new Date();
    const formatted = new Intl.DateTimeFormat('fa-IR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }).format(d);
    return formatted
      .replace(/[،,،\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (err) {
    return "شنبه ۹ خرداد ۱۴۰۵";
  }
}

function getJalaliDateStrToday(): string {
  try {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      calendar: 'persian'
    });
    const parts = formatter.format(d);
    return parts
      .replace(/[۰-۹]/g, digit => String.fromCharCode(digit.charCodeAt(0) - 1776))
      .replace(/[،,\-\s]/g, '/')
      .replace(/\/+/g, '/')
      .trim();
  } catch (err) {
    return "1405/03/09";
  }
}

function jalaliToDays(dateStr: string): number {
  if (!dateStr) return 0;
  try {
    const cleanStr = dateStr
      .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1776))
      .replace(/[،,\-\s]/g, '/')
      .replace(/\/+/g, '/')
      .trim();
    const parts = cleanStr.split('/');
    const cleanParts = parts.filter(Boolean);
    if (cleanParts.length < 3) return 0;
    const y = parseInt(cleanParts[0], 10);
    const m = parseInt(cleanParts[1], 10);
    const d = parseInt(cleanParts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return 0;

    let totalDays = y * 365 + Math.floor(y / 4);
    for (let i = 1; i < m; i++) {
      if (i <= 6) totalDays += 31;
      else totalDays += 30;
    }
    totalDays += d;
    return totalDays;
  } catch (err) {
    return 0;
  }
}

export default function App() {
  // Main Section Router (landing page selection)
  const [section, setSection] = useState<"landing" | "warehouse" | "contractors" | "machinery">("landing");
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Sub-screens within Specialized Warehouse section
  const [currentScreen, setCurrentScreen] = useState<
    "dashboard" | "history" | "base-data" | "document-form" | "print" | "settings" | "reports"
  >("dashboard");

  // Selection states for profiles in Sub-sections
  const [activeContractorId, setActiveContractorId] = useState<number | null>(null);
  const [activeMachineId, setActiveMachineId] = useState<number | null>(null);

  // Report preselection states
  const [reportsActiveProductId, setReportsActiveProductId] = useState<number | undefined>(undefined);
  const [reportsActivePersonId, setReportsActivePersonId] = useState<number | undefined>(undefined);
  const [docFormPrefillProductId, setDocFormPrefillProductId] = useState<number | undefined>(undefined);

  // Core Data sets
  const [products, setProducts] = useState<Product[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [documents, setDocuments] = useState<DocumentHeader[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  // Specific single document print detail
  const [activeDocDetail, setActiveDocDetail] = useState<DocumentDetail | null>(null);
  
  // Document Creator Form Type State
  const [docFormType, setDocFormType] = useState<"incoming" | "outgoing">("incoming");

  // Status alerts
  const [appAlert, setAppAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Mobile navigation trigger
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Consolidated debt report modal trigger
  const [showDebtReportModal, setShowDebtReportModal] = useState(false);
  const [debtReportFilterType, setDebtReportFilterType] = useState<"all" | "contractors" | "machinery">("all");
  const [debtReportMachineryCategory, setDebtReportMachineryCategory] = useState<"all" | "سنگین" | "سبک">("all");

  // Settings State
  const [settings, setSettings] = useState<Record<string, string>>({});

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [alertsCollapsed, setAlertsCollapsed] = useState(false);

  // Notification input form state (Landing page remind creator)
  const [newNotifTitle, setNewNotifTitle] = useState("");
  const [newNotifMessage, setNewNotifMessage] = useState("");
  const [newNotifDate, setNewNotifDate] = useState("");

  const triggerAppAlert = (type: "success" | "error", text: string) => {
    setAppAlert({ type, text });
    setTimeout(() => setAppAlert(null), 5050);
  };

  // Synchronizers
  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  const handleSaveSettings = async (updated: Record<string, string>) => {
    const payload = {
      ...updated,
      ...((updated.settings as any) || {})
    };
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "خطا در بروزرسانی تنظیمات");
    }
    await fetchSettings();
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchPersons = async () => {
    try {
      const res = await fetch("/api/persons");
      if (res.ok) {
        const data = await res.json();
        setPersons(data);
      }
    } catch (err) {
      console.error("Error fetching persons:", err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  };

  const fetchContractors = async () => {
    try {
      const res = await fetch("/api/contractors");
      if (res.ok) {
        const data = await res.json();
        setContractors(data);
      }
    } catch (err) {
      console.error("Error fetching contractors:", err);
    }
  };

  const fetchMachines = async () => {
    try {
      const res = await fetch("/api/machinery");
      if (res.ok) {
        const data = await res.json();
        setMachines(data);
      }
    } catch (err) {
      console.error("Error fetching machinery:", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const handleReadAllNotifications = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReadNotification = async (id: number) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PUT" });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotifTitle.trim() || !newNotifMessage.trim()) return;

    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newNotifTitle,
          message: newNotifMessage,
          type: "reminder",
          date: newNotifDate
        })
      });
      if (res.ok) {
        setNewNotifTitle("");
        setNewNotifMessage("");
        setNewNotifDate("");
        fetchNotifications();
        triggerAppAlert("success", "یادآور جدید تقویم کارگاهی ثبت گردید.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getDynamicAlerts = () => {
    const alerts: Array<{
      id: string;
      type: "danger" | "warning" | "info";
      title: string;
      message: string;
    }> = [];

    const warningDays = Number(settings.contract_warning_days || "30");
    const todayStr = getJalaliDateStrToday();
    const todayDays = jalaliToDays(todayStr);

    // 1. Contractors validations
    contractors.forEach(c => {
      const initial = c.initial_amount ? Number(c.initial_amount) : 0;
      const gross = c.total_gross || 0;

      if (initial > 0) {
        const ratio = (gross / initial) * 105; // Wait, actually ratio is gross / initial * 100
        const ratioPercentage = (gross / initial) * 100;
        if (ratioPercentage > 125) {
          alerts.push({
            id: `contractor-over-125-${c.id}`,
            type: "danger",
            title: `تجاوز از سقف قانونی تعهدات پیمانکار ${c.name}`,
            message: `کل کارکرد ناخالص ثبت‌شده (${formatCurrency(gross)} ریال) معادل ${ratioPercentage.toFixed(1)}٪ مبلغ اولیه پیمان (${formatCurrency(initial)} ریال) است که از سقف مجاز ۱۲۵٪ قانونی عبور کرده است. هرگونه ثبت صورت‌وضعیت جدید مسدود است و تفویض قرارداد جدید الزامی است.`
          });
        } else if (ratioPercentage > 100) {
          const hasAppendix = c.appendix_no ? true : false;
          alerts.push({
            id: `contractor-appendix-needed-${c.id}`,
            type: "warning",
            title: `نیاز به صدور الحاقیه متمم برای پیمانکار ${c.name}`,
            message: `کل کارکرد ناخالص پیمانکار (${formatCurrency(gross)} ریال) به ${ratioPercentage.toFixed(1)}٪ مبلغ اولیه پیمان رسیده است. ${hasAppendix ? `الحاقیه شماره ${c.appendix_no} ثبت شده است.` : "صدور الحاقیه تغییر مقادیر ابلاغی جهت مجاز شدن کارکرد مقتضی است."}`
          });
        }

        // Check if final invoice exists
        const invoices = c.invoices || [];
        const hasFinal = invoices.some((inv: any) => inv.is_final === 1);
        if (hasFinal && ratioPercentage < 75) {
          alerts.push({
            id: `contractor-final-under-75-${c.id}`,
            type: "warning",
            title: `افت تعهدات زیر کف قانونی پیمانکار ${c.name}`,
            message: `پیمانکار دارای صورت‌وضعیت قطعی با پیشرفت نهایی معادل ${ratioPercentage.toFixed(1)}٪ تعهدات اولیه است. به علت افت کارکرد به زیر ۷۵٪، ابلاغ صورتجلسه کاهش کار مقتضی است.`
          });
        }
      }

      // Check contract end Date
      if (c.contract_end) {
        const endDays = jalaliToDays(c.contract_end);
        if (endDays > 0) {
          const diff = endDays - todayDays;
          if (diff >= 0 && diff <= warningDays) {
            alerts.push({
              id: `contractor-expire-${c.id}`,
              type: "warning",
              title: `نزدیک شدن به پایان مهلت قرارداد پیمانکار ${c.name}`,
              message: `قرارداد خدمات فنی مکتوب این پیمانکار در تاریخ ${c.contract_end} پایان می‌یابد (${diff} روز کاری مانده). اقدام جهت تمدید مقتضی است.`
            });
          } else if (diff < 0) {
            alerts.push({
              id: `contractor-expired-${c.id}`,
              type: "danger",
              title: `قرارداد خدمات پیمانکار ${c.name} منقضی شده است`,
              message: `قرارداد پیمانکار مذکور در تاریخ ${c.contract_end} خاتمه یافته و فاقد اعتبار است (${Math.abs(diff)} روز گذشته). تمدید قرارداد الزامی است.`
            });
          }
        }
      }
    });

    // 2. Machine validations
    machines.forEach(m => {
      if (m.contract_end) {
        const endDays = jalaliToDays(m.contract_end);
        if (endDays > 0) {
          const diff = endDays - todayDays;
          if (diff >= 0 && diff <= warningDays) {
            alerts.push({
              id: `machine-expire-${m.id}`,
              type: "warning",
              title: `نزدیک شدن به پایان اجاره خودرو / دستگاه ${m.machine_type}`,
              message: `قرارداد اجاره ناوگان به پلاک ${m.license_plate} (مالک: ${m.owner_name}) در تاریخ ${m.contract_end} خاتمه می‌یابد (${diff} روز مانده).`
            });
          } else if (diff < 0) {
            alerts.push({
              id: `machine-expired-${m.id}`,
              type: "danger",
              title: `قرارداد اجاره دستگاه ${m.machine_type} منقضی شده است`,
              message: `مهلت اجاره دستگاه خدمات پلاک ${m.license_plate} (مالک: ${m.owner_name}) در تاریخ ${m.contract_end} منقضی گردیده است (${Math.abs(diff)} روز گذشته).`
            });
          }
        }
      }
    });

    return alerts;
  };

  // Initial Boot loader
  useEffect(() => {
    fetchSettings();
    fetchProducts();
    fetchPersons();
    fetchDocuments();
    fetchContractors();
    fetchMachines();
    fetchNotifications();
  }, []);

  // Fetch document details for print / viewing standard
  const handleViewDocumentDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (!res.ok) {
        throw new Error("خطا در بازخوانی برگه سند از سرور.");
      }
      const data = await res.json();
      setActiveDocDetail(data);
      setCurrentScreen("print");
    } catch (err: any) {
      triggerAppAlert("error", err.message);
    }
  };

  // Register New Document Database Request
  const handleSaveDocument = async (docPayload: {
    type: "incoming" | "outgoing";
    date: string;
    person_id: number;
    description: string;
    rows: { product_id: number; quantity: number }[];
  }) => {
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(docPayload)
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "بروز خطا");
      }

      triggerAppAlert("success", "سند انبارداری با موفقیت صادر و موجودی اقلام تصحیح گردید.");
      
      // Sync list
      await fetchProducts();
      await fetchDocuments();
      await fetchNotifications();
      
      // Auto-focus back to dashboard
      setCurrentScreen("dashboard");
    } catch (err: any) {
      triggerAppAlert("error", err.message);
      throw err;
    }
  };

  // Delete Document Database Request
  const handleDeleteDocument = async (id: number) => {
    if (!window.confirm("دستور لغو دائم حواله:\nآیا از حذف این سند از سوابق انبار اطمینان کامل دارید؟ این عمل برگه را باطل کرده و موازنه موجودی انبار را معکوس می‌کند.")) {
      return;
    }
    if (!window.confirm("تأیید مجدد جهت اطمینان نهایی:\nپیرو هشدار قبلی، آیا واقعاً مایل به حذف نهایی و همیشگی این سند و تغییر اثر آن بر موجودی انبار هستید؟ این اقدام غیرقابل بازگشت است.")) {
      return;
    }

    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "خطا در لغو حواله");
      }

      triggerAppAlert("success", "سند انبار بازپس گرفته شد و موازنه کالا به حالت اول بازگشت.");
      
      // Reload vectors
      await fetchProducts();
      await fetchDocuments();
      await fetchNotifications();
    } catch (err: any) {
      triggerAppAlert("error", err.message);
    }
  };

  // Reset core DB
  const handleResetDatabase = async () => {
    try {
      const res = await fetch("/api/reset-database", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "خطا در ریست دیتابیس");
      }

      triggerAppAlert("success", "پایگاه داده با موفقیت پاکسازی و از نو پیکربندی شد.");
      
      // Reload empty datasets
      setProducts([]);
      setPersons([]);
      setDocuments([]);
      setContractors([]);
      setMachines([]);
      setNotifications([]);
      
      setActiveContractorId(null);
      setActiveMachineId(null);
      setSection("landing");
      setCurrentScreen("dashboard");
    } catch (err: any) {
      triggerAppAlert("error", err.message);
      throw err;
    }
  };

  // Header background theme according to section chosen
  const getHeaderStyle = () => {
    if (section === "warehouse") return "bg-brand-forest border-b border-emerald-800/20";
    if (section === "contractors") return "bg-con-dark border-b border-indigo-950";
    if (section === "machinery") return "bg-mac-dark border-b border-orange-950";
    return "bg-slate-900 border-b border-slate-800";
  };

  const getSystemTitle = () => {
    if (section === "warehouse") return "۱. انبار تخصصی";
    if (section === "contractors") return "۲. پیمانکاران";
    if (section === "machinery") return "۳. ماشین‌آلات";
    return settings.enterprise_name || "دفتر فنی الوان";
  };

  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  return (
    <div id="unified-app-root" className="min-h-screen bg-brand-sand text-slate-805 flex flex-col font-sans antialiased text-right">
      
      {/* Dynamic Colored Main Title Header Bar */}
      <header id="primary-navigation-header" className={`${getHeaderStyle()} text-white shadow-md relative no-print transition-all duration-300`}>
        {/* Row 1: Brand Info & Global Controls */}
        <div id="header-row-1" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/10">
          
          {/* Right Part: Enterprise Name & Logo Text */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setSection("landing");
                setMobileMenuOpen(false);
              }}
              className="bg-white/15 hover:bg-white/25 p-2 rounded-xl text-yellow-300 border border-white/10 transition-all cursor-pointer flex items-center justify-center shrink-0"
              title="صفحه اصلی"
            >
              <Layers2 className="w-5 h-5" />
            </button>
            <div className="text-right">
              <div className="flex items-center gap-2">
                {settings.logo_img ? (
                  <img src={settings.logo_img} className="w-8 h-8 object-contain rounded-md border border-white/10 bg-white/5" alt="لوگو" referrerPolicy="no-referrer" />
                ) : settings.logo_text ? (
                  <span className="bg-yellow-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                    {settings.logo_text}
                  </span>
                ) : null}
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white m-0">
                  {settings.enterprise_name || "دفتر فنی الوان"}
                </h1>
              </div>
              <p className="text-[10px] text-stone-300 mt-0.5">پورتال هماهنگ فنی، انبارداری و تراز مالی معوقات</p>
            </div>
          </div>

          {/* Center Part: Active Project Name & Direct Switch Dropdown */}
          <div className="flex items-center gap-2 bg-slate-950/40 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shrink-0"></span>
            <span className="text-stone-300">پروژه:</span>
            <strong className="text-yellow-300 max-w-[200px] truncate">{settings.project_name || "پروژه مسکن ملی پرند"}</strong>
            
            {/* Header Switch Selector */}
            <span className="text-stone-500 mx-1">|</span>
            <select
              value={section}
              onChange={(e) => {
                const val = e.target.value as "landing" | "warehouse" | "contractors" | "machinery";
                setSection(val);
                setMobileMenuOpen(false);
                setActiveContractorId(null);
                setActiveMachineId(null);
                if (val === "warehouse") {
                  setCurrentScreen("dashboard");
                }
              }}
              className="bg-white/10 hover:bg-white/20 text-white font-extrabold text-[10px] md:text-xs px-2.5 py-1.5 rounded-lg border border-white/15 focus:outline-none focus:ring-1 focus:ring-white transition-all cursor-pointer font-sans"
            >
              <option value="landing" className="text-slate-900 font-bold">🏠 صفحه کنترل اصلی</option>
              <option value="warehouse" className="text-slate-900 font-bold">۱. انبار تخصصی</option>
              <option value="contractors" className="text-slate-900 font-bold">۲. پیمانکاران</option>
              <option value="machinery" className="text-slate-900 font-bold">۳. ماشین‌آلات</option>
            </select>
          </div>

          {/* Left Part: Today's Long Persian Date & Notifications indicator */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="text-[10px] sm:text-[11px] font-bold text-stone-100 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10">
              📅 امروز  {getNicePersianDate()}
            </span>

            {/* Notifications Alert Shortcut with indicator badge */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="relative p-2 bg-white/10 hover:bg-white/25 border border-white/10 rounded-xl text-stone-200 transition-all cursor-pointer flex items-center justify-center shrink-0"
                title="پایش سریع یادآورها"
              >
                <Bell className="w-4 h-4 text-orange-400" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1.5 -left-1.5 bg-rose-500 text-white font-serif text-[8px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce shadow-sm">
                    {convertToPersianDigits(unreadNotificationsCount)}
                  </span>
                )}
              </button>

              {showNotificationsDropdown && (
                <div 
                  className="absolute left-0 mt-2 bg-stone-900 border border-stone-850/80 shadow-2xl rounded-2xl w-80 max-h-[380px] overflow-hidden z-50 text-right flex flex-col transition-all cursor-default"
                  style={{ top: "100%" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-stone-800 p-3 bg-stone-950/40">
                    <strong className="text-stone-100 text-[11px] font-extrabold flex items-center gap-1.5 leading-none">
                      <Bell className="w-3.5 h-3.5 text-orange-500" />
                      <span>یادآورهای فعال کارگاه</span>
                    </strong>
                    <div className="flex items-center gap-2">
                      {unreadNotificationsCount > 0 && (
                        <button
                          onClick={async () => {
                            await handleReadAllNotifications();
                          }}
                          className="text-[9px] text-[#fb923c] hover:text-orange-400 font-black cursor-pointer bg-none border-none"
                        >
                          علامت خوانده‌شدن همه
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotificationsDropdown(false)}
                        className="text-stone-400 hover:text-white text-xs px-1 cursor-pointer"
                      >
                        🗙
                      </button>
                    </div>
                  </div>

                  <div className="p-2 flex-1 overflow-y-auto space-y-1.5 min-h-[50px]">
                    {notifications.length === 0 ? (
                      <p className="text-stone-400/80 py-8 text-center text-[11px]">هیچ یادآور فعالی در سیستم پایش ثبت نشده است.</p>
                    ) : (
                      <div className="space-y-1 max-h-[290px] overflow-y-auto text-right pr-0.5" style={{ direction: "rtl" }}>
                        {notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            onClick={async () => {
                              await handleReadNotification(notif.id);
                            }}
                            className={`p-2.5 rounded-xl border text-[11px] transition-all cursor-pointer text-right leading-relaxed ${
                              notif.is_read 
                                ? "bg-stone-900/40 border-stone-850/40 text-stone-500" 
                                : "bg-orange-950/15 border-orange-500/25 text-stone-250 hover:bg-orange-950/20"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="flex items-center gap-1">
                                {!notif.is_read && <span className="w-1.5 h-1.5 bg-orange-600 rounded-full inline-block"></span>}
                                <strong className="text-stone-105 font-bold block max-w-[150px] truncate">{notif.title}</strong>
                              </span>
                              {notif.date && (
                                <span className="text-[8px] bg-white/5 text-stone-400 border border-white/5 rounded px-1.5 font-mono">
                                  {convertToPersianDigits(notif.date)}
                                </span>
                              )}
                            </div>
                            <p className="text-stone-400 text-[10px] break-words line-clamp-3">{notif.message}</p>
                            
                            <div className="flex justify-end gap-1.5 mt-1 border-t border-white/5 pt-1" onClick={(e) => e.stopPropagation()}>
                              {!notif.is_read && (
                                <button
                                  onClick={async () => {
                                    await handleReadNotification(notif.id);
                                  }}
                                  className="text-[9px] text-emerald-500 hover:text-emerald-400 font-bold bg-white/5 px-2 py-0.5 rounded-md cursor-pointer"
                                >
                                  خوانده شد
                                </button>
                              )}
                              <button
                                onClick={async (e) => {
                                  await handleDeleteNotification(notif.id, e);
                                }}
                                className="text-[9px] text-rose-500 hover:text-rose-400 font-bold bg-white/5 px-2 py-0.5 rounded-md cursor-pointer"
                              >
                                حذف
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu trigger inside branding row */}
            {section === "warehouse" && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 lg:hidden bg-white/10 hover:bg-white/25 border border-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center shrink-0"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            {section !== "warehouse" && section !== "landing" && (
              <button
                onClick={() => {
                  setActiveContractorId(null);
                  setActiveMachineId(null);
                  setSection("landing");
                }}
                className="lg:hidden text-[10px] bg-white/15 px-3 py-2 rounded-xl text-white font-bold cursor-pointer border border-white/10"
              >
                منوی اصلی
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Navigation Options according to section */}
        {section !== "landing" && (
          <div id="header-row-2" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between text-xs">
            {section === "warehouse" ? (
              <nav className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={() => setCurrentScreen("dashboard")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 font-bold rounded-xl transition-all cursor-pointer ${
                    currentScreen === "dashboard" || currentScreen === "document-form"
                      ? "bg-brand-sage text-emerald-400 shadow-inner" 
                      : "text-stone-300 hover:bg-brand-sage/40 hover:text-white"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>روکش فیزیکی اقلام</span>
                </button>

                <button
                  id="nav-base-data"
                  onClick={() => setCurrentScreen("base-data")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 font-bold rounded-xl transition-all cursor-pointer ${
                    currentScreen === "base-data" 
                      ? "bg-brand-sage text-emerald-400 shadow-inner" 
                      : "text-stone-300 hover:bg-brand-sage/40 hover:text-white"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>کالاها و اشخاص پایه</span>
                </button>

                <button
                  onClick={() => setCurrentScreen("history")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 font-bold rounded-xl transition-all cursor-pointer ${
                    currentScreen === "history" || currentScreen === "print"
                      ? "bg-brand-sage text-emerald-400 shadow-inner" 
                      : "text-stone-300 hover:bg-brand-sage/40 hover:text-white"
                  }`}
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>آرشیو برگه‌های انبار</span>
                </button>

                <button
                  onClick={() => {
                    setReportsActiveProductId(undefined);
                    setReportsActivePersonId(undefined);
                    setCurrentScreen("reports");
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 font-bold rounded-xl transition-all cursor-pointer ${
                    currentScreen === "reports" 
                      ? "bg-brand-sage text-emerald-400 shadow-inner" 
                      : "text-stone-300 hover:bg-brand-sage/40 hover:text-white"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>گزارش کارتکس</span>
                </button>

                <button
                  onClick={() => setCurrentScreen("settings")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 font-bold rounded-xl transition-all cursor-pointer ${
                    currentScreen === "settings" 
                      ? "bg-brand-sage text-emerald-400 shadow-inner" 
                      : "text-stone-300 hover:bg-brand-sage/40 hover:text-white"
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  <span>تنظیمات و ابزارها</span>
                </button>

                <button
                  onClick={() => setSection("landing")}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer ml-3 border border-white/5"
                >
                  برگشت به خانه اصلی
                </button>
              </nav>
            ) : (
              <button
                onClick={() => {
                  setActiveContractorId(null);
                  setActiveMachineId(null);
                  setSection("landing");
                }}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer border border-white/15"
              >
                <span>بازگشت به منوی کل</span>
                <span>&larr;</span>
              </button>
            )}

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-stone-300 bg-slate-800/20 px-3 py-1.5 rounded-full border border-white/5">
                تعداد یادآورها: <strong className="text-white font-black">{convertToPersianDigits(notifications.length)}</strong> مورد
              </span>
            </div>
          </div>
        )}

        {/* Mobile Navigation Dropdown for Warehouse segment */}
        {mobileMenuOpen && section === "warehouse" && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-brand-forest border-t border-brand-sage/60 shadow-xl z-50 p-4 space-y-2 no-print text-right">
            <button
              onClick={() => {
                setCurrentScreen("dashboard");
                setMobileMenuOpen(false);
              }}
              className="w-full text-right flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:bg-brand-sage"
            >
              <LayoutDashboard className="w-5 h-5 text-slate-300" />
              <span>پیشخوان و موجودی کارگاه</span>
            </button>

            <button
              onClick={() => {
                setCurrentScreen("base-data");
                setMobileMenuOpen(false);
              }}
              className="w-full text-right flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:bg-brand-sage"
            >
              <Layers className="w-5 h-5 text-slate-300" />
              <span>اطلاعات پایه کالا و اشخاص</span>
            </button>

            <button
              onClick={() => {
                setCurrentScreen("history");
                setMobileMenuOpen(false);
              }}
              className="w-full text-right flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:bg-brand-sage"
            >
              <FolderOpen className="w-5 h-5 text-slate-300" />
              <span>آرشیو برگه‌های انبار و چاپ</span>
            </button>

            <button
              onClick={() => {
                setReportsActiveProductId(undefined);
                setReportsActivePersonId(undefined);
                setCurrentScreen("reports");
                setMobileMenuOpen(false);
              }}
              className="w-full text-right flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:bg-brand-sage"
            >
              <FileText className="w-5 h-5 text-slate-300" />
              <span>کارتکس و گردش کالا</span>
            </button>

            <button
              onClick={() => {
                setShowSettingsModal(true);
                setMobileMenuOpen(false);
              }}
              className="w-full text-right flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:bg-brand-sage"
            >
              <Wrench className="w-5 h-5 text-slate-300" />
              <span>پشتیبان‌گیری و ریست کل پایگاه داده</span>
            </button>

            <button
              onClick={() => {
                setSection("landing");
                setMobileMenuOpen(false);
              }}
              className="w-full text-right flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-yellow-300 border-t border-slate-700/50 mt-3"
            >
              <span>بازگشت به خانه اصلی سامانه</span>
            </button>
          </div>
        )}
      </header>

      {/* Global Toast Alert banner */}
      {appAlert && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 no-print text-right w-full">
          <div className={`p-4 rounded-xl flex items-center gap-3 shadow-md border ${
            appAlert.type === "success" 
              ? "bg-emerald-50 text-emerald-950 border-emerald-200" 
              : "bg-rose-50 text-rose-950 border-rose-200"
          }`}>
            {appAlert.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <p className="text-xs font-semibold">{appAlert.text}</p>
          </div>
        </div>
      )}

      {/* ----------------- SECTIONS SWITCH ROUTER ----------------- */}

      {section === "landing" ? (
        <div id="central-portal-menu" className="max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-5 animate-fade-in">
          
          {/* Welcome Intro Header banner - Shorter & Compact according to User Request */}
          <div className="bg-gradient-to-l from-slate-900 to-slate-850 text-white rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-md border border-slate-850">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            
            <div className="relative z-10 space-y-1 text-right">
              <span className="bg-slate-850 text-emerald-400 text-[9px] font-black px-2.5 py-0.5 rounded-full border border-slate-700/60 uppercase tracking-wider">
                سامانه هوشمند و یکپارچه امور کارگاه
              </span>
              <h2 className="text-lg font-black tracking-tight leading-snug">
                {settings.enterprise_name || "دفتر فنی الوان"}
              </h2>
              <p className="text-stone-300 text-[11px] leading-relaxed max-w-4xl">
                مدیریت انبارداری، موازنه تراز حساب جاری پیمانکاران، و پایش سوابق کارکرد مالی ماشین‌آلات پروژه {settings.project_name || "مسکن ملی پرند"}.
              </p>
            </div>
          </div>

          {/* Dynamic alerts and contract notifications feed */}
          {getDynamicAlerts().length > 0 && alertsCollapsed ? (
            <div className="flex items-center justify-between bg-[#fffef5] border border-amber-205 text-amber-900 px-5 py-3 rounded-2xl text-xs font-bold shadow-xs animate-fade-in no-print text-right gap-3">
              <span className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                <span>سامانه پایش هوشمند هشدارها موقتاً پنهان گردید ({convertToPersianDigits(getDynamicAlerts().length)} هشدار فعال کارگاهی وجود دارد).</span>
              </span>
              <button 
                onClick={() => setAlertsCollapsed(false)}
                className="bg-amber-100 hover:bg-amber-200 text-amber-950 px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer transition-all shrink-0"
              >
                🔔 نمایش و تحلیل مجدد هشدارها
              </button>
            </div>
          ) : getDynamicAlerts().length > 0 && !alertsCollapsed && (
            <div className="bg-[#fffbeb] border border-amber-300 text-amber-900 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs text-right animate-fade-in no-print">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-amber-200 pb-2">
                <h3 className="text-xs font-black text-amber-950 flex items-center gap-2">
                  <ShieldAlert className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                  <span>مرکز پایش هوشمند هشدارها و زمان مفید قراردادهای کارگاهی</span>
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => {
                      setAlertsCollapsed(true);
                      triggerAppAlert("success", "سامانه پایش هوشمند موقتاً بسته شد. برای نمایش مجدد دکمه نمایش را بزنید.");
                    }}
                    className="p-1 px-3 rounded-xl bg-amber-205 bg-amber-100/80 hover:bg-amber-100 border border-amber-200 text-amber-950 font-black text-[10px] cursor-pointer transition-colors flex items-center gap-1.5"
                    title="بستن پنجره و یادآوری موضوعات در زمان دیگر"
                  >
                    <span>یادآوری در زمان دیگر &times;</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {getDynamicAlerts().map((alert) => (
                  <div key={alert.id} className={`p-3 rounded-xl text-[11px] font-semibold leading-relaxed border flex items-start gap-2.5 ${
                    alert.type === "danger" 
                      ? "bg-rose-50/70 border-red-200/55 text-red-900" 
                      : "bg-[#fffcf0] border-amber-200/60 text-amber-900"
                  }`}>
                    <span className={`text-[9px] shrink-0 font-bold px-1.5 py-0.5 rounded-md ${
                      alert.type === "danger" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-850"
                    }`}>
                      {alert.type === "danger" ? "بحرانی 🚨" : "هشدار ⚠️"}
                    </span>
                    <div className="space-y-0.5">
                      <h4 className="font-extrabold text-[#111]">{alert.title}</h4>
                      <p className="text-stone-605 leading-relaxed">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Management consolidated debt list report trigger - Compact Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs animate-fade-in text-right gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900 text-yellow-400 rounded-xl">
                <FileText className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-black text-slate-900">روکش و گزارش بدهی‌های کارگاهی (مخصوص مدیریت)</h4>
                <p className="text-[10px] text-stone-500">موازنه تراز جاری معوقات مالی تمام پیمانکاران عمرانی و ناوگان کارگاه در یک نگاه</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => {
                  setShowSettingsModal(true);
                }}
                className="bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-750 font-extrabold text-[11px] px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5 text-con-main" />
                <span>تنظیمات پیشرفته پایگاه داده</span>
              </button>
              <button
                onClick={() => {
                  fetchContractors();
                  fetchMachines();
                  setShowDebtReportModal(true);
                }}
                style={{ contentVisibility: "auto" }}
                className="bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-[11px] px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-yellow-400" />
                <span>پیش‌نمایش و چاپ لیست بدهی‌ها</span>
              </button>
            </div>
          </div>

          {/* Three Portals Grid Selection - Symmetrical, Compact heights, Colormatched background for distinct vibes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* 1. Specialized Warehouse Portal (Emerald Theme) */}
            <div 
              id="portal-card-warehouse"
              onClick={() => {
                setSection("warehouse");
                setCurrentScreen("dashboard");
              }}
              className="bg-emerald-50/15 hover:bg-emerald-50/25 border border-emerald-250/60 hover:border-emerald-500 rounded-2xl p-5 shadow-xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group h-60 text-right"
            >
              <div className="space-y-3">
                <div className="p-3 bg-white text-emerald-600 rounded-xl w-fit shadow-xs group-hover:scale-105 transition-transform border border-emerald-100">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-emerald-950 group-hover:text-emerald-700 transition-colors flex items-center gap-1">
                    <span className="text-emerald-500 font-serif">۱.</span>
                    <span>انبار کارگاهی و مصالح</span>
                  </h3>
                  <p className="text-stone-550 text-[11px] leading-relaxed mt-1.5 font-semibold">
                    ثبت و فیلتر اقلام، ورودی و خروجی مصالح، هشدار افت قطعات به حداقل موجودی و صدور فوری سند حواله.
                  </p>
                </div>
              </div>

              <div className="border-t border-emerald-100/60 pt-3 flex items-center justify-between mt-3 font-semibold">
                <span className="text-[10px] text-emerald-800/80 font-bold font-mono">
                  کالای ثبتی: {convertToPersianDigits(products.length)} ردیف
                </span>
                <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1 group-hover:translate-x-[-3px] transition-transform">
                  ورود برگه مصالح &larr;
                </span>
              </div>
            </div>

            {/* 2. Contractors Portal (Slate Blue Theme) */}
            <div 
              id="portal-card-contractors"
              onClick={() => {
                setSection("contractors");
                setActiveContractorId(null);
              }}
              className="bg-blue-50/15 hover:bg-blue-50/25 border border-blue-250/60 hover:border-blue-500 rounded-2xl p-5 shadow-xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group h-60 text-right"
            >
              <div className="space-y-3">
                <div className="p-3 bg-white text-blue-700 rounded-xl w-fit shadow-xs group-hover:scale-105 transition-transform border border-blue-105">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-blue-950 group-hover:text-blue-800 transition-colors flex items-center gap-1">
                    <span className="text-blue-500 font-serif">۲.</span>
                    <span>تراز حساب پیمانکاران</span>
                  </h3>
                  <p className="text-stone-555 text-[11px] leading-relaxed mt-1.5 font-semibold">
                    کاهش خودکار حسن انجام کار ۱۰٪ و بیمه ۵٪ از کارکرد ناخالص صورت‌وضعیت و رول وضعیت طلب باقیمانده.
                  </p>
                </div>
              </div>

              <div className="border-t border-blue-100/60 pt-3 flex items-center justify-between mt-3 font-semibold">
                <span className="text-[10px] text-blue-800/80 font-bold font-mono">
                  پیمانکار فعال: {convertToPersianDigits(contractors.length)} نفر
                </span>
                <span className="text-blue-700 font-bold text-[11px] flex items-center gap-1 group-hover:translate-x-[-3px] transition-transform">
                  پایش حساب جاری &larr;
                </span>
              </div>
            </div>

            {/* 3. Machinery and Fleets Portal (Orange/Amber Theme) */}
            <div 
              id="portal-card-machinery"
              onClick={() => {
                setSection("machinery");
                setActiveMachineId(null);
              }}
              className="bg-orange-50/15 hover:bg-orange-50/25 border border-orange-255/60 hover:border-orange-500 rounded-2xl p-5 shadow-xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group h-60 text-right"
            >
              <div className="space-y-3">
                <div className="p-3 bg-white text-orange-600 rounded-xl w-fit shadow-xs group-hover:scale-105 transition-transform border border-orange-105">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-orange-950 group-hover:text-orange-700 transition-colors flex items-center gap-1">
                    <span className="text-orange-500 font-serif">۳.</span>
                    <span>کارکرد و ناوگان ماشین‌آلات</span>
                  </h3>
                  <p className="text-stone-555 text-[11px] leading-relaxed mt-1.5 font-semibold">
                    محاسبه اتوماتیک کارکرد دوره‌ای و اجاره واقعی نسبت به تعداد روزهای متغیر ماه‌های ۳۰ و ۳۱ روز شمسی.
                  </p>
                </div>
              </div>

              <div className="border-t border-orange-100/60 pt-3 flex items-center justify-between mt-3 font-semibold">
                <span className="text-[10px] text-orange-800/80 font-bold font-mono">
                  دستگاه ثبت‌شده: {convertToPersianDigits(machines.length)} ناوگان
                </span>
                <span className="text-orange-600 font-bold text-[11px] flex items-center gap-1 group-hover:translate-x-[-3px] transition-transform">
                  سنجش کار با پلاک &larr;
                </span>
              </div>
            </div>

          </div>

          {/* General Co-Workshop Notifications and Reminders Hub */}
          <div id="general-notifications-hub" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form Creator for Reminders */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 text-right">
              <h3 className="text-sm font-black text-slate-905 flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>ثبت یادآور تقویم کارگاهی</span>
              </h3>

              <form onSubmit={handleAddNotification} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 mb-1">سربرگ و عنوان هشدار مالی / فنی</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: پایان تمدید بیمه گریدر"
                    value={newNotifTitle}
                    onChange={(e) => setNewNotifTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-805 text-right font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-500 mb-1">توضیحات و شرح واقعه پیش رو</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="مثال: قرارداد گریدر کاترپیلار در حال اتمام است..."
                    value={newNotifMessage}
                    onChange={(e) => setNewNotifMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-805 text-right resize-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-500 mb-1">تاریخ هدف چک (شمسی - اختیاری)</label>
                  <input
                    type="text"
                    placeholder="مثال: ۱۴۰۵/۰۳/۲۰"
                    value={newNotifDate}
                    onChange={(e) => setNewNotifDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-805 text-right"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>ثبت در بورد اطلاع‌رسانی</span>
                </button>
              </form>
            </div>

            {/* Notifications Live Feed */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-stone-200 text-right flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
                  <h3 className="text-sm font-black text-slate-905 flex items-center gap-2">
                    <Bell className="w-4.5 h-4.5 text-orange-600" />
                    <span>مرکز پایش یادآورها و فیش‌های خودکار کل سیستم</span>
                  </h3>
                  
                  {unreadNotificationsCount > 0 && (
                    <button
                      onClick={handleReadAllNotifications}
                      className="text-[10px] text-indigo-705 font-bold hover:underline cursor-pointer"
                    >
                      مجموع {convertToPersianDigits(unreadNotificationsCount)} ناخوانده (علامت خوانده‌شده)
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 text-xs font-semibold">
                    هیچ یادآوری تا این لحظه فعال نشده است. یادآوری جدیدی تنظیم بفرمایید.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-76 overflow-y-auto pr-1">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        onClick={() => handleReadNotification(notif.id)}
                        className={`p-3.5 rounded-2xl border transition-all text-xs flex items-start justify-between gap-3 ${
                          notif.is_read 
                            ? "bg-stone-50/50 border-stone-150 text-stone-500" 
                            : "bg-orange-50/20 border-orange-200/50 text-slate-850"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {!notif.is_read && <span className="w-1.5 h-1.5 bg-orange-605 rounded-full inline-block"></span>}
                            <strong className="text-slate-900">{notif.title}</strong>
                            {notif.date && (
                              <span className="text-[9px] bg-slate-100 text-stone-500 rounded px-1.5 py-0.5">
                                تاریخ: {convertToPersianDigits(notif.date)}
                              </span>
                            )}
                          </div>
                          <p className="text-stone-500 leading-relaxed text-[11px]">{notif.message}</p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {!notif.is_read && (
                            <button
                              onClick={() => handleReadNotification(notif.id)}
                              className="p-1 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                              title="خوانده شد"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDeleteNotification(notif.id, e)}
                            className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors cursor-pointer"
                            title="حذف دائمی اعلان"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-stone-100 text-[10px] text-stone-400 leading-relaxed mt-4">
                * یادآوری‌های تایید و تغییر کسورات به محض ثبت فیش پرداختی پیمانکار و کاردکس ماشین‌آلات به شکل زنده در این قسمت تولید و رهگیری می‌شوند.
              </div>
            </div>

          </div>

          {/* Consolidated Workshop Debt Report Modal */}
          {showDebtReportModal && (
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
              {/* Printable style wrapper */}
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  body {
                    background: white !important;
                    color: black !important;
                    font-size: 10pt !important;
                    direction: rtl !important;
                  }
                  #root, #root-container, .fixed, .no-print, button, select, input, header, .nav {
                    display: none !important;
                    visibility: hidden !important;
                  }
                  #printable-area-debts {
                    display: block !important;
                    visibility: visible !important;
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    background: white;
                    padding: 10px;
                  }
                  .border {
                    border-color: #555 !important;
                  }
                }
              `}} />

              <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-6 md:p-8 overflow-y-auto max-h-[90vh] text-right text-slate-800 no-print">
                {/* Action Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 mb-6 gap-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-900" />
                    <h3 className="font-extrabold text-base text-slate-900 font-bold">پیش‌نمایش لیست رسمی بدهی‌های معوق کارگاه</h3>
                  </div>
                  
                  {/* Interactive Filters (no-print) */}
                  <div className="flex flex-wrap items-center gap-3 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                    <div className="flex items-center gap-1 text-xs">
                      <span className="font-bold text-stone-500">رسته معوقات:</span>
                      <select
                        value={debtReportFilterType}
                        onChange={(e) => setDebtReportFilterType(e.target.value as any)}
                        className="p-1 px-2 border rounded bg-white text-stone-800 font-bold focus:outline-none"
                      >
                        <option value="all">📁 همه معوقات (پیمانکاران + ماشین‌آلات)</option>
                        <option value="contractors">👤 فقط پیمانکاران فرعی</option>
                        <option value="machinery">⚙️ فقط ناوگان ماشین‌آلات</option>
                      </select>
                    </div>

                    {(debtReportFilterType === "all" || debtReportFilterType === "machinery") && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="font-bold text-stone-500">دسته‌بندی ناوگان:</span>
                        <select
                          value={debtReportMachineryCategory}
                          onChange={(e) => setDebtReportMachineryCategory(e.target.value as any)}
                          className="p-1 px-2 border rounded bg-white text-stone-800 font-bold focus:outline-none"
                        >
                          <option value="all">همه ماشین‌آلات</option>
                          <option value="سنگین">فقط ماشین‌آلات سنگین</option>
                          <option value="سبک">فقط ماشین‌آلات سبک</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      id="print-debts-list-btn"
                      onClick={() => window.print()}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-yellow-400" />
                      <span>چاپ گزارش بدهی (PDF)</span>
                    </button>
                    <button
                      onClick={() => setShowDebtReportModal(false)}
                      className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      بستن گزارش
                    </button>
                  </div>
                </div>

                {/* Printable Document Sheet */}
                <div 
                  id="printable-area-debts" 
                  className="bg-white border-2 border-stone-300 text-xs flex flex-col space-y-6 pt-6 pb-6 px-10 rounded-xl"
                  style={{ direction: "rtl" }}
                >
                  {/* Report Header Logo */}
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex flex-col space-y-1">
                      <span className="font-black text-sm text-slate-900 border-r-4 border-slate-900 pr-2.5 font-bold flex items-center gap-2">
                        {settings.logo_img && (
                          <img src={settings.logo_img} className="w-7 h-7 object-contain rounded p-0.5 border" alt="Logo" referrerPolicy="no-referrer" />
                        )}
                        <span>{settings.enterprise_name || "دفتر فنی الوان"}</span>
                      </span>
                      <span className="text-[10px] text-stone-500 pr-2.5">تیم هماهنگی امور زنده فنی و کارگاه • مدیریت معوقات</span>
                    </div>

                    <div className="text-center space-y-1">
                      <strong className="text-base font-black tracking-tight block font-bold">
                        {debtReportFilterType === "all" && "روکش جامع کل بدهی موازنه کارگاه کالا"}
                        {debtReportFilterType === "contractors" && "گزارش موازنه بدهی پیمانکاران فرعی"}
                        {debtReportFilterType === "machinery" && "گزارش کارکرد و بدهی معوق مالکان ماشین‌آلات"}
                      </strong>
                      <span className="text-[10px] bg-stone-100 px-3 py-0.5 rounded-full font-bold">
                        پروژه: {settings.project_name || "پروژه مسکن ملی پرند"}
                      </span>
                    </div>

                    <div className="text-left font-mono text-[9px] text-stone-500">
                      <span>تاریخ استخراج: {getNicePersianDate()}</span>
                    </div>
                  </div>

                  {/* Sub-section 1: Contractors Debt Block */}
                  {(debtReportFilterType === "all" || debtReportFilterType === "contractors") && (
                    <div>
                      <h4 className="font-black text-xs text-slate-900 border-r-4 border-indigo-700 pr-2 mb-3 font-bold">۱. موازن کارکرد و بدهی پیمانکاران فرعی جزء</h4>
                      {contractors.length === 0 ? (
                        <div className="text-center py-4 bg-stone-50 text-stone-400">هیچ پیمانکاری در سیستم تعریف نشده است</div>
                      ) : (
                        <table className="w-full text-right border text-[10px] border-collapse">
                          <thead>
                            <tr className="bg-slate-100 font-bold border-b text-stone-600">
                              <th className="p-2 border-l text-right">نام پیمانکار فرعی</th>
                              <th className="p-2 border-l text-right">رسته و شرح فعالیت</th>
                              <th className="p-2 border-l text-left">مجموع کارکرد ناخالص (ریال)</th>
                              <th className="p-2 border-l text-left">خالص نهایی (پس از کسر سپرده‌ها)</th>
                              <th className="p-2 border-l text-left">کل مبالغ پرداختی (ریال)</th>
                              <th className="p-2 text-left bg-orange-50/50 text-orange-950 font-bold">باقیمانده بدهی (ریال)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y font-mono">
                            {contractors.map((c) => (
                              <tr key={c.id}>
                                <td className="p-2 border-l font-sans font-bold text-slate-800">{c.name}</td>
                                <td className="p-2 border-l font-sans text-stone-500">{c.activity_field}</td>
                                <td className="p-2 border-l text-left">{formatCurrency(c.total_gross)}</td>
                                <td className="p-2 border-l text-left text-indigo-950">{formatCurrency(c.total_net)}</td>
                                <td className="p-2 border-l text-left text-emerald-800">{formatCurrency(c.total_paid)}</td>
                                <td className="p-2 text-left font-black bg-orange-50/40 text-orange-750">{formatCurrency(c.remaining_balance)}</td>
                              </tr>
                            ))}
                            {/* Subtotal row */}
                            <tr className="bg-slate-50 font-sans font-black text-[11px]">
                              <td className="p-2 text-right border-l font-bold" colSpan={2}>جمع کل معوقات پیمانکاران فرعی:</td>
                              <td className="p-2 border-l text-left font-mono">{formatCurrency(contractors.reduce((s, x) => s + (x.total_gross || 0), 0))}</td>
                              <td className="p-2 border-l text-left font-mono text-indigo-950">{formatCurrency(contractors.reduce((s, x) => s + (x.total_net || 0), 0))}</td>
                              <td className="p-2 border-l text-left font-mono text-emerald-800">{formatCurrency(contractors.reduce((s, x) => s + (x.total_paid || 0), 0))}</td>
                              <td className="p-2 text-left font-mono text-orange-700 bg-orange-50 font-bold">{formatCurrency(contractors.reduce((s, x) => s + (x.remaining_balance || 0), 0))}</td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Sub-section 2: Machinery Debt Block */}
                  {(debtReportFilterType === "all" || debtReportFilterType === "machinery") && (
                    <div>
                      <h4 className="font-black text-xs text-slate-900 border-r-4 border-orange-600 pr-2 mb-3 font-bold">
                        ۲. کارکرد و بدهی ناوگان ماشین‌آلات عمرانی
                        {debtReportMachineryCategory !== "all" && ` (دسته‌بندی: ${debtReportMachineryCategory})`}
                      </h4>
                      {(() => {
                        const filtered = machines.filter(m => {
                          if (debtReportMachineryCategory === "all") return true;
                          return m.machine_category === debtReportMachineryCategory;
                        });

                        if (filtered.length === 0) {
                          return <div className="text-center py-4 bg-stone-50 text-stone-400 font-sans">هیچ ردیفی مطابق فیلترهای بالا یافت نشد</div>;
                        }

                        return (
                          <table className="w-full text-right border text-[10px] border-collapse">
                            <thead>
                              <tr className="bg-slate-100 font-bold border-b text-stone-600">
                                <th className="p-2 border-l text-right">نام مالک وسیله</th>
                                <th className="p-2 border-l text-right">مدل و پلاک</th>
                                <th className="p-2 border-l text-center">نوع حساب</th>
                                <th className="p-2 border-l text-center">دسته ناوگان</th>
                                <th className="p-2 border-l text-left">مجموع بدهی کارکرد محاسباتی (ریال)</th>
                                <th className="p-2 border-l text-left">مبالغ پرداختی خزانه‌داری (ریال)</th>
                                <th className="p-2 text-left bg-orange-50/50 text-orange-950 font-bold">باقیمانده بدهی (ریال)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y font-mono">
                              {filtered.map((m) => (
                                <tr key={m.id}>
                                  <td className="p-2 border-l font-sans font-bold text-slate-800">{m.owner_name}</td>
                                  <td className="p-2 border-l font-sans text-stone-550">
                                    {m.machine_type} ({m.license_plate})
                                  </td>
                                  <td className="p-2 border-l text-center font-sans">
                                    {m.contract_type === "hourly" ? "ساعتی" : "ماهانه"}
                                  </td>
                                  <td className="p-2 border-l text-center font-sans font-black text-stone-500">
                                    {m.machine_category || "سنگین"}
                                  </td>
                                  <td className="p-2 border-l text-left text-slate-900">{formatCurrency(m.total_calculated)}</td>
                                  <td className="p-2 border-l text-left text-emerald-800">{formatCurrency(m.total_paid)}</td>
                                  <td className="p-2 text-left font-black bg-orange-50/40 text-orange-750">{formatCurrency(m.remaining_balance)}</td>
                                </tr>
                              ))}
                              {/* Subtotal row */}
                              <tr className="bg-slate-50 font-sans font-black text-[11px]">
                                <td className="p-2 text-right border-l font-bold" colSpan={4}>جمع کل معوقات مالکان ماشین‌آلات:</td>
                                <td className="p-2 border-l text-left font-mono">{formatCurrency(filtered.reduce((s, x) => s + (x.total_calculated || 0), 0))}</td>
                                <td className="p-2 border-l text-left font-mono text-emerald-850">{formatCurrency(filtered.reduce((s, x) => s + (x.total_paid || 0), 0))}</td>
                                <td className="p-2 text-left font-mono text-orange-700 bg-orange-50 font-bold">{formatCurrency(filtered.reduce((s, x) => s + (x.remaining_balance || 0), 0))}</td>
                              </tr>
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  )}

                  {/* Verified Full Financial Debt Consolidation Summary */}
                  <div className="border hover:border-stone-350 p-5 rounded-2xl bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 font-sans">
                    <div>
                      <h4 className="font-extrabold text-sm text-yellow-500">جمع کل تعهدات معوقه کارفرمایی پروژه کالا (بدهی خالص نهایی):</h4>
                      <p className="text-[10px] text-stone-300 mt-1 leading-relaxed">
                        این رقم موازنه نهایی بدهی بااقیمانده برای کلیه ردیف‌های فعال و تسویه‌نشده {settings.project_name || "پروژه مسکن ملی پرند"} طبق معیارهای استخراج فیلتر شده را تبیین می‌نماید.
                      </p>
                    </div>
                    <div className="text-left font-mono shrink-0">
                      <span className="text-[10px] text-yellow-500 block mb-0.5">کل بدهی باقیمانده (ریال):</span>
                      <strong className="text-xl sm:text-2xl font-black text-white">
                        {formatCurrency(
                          ((debtReportFilterType === "all" || debtReportFilterType === "contractors")
                            ? contractors.reduce((s, x) => s + (x.remaining_balance || 0), 0)
                            : 0) +
                          ((debtReportFilterType === "all" || debtReportFilterType === "machinery")
                            ? machines.filter(m => debtReportMachineryCategory === "all" || m.machine_category === debtReportMachineryCategory)
                                      .reduce((s, x) => s + (x.remaining_balance || 0), 0)
                            : 0)
                        )} ریال
                      </strong>
                    </div>
                  </div>

                  {/* Formalized Custom Signatures as Requested */}
                  <div className="grid grid-cols-3 gap-6 text-center text-[10.5px] font-bold text-stone-700 pt-6 border-t border-stone-200 font-sans">
                    <div className="flex flex-col space-y-7">
                      <span className="text-slate-950">تنظیم‌کننده دفتر فنی</span>
                      <span className="text-[8.5px] text-stone-400 font-normal">(نام و امضاء)</span>
                    </div>
                    <div className="flex flex-col space-y-7">
                      <span className="text-slate-955 text-slate-950">سرپرست کارگاه</span>
                      <span className="text-[8.5px] text-stone-400 font-normal">(نام و امضاء)</span>
                    </div>
                    <div className="flex flex-col space-y-7">
                      <span className="text-slate-950 font-bold">امور خزانه‌داری / تأیید مدیریت ارشد</span>
                      <span className="text-[8.5px] text-stone-400 font-normal">(مهر و امضاء)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      ) : section === "warehouse" ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {currentScreen === "dashboard" && (
            <Dashboard
              products={products}
              onCreateDocument={(type, preselectedProductId) => {
                if (persons.length === 0) {
                  triggerAppAlert("error", "خطا: هنوز هیچ شخصی در اطلاعات پایه تعریف نشده است. ابتدا مشخصات اشخاص تحویل‌دهنده/گیرنده را تعریف کنید.");
                  return;
                }
                setDocFormType(type);
                setDocFormPrefillProductId(preselectedProductId);
                setCurrentScreen("document-form");
              }}
              onNavigateToCardex={(productId) => {
                setReportsActiveProductId(productId);
                setReportsActivePersonId(undefined);
                setCurrentScreen("reports");
              }}
              onNavigateToProducts={() => setCurrentScreen("base-data")}
            />
          )}

          {currentScreen === "base-data" && (
            <BaseData
              products={products}
              persons={persons}
              settings={settings}
              onRefreshProducts={fetchProducts}
              onRefreshPersons={fetchPersons}
            />
          )}

          {currentScreen === "document-form" && (
            <DocumentForm
              type={docFormType}
              products={products}
              persons={persons}
              preselectedProductId={docFormPrefillProductId}
              onCancel={() => {
                setDocFormPrefillProductId(undefined);
                setCurrentScreen("dashboard");
              }}
              onSave={async (payload) => {
                await handleSaveDocument(payload);
                setDocFormPrefillProductId(undefined);
              }}
            />
          )}

          {currentScreen === "reports" && (
            <CardexReports
              products={products}
              persons={persons}
              settings={settings}
              initialProductId={reportsActiveProductId}
              initialPersonId={reportsActivePersonId}
            />
          )}

          {currentScreen === "history" && (
            <DocumentsList
              documents={documents}
              settings={settings}
              onViewDocument={handleViewDocumentDetail}
              onDeleteDocument={handleDeleteDocument}
            />
          )}

          {currentScreen === "print" && activeDocDetail && (
            <DocumentPrint
              document={activeDocDetail}
              onBack={() => setCurrentScreen("history")}
            />
          )}

          {currentScreen === "settings" && (
            <WarehouseSettings
              settings={settings}
              onSaveSettings={handleSaveSettings}
            />
          )}
        </main>
      ) : section === "contractors" ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {activeContractorId ? (
            <ContractorProfileView 
              contractorId={activeContractorId} 
              onBack={() => {
                setActiveContractorId(null);
                fetchContractors();
              }}
              onRefreshNotifications={fetchNotifications}
            />
          ) : (
            <ContractorDashboard 
              onBack={() => setSection("landing")}
              onSelectContractor={(id) => setActiveContractorId(id)}
              onRefreshNotifications={fetchNotifications}
            />
          )}
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {activeMachineId ? (
            <MachineryProfileView 
              machineId={activeMachineId} 
              onBack={() => {
                setActiveMachineId(null);
                fetchMachines();
              }}
              onRefreshNotifications={fetchNotifications}
            />
          ) : (
            <MachineryDashboard 
              onBack={() => setSection("landing")}
              onSelectMachine={(id) => setActiveMachineId(id)}
              onRefreshNotifications={fetchNotifications}
            />
          )}
        </main>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-4xl w-full text-right overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-l from-slate-900 to-slate-800 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-sm sm:text-base font-bold">تنظیمات پیشرفته پایگاه داده و پیکربندی سیستم</h3>
              </div>
              <button 
                onClick={() => {
                  setShowSettingsModal(false);
                  fetchSettings();
                }}
                className="p-1 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer text-xs font-bold font-sans"
              >
                بستن پنجره &times;
              </button>
            </div>
            
            {/* Scrollable Settings Form Container */}
            <div className="p-6 overflow-y-auto flex-1 bg-stone-50/50">
              <Settings
                settings={settings}
                onSaveSettings={async (updated) => {
                  await handleSaveSettings(updated);
                  setShowSettingsModal(false);
                }}
                onResetDatabase={async () => {
                  await handleResetDatabase();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Global Footer (No-print) */}
      <footer className="bg-[#fcfbfa] border-t border-stone-250 py-6 mt-12 no-print relative text-right">
        <div className="max-w-7xl mx-auto px-4 space-y-6">
          
          {/* Main Footer Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-stone-550 border-b border-stone-100 pb-4">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-stone-600 font-bold">
              {settings.logo_text && (
                <span className="bg-slate-105 bg-stone-100 px-2 py-0.5 rounded text-[10px] text-stone-500 font-bold">
                  {settings.logo_text}
                </span>
              )}
              <span>{settings.enterprise_name || "دفتر فنی الوان"}</span>
              <span className="text-stone-300">•</span>
              <span>{settings.project_name || "پروژه مسکن ملی پرند"}</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-stone-400 font-mono text-[10px]">نسخه نهایی ادغام‌یافته ۴.۰</span>
            </div>
          </div>
          
        </div>
      </footer>
    </div>
  );
}
