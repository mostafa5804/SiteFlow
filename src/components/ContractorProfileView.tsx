import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  ArrowLeft, 
  Briefcase, 
  Plus, 
  Trash2, 
  Calculator, 
  ShieldAlert, 
  Coins, 
  DollarSign, 
  Calendar, 
  FileText,
  Printer
} from "lucide-react";
import { ContractorProfile } from "../types";
import { formatCurrency, formatNumber, convertToPersianDigits, formatInputNumber, parseInputNumber } from "../utils/formatters";

interface ContractorProfileViewProps {
  contractorId: number;
  onBack: () => void;
  onRefreshNotifications?: () => void;
}

export default function ContractorProfileView({ contractorId, onBack, onRefreshNotifications }: ContractorProfileViewProps) {
  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"invoices" | "payments">("invoices");

  const [invSearch, setInvSearch] = useState("");
  const [invSort, setInvSort] = useState("id_desc");

  const [paySearch, setPaySearch] = useState("");
  const [paySort, setPaySort] = useState("id_desc");

  // Modals visibility states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  
  // Custom Edit Modals
  const [showContractorEditModal, setShowContractorEditModal] = useState(false);
  const [showInvoiceEditModal, setShowInvoiceEditModal] = useState(false);
  const [showPaymentEditModal, setShowPaymentEditModal] = useState(false);

  // Contractor Edit Fields
  const [editName, setEditName] = useState("");
  const [editActivityField, setEditActivityField] = useState("");
  const [editRetentionRate, setEditRetentionRate] = useState("10");
  const [editInsuranceRate, setEditInsuranceRate] = useState("5");
  const [editIsExempt, setEditIsExempt] = useState(false);
  const [editHasTaxVal, setEditHasTaxVal] = useState(false);
  const [editContractNo, setEditContractNo] = useState("");
  const [editAppendixNo, setEditAppendixNo] = useState("");
  const [editContractStart, setEditContractStart] = useState("");
  const [editContractEnd, setEditContractEnd] = useState("");
  const [editInitialAmount, setEditInitialAmount] = useState("");

  // Invoice creation & edit fields
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [grossAmount, setGrossAmount] = useState("");
  const [isInvoiceFinal, setIsInvoiceFinal] = useState(false);
  const [invoiceConfirmCount, setInvoiceConfirmCount] = useState(0); // For double confirmation logic
  
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState("");
  const [editingGrossAmount, setEditingGrossAmount] = useState("");
  const [editingIsInvoiceFinal, setEditingIsInvoiceFinal] = useState(false);
  const [editingInvoiceConfirmCount, setEditingInvoiceConfirmCount] = useState(0);

  // Payment creation & edit fields
  const [paymentDate, setPaymentDate] = useState("1405/03/01");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");

  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [editingPaymentDate, setEditingPaymentDate] = useState("");
  const [editingPaymentAmount, setEditingPaymentAmount] = useState("");
  const [editingPaymentDescription, setEditingPaymentDescription] = useState("");

  useEffect(() => {
    fetchProfile();
  }, [contractorId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const [profileRes, settingsRes] = await Promise.all([
        fetch(`/api/contractors/${contractorId}`),
        fetch("/api/settings")
      ]);

      if (!profileRes.ok) throw new Error("خطا در بارگذاری اطلاعات پیمانکار");
      const data = await profileRes.json();
      setProfile(data);

      // Populate edit states
      setEditName(data.name || "");
      setEditActivityField(data.activity_field || "");
      setEditRetentionRate(String(data.retention_rate !== undefined ? data.retention_rate : 10));
      setEditInsuranceRate(String(data.insurance_rate !== undefined ? data.insurance_rate : 5));
      setEditIsExempt(!!data.is_tax_and_insurance_exempt);
      setEditHasTaxVal(!!data.has_tax_val);
      setEditContractNo(data.contract_no || "");
      setEditAppendixNo(data.appendix_no || "");
      setEditContractStart(data.contract_start || "");
      setEditContractEnd(data.contract_end || "");
      setEditInitialAmount(data.initial_amount !== null && data.initial_amount !== undefined ? String(data.initial_amount) : "");

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }

      onRefreshNotifications?.();
    } catch (err: any) {
      alert(err.message || "مشکلی رخ داده است.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editActivityField.trim()) {
      alert("لطفا نام پیمانکار و رسته تفصیلی را ثبت فرمایید.");
      return;
    }

    try {
      const res = await fetch(`/api/contractors/${contractorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          activity_field: editActivityField.trim(),
          retention_rate: parseFloat(editRetentionRate) || 0,
          insurance_rate: parseFloat(editInsuranceRate) || 0,
          is_tax_and_insurance_exempt: editIsExempt,
          has_tax_val: editHasTaxVal,
          contract_no: editContractNo.trim() || null,
          appendix_no: editAppendixNo.trim() || null,
          contract_start: editContractStart.trim() || null,
          contract_end: editContractEnd.trim() || null,
          initial_amount: editInitialAmount ? parseFloat(parseInputNumber(editInitialAmount)) : null
        })
      });

      if (!res.ok) throw new Error("ثبت ویرایش با خطا روبرو شد.");
      setShowContractorEditModal(false);
      fetchProfile();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedGross = parseFloat(parseInputNumber(grossAmount));
    if (!invoiceNumber.trim() || isNaN(parsedGross) || parsedGross <= 0) {
      alert("لطفا شماره صورت‌وضعیت و مبلغ ناخالص معتبر وارد نمایید.");
      return;
    }

    const currentGross = parsedGross;
    const existingGrossTotal = profile ? (profile.invoices || []).reduce((sum, inv) => sum + (inv.gross_amount || 0), 0) : 0;
    const newGrossTotal = existingGrossTotal + currentGross;

    // Validate 25% progress threshold policy only if initial amount is registered
    if (profile && profile.initial_amount && parseFloat(String(profile.initial_amount)) > 0) {
      const initAmt = parseFloat(String(profile.initial_amount));
      const percentage = (newGrossTotal / initAmt) * 100;

      if (isInvoiceFinal) {
        if (percentage < 75) {
          alert(`خطای ممانعت قانونی صورت‌کاهش کار: مجموع تجمعی صورت‌وضعیت‌های قطعی (${percentage.toFixed(1)}٪) زیر حدنصاب مجاز ۷۵٪ مبلغ اولیه قرارداد قرار گرفته است. نیاز به صدور الحاقیه رسمی کاهش کار می‌باشد.`);
          return;
        }

        if (percentage > 125) {
          if (invoiceConfirmCount < 2) {
            setInvoiceConfirmCount(prev => prev + 1);
            alert(`❗️ اخطار شدید موازنه مجاز پیمان (بیشتر از ۱۲۵٪): تراز تجمعی صورت‌وضعیت قطعی با این صنف به ${percentage.toFixed(1)}٪ مبلغ اولیه قرارداد می‌رسد. این اقدام خارج سقف قانونی ۲۵٪ افزایش کار بوده و الزاماً پیمان جدید مجزا لازم دارد. برای نادیده گرفتن و ثبت نهایی، دکمه تایید را ${2 - invoiceConfirmCount} بار دیگر کلیک کنید.`);
            return;
          }
        } else if (percentage > 100) {
          if (invoiceConfirmCount < 1) {
            setInvoiceConfirmCount(prev => prev + 1);
            alert(`⚠️ هشدار توازن پیمان (۱۰۰٪ الی ۱۲۵٪): تعهد تجمعی پیشرفت فیزیکی موازنه به ${percentage.toFixed(1)}٪ ارزش قرارداد خواهد رسید. نیاز صریح به الحاقیه افزایش کار وجود دارد. مجدداً جهت ثبت قطعی تایید نمایید.`);
            return;
          }
        }
      }
    }

    try {
      const res = await fetch(`/api/contractors/${contractorId}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_number: invoiceNumber.trim(),
          gross_amount: currentGross,
          is_final: isInvoiceFinal
        }),
      });

      if (!res.ok) throw new Error("خطا در ثبت صورت‌وضعیت جدید در سیستم");

      // Automatically post system notifications on threshold warnings
      if (profile && profile.initial_amount && parseFloat(String(profile.initial_amount)) > 0) {
        const initAmt = parseFloat(String(profile.initial_amount));
        const percentage = (newGrossTotal / initAmt) * 100;
        
        let notifTitle = "";
        let notifMsg = "";

        if (percentage > 125) {
          notifTitle = `⚠️ هشدار حاد موازنه پیمانکار: ${profile.name}`;
          notifMsg = `کارکرد تجمعی پیمانکار "${profile.name}" با صورت‌وضعیت شماره ${invoiceNumber} به ${percentage.toFixed(1)}٪ سقف قرارداد تجاوز نمود (محدوده قرمز رنگ). پیگیری فوری لازم است.`;
        } else if (percentage > 100) {
          notifTitle = `📊 هشدار توازن پیمان: ${profile.name}`;
          notifMsg = `صورت‌وضعیت جدید شماره ${invoiceNumber} برای پیمانکار "${profile.name}" تراز کارکرد را به ${percentage.toFixed(1)}٪ ارزش قرارداد رساند و نیاز به الحاقیه افزایش کار دارد.`;
        } else if (isInvoiceFinal && percentage < 75) {
          notifTitle = `📉 هشدار صورت‌کاهش کار: ${profile.name}`;
          notifMsg = `صورت‌وضعیت قطعی پیمانکار "${profile.name}" معادل ${percentage.toFixed(1)}٪ کل پیمان شده و زیر حدنصاب ۷۵٪ است. الحاقیه کاهش کار لازم می‌باشد.`;
        }

        if (notifTitle) {
          await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: notifTitle,
              message: notifMsg,
              type: "credit_warning",
              date: new Date().toLocaleDateString("fa-IR")
            })
          });
        }
      }
      
      setInvoiceNumber("");
      setGrossAmount("");
      setIsInvoiceFinal(false);
      setInvoiceConfirmCount(0);
      setShowInvoiceModal(false);
      fetchProfile();
    } catch (err: any) {
      alert(err.message || "خطا در ثبت اطلاعات.");
    }
  };

  const startEditInvoice = (inv: any) => {
    setEditingInvoiceId(inv.id);
    setEditingInvoiceNumber(inv.invoice_number);
    setEditingGrossAmount(formatInputNumber(inv.gross_amount));
    setEditingIsInvoiceFinal(!!inv.is_final);
    setEditingInvoiceConfirmCount(0);
    setShowInvoiceEditModal(true);
  };

  const handleEditInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedGross = parseFloat(parseInputNumber(editingGrossAmount));
    if (!editingInvoiceId || !editingInvoiceNumber.trim() || isNaN(parsedGross) || parsedGross <= 0) {
      alert("اطلاعات صورت‌وضعیت اشتباه است.");
      return;
    }

    const currentGross = parsedGross;
    // Calc total excluding this invoice
    const existingOthersGrossTotal = profile ? (profile.invoices || [])
      .filter(inv => inv.id !== editingInvoiceId)
      .reduce((sum, inv) => sum + (inv.gross_amount || 0), 0) : 0;
    const newGrossTotal = existingOthersGrossTotal + currentGross;

    if (profile && profile.initial_amount && parseFloat(String(profile.initial_amount)) > 0) {
      const initAmt = parseFloat(String(profile.initial_amount));
      const percentage = (newGrossTotal / initAmt) * 100;

      if (editingIsInvoiceFinal) {
        if (percentage < 75) {
          alert(`خطای ممانعت قانونی صورت‌کاهش کار: مجموع تجمعی صورت‌وضعیت‌های قطعی (${percentage.toFixed(1)}٪) زیر حدنصاب مجاز ۷۵٪ مبلغ اولیه قرارداد قرار گرفته است. نیاز به صدور الحاقیه رسمی کاهش کار می‌باشد.`);
          return;
        }

        if (percentage > 125) {
          if (editingInvoiceConfirmCount < 2) {
            setEditingInvoiceConfirmCount(prev => prev + 1);
            alert(`❗️ اخطار شدید موازنه مجاز پیمان (بیشتر از ۱۲۵٪): تراز تجمعی صورت‌وضعیت قطعی با این صنف به ${percentage.toFixed(1)}٪ مبلغ اولیه قرارداد می‌رسد. این اقدام خارج سقف قانونی ۲۵٪ افزایش کار بوده و الزاماً پیمان جدید مجزا لازم دارد. برای نادیده گرفتن و ثبت نهایی، دکمه تایید را ${2 - editingInvoiceConfirmCount} بار دیگر کلیک کنید.`);
            return;
          }
        } else if (percentage > 100) {
          if (editingInvoiceConfirmCount < 1) {
            setEditingInvoiceConfirmCount(prev => prev + 1);
            alert(`⚠️ هشدار توازن پیمان (۱۰۰٪ الی ۱۲۵٪): تعهد تجمعی پیشرفت فیزیکی موازنه به ${percentage.toFixed(1)}٪ ارزش قرارداد خواهد رسید. نیاز صریح به الحاقیه افزایش کار وجود دارد. مجدداً جهت ثبت قطعی تایید نمایید.`);
            return;
          }
        }
      }
    }

    try {
      const res = await fetch(`/api/contractors/invoices/${editingInvoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_number: editingInvoiceNumber.trim(),
          gross_amount: currentGross,
          is_final: editingIsInvoiceFinal
        })
      });

      if (!res.ok) throw new Error("موفقیت‌آمیز نبود.");

      // Automatically post system notifications on threshold warnings
      if (profile && profile.initial_amount && parseFloat(String(profile.initial_amount)) > 0) {
        const initAmt = parseFloat(String(profile.initial_amount));
        const percentage = (newGrossTotal / initAmt) * 100;
        
        let notifTitle = "";
        let notifMsg = "";

        if (percentage > 125) {
          notifTitle = `⚠️ اصلاح موازنه پیمانکار (بیش از ۱۲۵٪): ${profile.name}`;
          notifMsg = `طی ویرایش صورت‌وضعیت شماره ${editingInvoiceNumber} پیمانکار "${profile.name}"، مجموع کارکرد به ${percentage.toFixed(1)}٪ سقف قرارداد تجاوز کرده است.`;
        } else if (percentage > 100) {
          notifTitle = `📊 اصلاح کارکرد پیمان (نیاز به الحاقیه): ${profile.name}`;
          notifMsg = `پیمانکار "${profile.name}" پس از ویرایش صورت‌وضعیت شماره ${editingInvoiceNumber} تراز کارکرد را به ${percentage.toFixed(1)}٪ ارزش پیمان رسانده و به متمم موازنه نیاز دارد.`;
        } else if (editingIsInvoiceFinal && percentage < 75) {
          notifTitle = `📉 اصلاح صورت‌کاهش کار (زیر ۷۵٪): ${profile.name}`;
          notifMsg = `صورت‌وضعیت قطعی پیمانکار "${profile.name}" پس از اصلاح معادل ${percentage.toFixed(1)}٪ است که از آستانه قانونی ۷۵٪ کل پیمان پایین‌تر است.`;
        }

        if (notifTitle) {
          await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: notifTitle,
              message: notifMsg,
              type: "credit_warning",
              date: new Date().toLocaleDateString("fa-IR")
            })
          });
        }
      }

      setShowInvoiceEditModal(false);
      fetchProfile();
    } catch (err: any) {
      alert(err.message || "خطا در بروزرسانی سند کارکرد.");
    }
  };

  const handleDeleteInvoice = async (id: number) => {
    if (!confirm("آیا از حذف این صورت‌وضعیت اطمینان کامل دارید؟")) return;
    if (!confirm("تأیید مجدد جهت اطمینان نهایی:\nپیرو هشدار قبلی، آیا واقعاً مایل به حذف برگه صورت‌وضعیت مالی این پیمانکار می‌باشید؟ محاسبات بستانکاری تغییر خواهد کرد.")) return;

    try {
      const res = await fetch(`/api/contractors/invoices/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("خطا در ثبت درخواست حذف صورت‌وضعیت");
      fetchProfile();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(parseInputNumber(paymentAmount));
    if (!paymentDate.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("لطفا تاریخ پرداخت و مبلغ معتبر را ثبت نمایید.");
      return;
    }

    try {
      const res = await fetch(`/api/contractors/${contractorId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_date: paymentDate.trim(),
          amount: parsedAmount,
          description: paymentDescription.trim()
        }),
      });

      if (!res.ok) throw new Error("خطا در ثبت رسید پرداخت");
      
      setPaymentAmount("");
      setPaymentDescription("");
      setShowPaymentModal(false);
      fetchProfile();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const startEditPayment = (pay: any) => {
    setEditingPaymentId(pay.id);
    setEditingPaymentDate(pay.payment_date);
    setEditingPaymentAmount(formatInputNumber(pay.amount));
    setEditingPaymentDescription(pay.description || "");
    setShowPaymentEditModal(true);
  };

  const handleEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(parseInputNumber(editingPaymentAmount));
    if (!editingPaymentId || !editingPaymentDate.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("مبلغ و تاریخ فیش پرداخت معتبر نیست.");
      return;
    }

    try {
      const res = await fetch(`/api/contractors/payments/${editingPaymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_date: editingPaymentDate.trim(),
          amount: parsedAmount,
          description: editingPaymentDescription.trim()
        })
      });

      if (!res.ok) throw new Error("ثبت رسید پرداخت با خطا روبرو شد.");
      setShowPaymentEditModal(false);
      fetchProfile();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeletePayment = async (id: number) => {
    if (!confirm("آیا از حذف این ردیف پرداخت اطمینان دارید؟")) return;
    if (!confirm("تأیید مجدد جهت اطمینان نهایی:\nپیرو هشدار پیشین، آیا واقعاً تمایل دارید این ردیف حواله پرداختی را به طور دائمی پاک نمایید؟ بدهی پیمانکار مجدداً بستانکار محاسبه می‌شود.")) return;

    try {
      const res = await fetch(`/api/contractors/payments/${id}`, {
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
      <div id="contractor-profile-loading" className="p-16 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mb-2"></div>
        <p className="text-xs text-stone-500">در حال بارگیری موازنه مالی پیمانکار...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-16 text-center">
        <p className="text-rose-500 font-bold">پرونده پیمانکار یافت نشد.</p>
        <button onClick={onBack} className="mt-4 bg-slate-900 text-white px-4 py-2 rounded-xl cursor-pointer text-xs">بازگشت</button>
      </div>
    );
  }

  const totalDeductions = (profile.total_retention || 0) + (profile.total_insurance || 0);
  const initAmt = profile.initial_amount ? parseFloat(String(profile.initial_amount)) : 0;
  const currentPercentage = initAmt > 0 ? (profile.total_gross / initAmt) * 100 : 0;

  const filteredInvoices = (profile.invoices || [])
    .filter(inv => {
      const q = invSearch.toLowerCase().trim();
      return !q ||
        inv.invoice_number.toLowerCase().includes(q) ||
        String(inv.gross_amount).includes(q) ||
        String(inv.net_amount).includes(q);
    })
    .sort((a, b) => {
      if (invSort === "gross_desc") return b.gross_amount - a.gross_amount;
      if (invSort === "net_desc") return b.net_amount - a.net_amount;
      return b.id - a.id;
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
    <div id="contractor-profile-root" className="container mx-auto px-4 py-6 max-w-7xl animate-fade-in text-right">
      {/* Profile Header Card with Contract Details */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-8 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-right">
            <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xs">
              <Briefcase className="w-6 h-6 text-stone-200" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-950">{profile.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-xs bg-slate-100 text-stone-600 px-3 py-1 rounded-full font-bold">
                  رسته عملیاتی: {profile.activity_field}
                </span>
                <span className="text-xs text-stone-400 font-mono">
                  شناسه: #{convertToPersianDigits(profile.id)}
                </span>
                {profile.is_tax_and_insurance_exempt ? (
                  <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-md font-bold">
                    معاف از بیمه و مالیات
                  </span>
                ) : null}
                {profile.has_tax_val ? (
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-md font-bold">
                    مشمول ارزش افزوده (۱۰٪)
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowContractorEditModal(true)}
              className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <span>تنظیمات و ویرایش قرارداد</span>
            </button>
            <button 
              id="back-to-contractors-dashboard-btn"
              onClick={onBack}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-900" />
              <span>بازگشت به فهرست ترازها</span>
            </button>
          </div>
        </div>

        {/* Detailed Contract metadata grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-stone-100 text-xs">
          <div className="bg-stone-50/50 p-3 rounded-lg border border-stone-100">
            <span className="text-[10px] text-stone-400 block mb-1">شماره قرارداد</span>
            <span className="font-bold text-stone-850 font-mono">
              {profile.contract_no ? convertToPersianDigits(profile.contract_no) : "ثبت نشده"}
            </span>
          </div>
          <div className="bg-stone-50/50 p-3 rounded-lg border border-stone-100">
            <span className="text-[10px] text-stone-400 block mb-1">شماره الحاقیه</span>
            <span className="font-bold text-stone-850 font-mono">
              {profile.appendix_no ? convertToPersianDigits(profile.appendix_no) : "تک متمم یا فاقد الحاقیه"}
            </span>
          </div>
          <div className="bg-stone-50/50 p-3 rounded-lg border border-stone-100">
            <span className="text-[10px] text-stone-400 block mb-1">بازه قرارداد</span>
            <span className="font-bold text-stone-850 font-mono">
              {profile.contract_start ? convertToPersianDigits(profile.contract_start) : "ـ"} لغایت {profile.contract_end ? convertToPersianDigits(profile.contract_end) : "ـ"}
            </span>
          </div>
          <div className="bg-stone-50/50 p-3 rounded-lg border border-stone-100">
            <span className="text-[10px] text-stone-400 block mb-1">مبلغ اولیه پیمان</span>
            <span className="font-bold text-stone-850 font-mono">
              {profile.initial_amount ? formatCurrency(profile.initial_amount) : "ثبت نشده"}
            </span>
          </div>
          <div className="bg-stone-50/50 p-3 rounded-lg border border-stone-100">
            <span className="text-[10px] text-stone-400 block mb-1">حق بیمه و سپرده حسن‌انجام‌کار</span>
            <span className="font-bold text-stone-850">
              بیمه: {convertToPersianDigits(profile.insurance_rate !== undefined ? profile.insurance_rate : 5)}٪ | حسن کار: {convertToPersianDigits(profile.retention_rate !== undefined ? profile.retention_rate : 10)}٪
            </span>
          </div>
        </div>
      </div>

      {/* Alert conditions if contract thresholds met */}
      {initAmt > 0 && (
        <div className="mb-6 space-y-3">
          {currentPercentage > 125 ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-xs font-semibold shadow-xs">
              <span className="p-1 px-2.5 bg-red-100 rounded-lg text-red-700 font-bold shrink-0">❗ اخطار حاد سقف پیمان (بیشتر از ۱۲۵٪)</span>
              <span className="leading-relaxed">پیشرفت ناخالص تجمعی این پیمانکار به <strong className="font-mono text-sm">{convertToPersianDigits(currentPercentage.toFixed(1))}%</strong> ارزش اولیه قرارداد رسیده است. این اقدام خارج از حدنصاب قانونی ۲۵٪ افزایش کار بوده و فاقد وجاهت است و الزاماً پیمان جدید مجزا لازم دارد.</span>
            </div>
          ) : currentPercentage >= 100 ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs font-semibold shadow-xs">
              <span className="p-1 px-2.5 bg-amber-100 rounded-lg text-amber-700 font-bold shrink-0">⚠️ هشدار سقف افزایش کار (۱۰۰٪ الی ۱۲۵٪)</span>
              <span className="leading-relaxed">پیشرفت مالی کارکرد تجمعی به <strong className="font-mono text-sm">{convertToPersianDigits(currentPercentage.toFixed(1))}%</strong> ارزش قرارداد رسیده است. جهت ثبت قطعی‌های بعدی، صدور و تایید رسمی الحاقیه افزایش کار الزامی است.</span>
            </div>
          ) : currentPercentage < 75 ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-2xl text-xs font-semibold shadow-xs">
              <span className="p-1 px-2.5 bg-blue-100 rounded-lg text-blue-700 font-bold shrink-0">ℹ️ هشدار صورت‌کاهش کار (کمتر از ۷۵٪)</span>
              <span className="leading-relaxed">تعهد تجمعی کارکرد قطعی از حدنصاب قانونی ۷۵٪ کل پیمان پایین‌تر است (<strong className="font-mono text-sm">{convertToPersianDigits(currentPercentage.toFixed(1))}%</strong>). به منظور انطباق حسابرسی، تنظیم الحاقیه رسمی کاهش کار لازم است.</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Aggregate Financial Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div id="contractor-profile-card-gross" className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs">
          <span className="text-xs font-bold text-stone-500">کارکرد ناخالص کل</span>
          <p className="text-md sm:text-lg font-black text-slate-900 mt-2">{formatCurrency(profile.total_gross)}</p>
        </div>

        <div id="contractor-profile-card-deductions" className="bg-white p-4 rounded-xl border border-stone-200/80 border-r-4 border-r-rose-600 shadow-xs">
          <span className="text-xs font-bold text-rose-700">
            کسورات قانونی (بیمه {convertToPersianDigits(profile.insurance_rate !== undefined ? profile.insurance_rate : 5)}٪ + حسن‌ کار {convertToPersianDigits(profile.retention_rate !== undefined ? profile.retention_rate : 10)}٪)
          </span>
          <p className="text-md sm:text-lg font-black text-rose-700 mt-2">{formatCurrency(totalDeductions)}</p>
        </div>

        <div id="contractor-profile-card-net" className="bg-white p-4 rounded-xl border border-stone-200/80 border-r-4 border-r-con-dark shadow-xs">
          <span className="text-xs font-bold text-slate-600">کارکرد خالص نهایی</span>
          <p className="text-md sm:text-lg font-black text-con-dark mt-2">{formatCurrency(profile.total_net)}</p>
        </div>

        <div id="contractor-profile-card-paid" className="bg-white p-4 rounded-xl border border-stone-200/80 border-r-4 border-r-emerald-600 shadow-xs">
          <span className="text-xs font-bold text-emerald-700">کل مبالغ پرداختی</span>
          <p className="text-md sm:text-lg font-black text-emerald-700 mt-2">{formatCurrency(profile.total_paid)}</p>
        </div>

        <div id="contractor-profile-card-remaining" className="bg-white p-4 rounded-xl border border-stone-200/80 border-r-4 border-r-orange-600 shadow-xs">
          <span className="text-xs font-bold text-orange-700">باقیمانده تراز حساب</span>
          <p className="text-md sm:text-lg font-black text-orange-700 mt-2">{formatCurrency(profile.remaining_balance)}</p>
        </div>
      </div>

      {/* Tabs and Quick Actions Floating Panel */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl self-start">
            <button
              id="activate-invoices-tab-btn"
              onClick={() => setActiveTab("invoices")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "invoices" 
                  ? "bg-white text-con-dark shadow-sm" 
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              ریز صورت‌وضعیت‌های تسلیمی
            </button>
            <button
              id="activate-payments-tab-btn"
              onClick={() => setActiveTab("payments")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "payments" 
                  ? "bg-white text-con-dark shadow-sm" 
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              ریز حواله و اسناد پرداخت
            </button>
          </div>

          <div className="flex gap-2">
            <button
              id="open-add-invoice-modal-btn"
              onClick={() => setShowInvoiceModal(true)}
              className="flex items-center gap-1.5 bg-con-dark hover:bg-blue-950 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت صورت‌وضعیت جدید</span>
            </button>
            <button
              id="open-add-payment-modal-btn"
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت سند پرداخت</span>
            </button>
            <button
              id="print-contractor-statement-btn"
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ صورت وضعیت</span>
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-4">
          {activeTab === "invoices" ? (
            <div className="space-y-4">
              <div className="bg-slate-50/50 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-stone-100">
                <div className="relative flex-1 max-w-xs">
                  <input
                    type="text"
                    placeholder="جست‌وجو در شماره یا مبالغ..."
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                    className="w-full text-xs px-3.5 py-1.5 bg-white border border-stone-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-con-main text-right"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-stone-400 font-bold">ترتیب صورت‌وضعیت:</span>
                  <select
                    value={invSort}
                    onChange={(e) => setInvSort(e.target.value)}
                    className="bg-white border border-stone-200 rounded-lg text-[10px] px-2 py-1 text-slate-650 cursor-pointer"
                  >
                    <option value="id_desc">جدید‌ترین اسناد ارائه‌شده</option>
                    <option value="gross_desc">بیشترین کارکرد ناخالص</option>
                    <option value="net_desc">بیشترین کارکرد خالص فیش</option>
                  </select>
                </div>
              </div>

              {profile.invoices.length === 0 ? (
                <div className="p-16 text-center">
                  <FileText className="w-12 h-12 text-stone-300 mx-auto mb-2" />
                  <h3 className="text-xs font-bold text-stone-600">هنوز صورت‌وضعیتی صادر نشده است</h3>
                  <p className="text-[10px] text-stone-400 mt-1">با ثبت صورت‌وضعیت جدید در این ماژول، مبالغ قانونی و تراز را محاسبه فرمایید.</p>
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="p-12 text-center text-stone-400 text-xs">
                  <p>هیچ صورت‌وضعیتی هماهنگ با فیلتر یافت نشد.</p>
                </div>
              ) : (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 text-stone-500 font-bold border-b border-stone-100">
                      <tr>
                        <th className="py-3 px-4">شماره صورت‌وضعیت</th>
                        <th className="py-3 px-4 text-center">نوع تعهد</th>
                        <th className="py-3 px-4 text-left">مجموع ناخالص کارکرد</th>
                        <th className="py-3 px-4 text-left text-rose-500">حسن‌انجام‌کار (کسور)</th>
                        <th className="py-3 px-4 text-left text-rose-500">حق بیمه کارکرد</th>
                        <th className="py-3 px-4 text-left text-indigo-650 font-bold">خالص قابل پرداخت</th>
                        <th className="py-3 px-4 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100/50">
                      {filteredInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4 font-bold text-stone-700">{inv.invoice_number}</td>
                          <td className="py-4 px-4 text-center">
                            {inv.is_final ? (
                              <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block">
                                قطعی و نهایی
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block">
                                صورت موقت
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-left font-semibold text-slate-800 font-mono">{formatCurrency(inv.gross_amount)}</td>
                          <td className="py-4 px-4 text-left text-rose-600 font-mono">
                            -{formatCurrency(inv.retention_bond)}
                            <span className="text-[9px] text-stone-400 block font-sans">({convertToPersianDigits(inv.retention_rate_used !== undefined ? inv.retention_rate_used : 10)}٪)</span>
                          </td>
                          <td className="py-4 px-4 text-left text-rose-600 font-mono">
                            -{formatCurrency(inv.insurance)}
                            <span className="text-[9px] text-stone-400 block font-sans">({convertToPersianDigits(inv.insurance_rate_used !== undefined ? inv.insurance_rate_used : 5)}٪)</span>
                          </td>
                          <td className="py-4 px-4 text-left text-slate-900 font-black font-mono">{formatCurrency(inv.net_amount)}</td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex justify-center items-center gap-1.5">
                              <button
                                onClick={() => startEditInvoice(inv)}
                                className="p-1 px-2.5 hover:bg-slate-100 text-stone-600 hover:text-stone-900 rounded-lg transition-colors cursor-pointer text-[10px] font-bold"
                                title="ویرایش"
                              >
                                ویرایش
                              </button>
                              <button
                                id={`delete-invoice-${inv.id}-btn`}
                                onClick={() => handleDeleteInvoice(inv.id)}
                                className="p-1 px-2 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                                title="حذف سند"
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
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50/50 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-stone-100">
                <div className="relative flex-1 max-w-xs">
                  <input
                    type="text"
                    placeholder="جست‌وجو در شرح فیش یا تاریخ..."
                    value={paySearch}
                    onChange={(e) => setPaySearch(e.target.value)}
                    className="w-full text-xs px-3.5 py-1.5 bg-white border border-stone-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-con-main text-right"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-stone-400 font-bold">ترتیب پرداخت‌ها:</span>
                  <select
                    value={paySort}
                    onChange={(e) => setPaySort(e.target.value)}
                    className="bg-white border border-stone-200 rounded-lg text-[10px] px-2 py-1 text-slate-650 cursor-pointer"
                  >
                    <option value="id_desc">آخرین پرداخت‌های صادر شده</option>
                    <option value="amount_desc">بیشترین مبلغ حواله</option>
                    <option value="date_desc">به ترتیب تاریخ پرداخت</option>
                  </select>
                </div>
              </div>

              {profile.payments.length === 0 ? (
                <div className="p-16 text-center">
                  <DollarSign className="w-12 h-12 text-stone-300 mx-auto mb-2" />
                  <h3 className="text-xs font-bold text-stone-600">هیچ فیش پرداختی ثبت نشده است</h3>
                  <p className="text-[10px] text-stone-400 mt-1">با ثبت مساعده‌ها و فیش‌های مالی کارگاه، تراز کل پیمانکار را تطبیق دهید.</p>
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="p-12 text-center text-stone-400 text-xs">
                  <p>هیچ فیش پرداختی مطابق فیلتر یافت نشد.</p>
                </div>
              ) : (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 text-stone-500 font-bold border-b border-stone-100">
                      <tr>
                        <th className="py-3 px-4">تاریخ پرداخت</th>
                        <th className="py-3 px-4 text-left">مبلغ واریزی نهایی</th>
                        <th className="py-3 px-4">شرح بابت پرداخت سند</th>
                        <th className="py-3 px-4 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100/50">
                      {filteredPayments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4 font-bold text-stone-700 font-mono">{convertToPersianDigits(pay.payment_date)}</td>
                          <td className="py-4 px-4 text-left text-emerald-700 font-black font-mono">{formatCurrency(pay.amount)}</td>
                          <td className="py-4 px-4 text-xs text-stone-600">{pay.description || "بدون توضیحات مازاد"}</td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex justify-center items-center gap-1.5">
                              <button
                                onClick={() => startEditPayment(pay)}
                                className="p-1 px-2.5 hover:bg-slate-100 text-stone-600 hover:text-stone-900 rounded-lg transition-colors cursor-pointer text-[10px] font-bold"
                                title="ویرایش حواله"
                              >
                                ویرایش
                              </button>
                              <button
                                id={`delete-payment-${pay.id}-btn`}
                                onClick={() => handleDeletePayment(pay.id)}
                                className="p-1 px-2 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                                title="حذف حواله"
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
          )}
        </div>
      </div>

      {/* 1. Modal statement input */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full overflow-hidden text-right"
          >
            <div className="p-5 bg-con-dark text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm">ثبت صورت‌وضعیت پیمانکاری جزء</h3>
              <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-white text-xl cursor-pointer">&times;</button>
            </div>
            
            <form onSubmit={handleAddInvoice} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">شماره فاکتور / صورت‌وضعیت</label>
                <input
                  id="invoice-number-input"
                  type="text"
                  required
                  placeholder="مثال: ص-فضلی-۰۲"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-con-main text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">مبلغ ناخالص صورت‌وضعیت (ریال)</label>
                <input
                  id="gross-amount-input"
                  type="text"
                  required
                  placeholder="مثال: ۱۲۰,۰۰۰,۰۰۰"
                  value={grossAmount}
                  onChange={(e) => setGrossAmount(formatInputNumber(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-con-main text-right pr-3 pl-3 font-mono font-bold"
                  dir="ltr"
                />
                <p className="text-[10px] text-stone-400 mt-2 leading-relaxed">
                  * توجه: پس از کلیک روی ثبت، کسورات قانونی شامل حسن‌انجام‌کار ({profile.retention_rate !== undefined ? profile.retention_rate : 10}٪) و بیمه ({profile.insurance_rate !== undefined ? profile.insurance_rate : 5}٪) اعمال می‌گردند.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1 pb-2">
                <input
                  id="invoice-is-final-checkbox"
                  type="checkbox"
                  checked={isInvoiceFinal}
                  onChange={(e) => {
                    setIsInvoiceFinal(e.target.checked);
                    setInvoiceConfirmCount(0);
                  }}
                  className="w-4 h-4 text-slate-900 border-stone-300 rounded cursor-pointer"
                />
                <label htmlFor="invoice-is-final-checkbox" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  این صورت‌وضعیت «قطعی و نهایی» کارگاه است
                </label>
              </div>

              {invoiceConfirmCount > 0 && isInvoiceFinal ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[10px] text-rose-700 leading-relaxed font-bold animate-pulse">
                  ⚠️ تأیید چندباره الزامی است: مبلغ درخواستی خارج از حدود پیش‌بینی قرارداد می‌باشد (فراتر از مرز ۱۰۰٪ پیمان). برای صرف‌نظر از مرزبندی و ثبت نهایی، مجدداً دکمه ارسال را کلیک نمایید.
                </div>
              ) : null}

              <div className="flex gap-2 pt-3">
                <button
                  id="cancel-add-invoice-btn"
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  id="confirm-add-invoice-btn"
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  {invoiceConfirmCount > 0 ? "تأیید مجدد نهایی" : "تایید و ثبت"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 2. Modal payment input */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full overflow-hidden text-right"
          >
            <div className="p-5 bg-con-dark text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm">ثبت حواله مالی / فیش مساعده</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white text-xl cursor-pointer">&times;</button>
            </div>
            
            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">تاریخ سند واریزی (هجری شمسی)</label>
                <input
                  id="payment-date-input"
                  type="text"
                  required
                  placeholder="مثال: ۱۴۰۵/۰۳/۰۴"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-con-main text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">مبلغ واریزی / مساعده نهایی (ریال)</label>
                <input
                  id="payment-amount-input"
                  type="text"
                  required
                  placeholder="مثال: ۵۰,۰۰۰,۰۰۰"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(formatInputNumber(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-con-main text-right font-mono font-bold"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">توضیحات و بابت پرداخت سند</label>
                <textarea
                  id="payment-desc-textarea"
                  placeholder="مثال: مساعده بابت خرید مصالح فونداسیون - نقدی از تنخواه کارگاه"
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-con-main text-right resize-none"
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
                  className="flex-1 py-2.5 bg-con-dark hover:bg-blue-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  ثبت مساعده و سند
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 1.5. Contractor Edit and Settings Modal */}
      {showContractorEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-right">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-lg w-full overflow-hidden"
          >
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm">تنظیمات تفصیلی و ویرایش اطلاعات پیمانکار</h3>
              <button onClick={() => setShowContractorEditModal(false)} className="text-slate-400 hover:text-white text-xl cursor-pointer">&times;</button>
            </div>
            
            <form onSubmit={handleEditContractor} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">نام کامل پیمانکار</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">رسته تفصیلی عملیات</label>
                  <input
                    type="text"
                    required
                    value={editActivityField}
                    onChange={(e) => setEditActivityField(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">شماره قرارداد</label>
                  <input
                    type="text"
                    placeholder="مثال: ۹۸/۱۱۲/پ"
                    value={editContractNo}
                    onChange={(e) => setEditContractNo(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-right text-left font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">شماره الحاقیه (سند متمم)</label>
                  <input
                    type="text"
                    placeholder="مثال: الف/۱"
                    value={editAppendixNo}
                    onChange={(e) => setEditAppendixNo(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-right text-left font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">شروع پیمان (شمسی)</label>
                  <input
                    type="text"
                    placeholder="۱۴۰۴/۰۱/۱۵"
                    value={editContractStart}
                    onChange={(e) => setEditContractStart(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-right text-left font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">پایان پیمان (شمسی)</label>
                  <input
                    type="text"
                    placeholder="۱۴۰۵/۱۲/۲۹"
                    value={editContractEnd}
                    onChange={(e) => setEditContractEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-right text-left font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">مبلغ اولیه پیمان (ریال)</label>
                <input
                  type="text"
                  placeholder="مثال: ۲,۵۰۰,۰۰۰,۰۰۰"
                  value={editInitialAmount}
                  onChange={(e) => setEditInitialAmount(formatInputNumber(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-right font-mono font-bold"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">نرخ سپرده حسن‌انجام‌کار ٪</label>
                  <input
                    type="number"
                    value={editRetentionRate}
                    onChange={(e) => setEditRetentionRate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">نرخ کسر حق بیمه کارکرد ٪</label>
                  <input
                    type="number"
                    value={editInsuranceRate}
                    onChange={(e) => setEditInsuranceRate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-right font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    id="edit-is-exempt-chk"
                    type="checkbox"
                    checked={editIsExempt}
                    onChange={(e) => setEditIsExempt(e.target.checked)}
                    className="w-4 h-4 text-slate-900 border-stone-300 rounded cursor-pointer"
                  />
                  <label htmlFor="edit-is-exempt-chk" className="text-xs font-bold text-stone-600 cursor-pointer">
                    قرارداد تامین کالا/معاف کامل از مبالغ کسور (بیمه و حسن کار کسر نشود)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="edit-has-tax-chk"
                    type="checkbox"
                    checked={editHasTaxVal}
                    onChange={(e) => setEditHasTaxVal(e.target.checked)}
                    className="w-4 h-4 text-slate-900 border-stone-300 rounded cursor-pointer"
                  />
                  <label htmlFor="edit-has-tax-chk" className="text-xs font-bold text-stone-600 cursor-pointer">
                    قرارداد مشمول قانون ثبت ارزش افزوده کارگاهی (۱۰٪ به ناخالص اضافه شود)
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowContractorEditModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-stone-700 font-bold rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-950 hover:bg-black text-white font-bold rounded-lg cursor-pointer"
                >
                  ذخیره تغییرات و برآورد مجدد تراز
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 1.6. Invoice Edit Modal */}
      {showInvoiceEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-right">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full overflow-hidden"
          >
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm">ویرایش صورت‌وضعیت ثبت‌شده</h3>
              <button onClick={() => setShowInvoiceEditModal(false)} className="text-slate-400 hover:text-white text-xl cursor-pointer">&times;</button>
            </div>
            
            <form onSubmit={handleEditInvoice} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">شماره فاکتور / صورت‌وضعیت</label>
                <input
                  type="text"
                  required
                  value={editingInvoiceNumber}
                  onChange={(e) => setEditingInvoiceNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950 text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">مبلغ ناخالص صورت‌وضعیت (ریال)</label>
                <input
                  type="text"
                  required
                  value={editingGrossAmount}
                  onChange={(e) => setEditingGrossAmount(formatInputNumber(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950 text-right font-mono font-bold"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center gap-2 pt-1 pb-2">
                <input
                  id="edit-invoice-is-final-checkbox"
                  type="checkbox"
                  checked={editingIsInvoiceFinal}
                  onChange={(e) => {
                    setEditingIsInvoiceFinal(e.target.checked);
                    setEditingInvoiceConfirmCount(0);
                  }}
                  className="w-4 h-4 text-slate-900 border-stone-300 rounded cursor-pointer"
                />
                <label htmlFor="edit-invoice-is-final-checkbox" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  این صورت‌وضعیت «قطعی و نهایی» کارگاه است
                </label>
              </div>

              {editingInvoiceConfirmCount > 0 && editingIsInvoiceFinal ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[10px] text-rose-700 leading-relaxed font-bold animate-pulse">
                  ⚠️ تأیید چندباره الزامی است: موازنه پیشرفت تجمعی با این فیش فراتر از حد مجاز ۲۵٪ افزایش کار می‌باشد. جهت نادیده گرفتن سقف قرارداد و ثبت، دکمه ذخیره را مجددا بفشارید.
                </div>
              ) : null}

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInvoiceEditModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  {editingInvoiceConfirmCount > 0 ? "تأیید مجدد نهایی" : "بروزرسانی سند"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 1.7. Payment Edit Modal */}
      {showPaymentEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-right">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full overflow-hidden"
          >
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm">ویرایش فیش پرداخت / مساعده مالی</h3>
              <button onClick={() => setShowPaymentEditModal(false)} className="text-slate-400 hover:text-white text-xl cursor-pointer">&times;</button>
            </div>
            
            <form onSubmit={handleEditPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">تاریخ سند واریزی (هجری شمسی)</label>
                <input
                  type="text"
                  required
                  value={editingPaymentDate}
                  onChange={(e) => setEditingPaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950 text-right font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">مبلغ واریزی / مساعده نهایی (ریال)</label>
                <input
                  type="text"
                  required
                  value={editingPaymentAmount}
                  onChange={(e) => setEditingPaymentAmount(formatInputNumber(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950 text-right font-mono font-bold"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5">توضیحات و بابت پرداخت سند</label>
                <textarea
                  value={editingPaymentDescription}
                  onChange={(e) => setEditingPaymentDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950 text-right resize-none"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentEditModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  بروزرسانی فیش
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
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
              /* Hide everything else */
              #root, #root-container, .fixed, .no-print, button, select, input {
                display: none !important;
                visibility: hidden !important;
              }
              #printable-area-contractor {
                display: block !important;
                visibility: visible !important;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white;
                padding: 10px;
              }
              .border-stone-200 {
                border-color: #666 !important;
              }
              .text-con-main {
                color: black !important;
              }
            }
          `}} />

          <motion.div 
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 md:p-8 overflow-y-auto max-h-[90vh] text-right text-slate-800 no-print"
          >
            {/* Modal actions panel */}
            <div className="flex items-center justify-between border-b pb-4 mb-6">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-con-main" />
                <h3 className="font-extrabold text-base">پیش‌نمایش سند چاپی صورت وضعیت پیمانکار</h3>
              </div>
              <div className="flex gap-2">
                <button
                  id="trigger-print-btn"
                  onClick={() => window.print()}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>اجرای پرینت (یا ذخیره PDF)</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  بستن پیش‌نمایش
                </button>
              </div>
            </div>

            {/* Printable Document Box */}
            <div 
              id="printable-area-contractor" 
              className="bg-white border-2 border-stone-300 p-8 rounded-xl font-sans text-xs flex flex-col space-y-6 leading-relaxed"
              style={{ direction: "rtl" }}
            >
              {/* Header Letterhead */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
                {/* Right col: Office brand */}
                <div className="flex flex-col space-y-1">
                  <span className="font-black text-sm text-slate-900 border-r-4 border-slate-900 pr-2.5">
                    {settings.enterprise_name || "دفتر فنی الوان"}
                  </span>
                  <span className="text-[10px] text-stone-500 pr-2.5">سامانه موازنه تراز حساب پیمانکاران عمرانی</span>
                </div>

                {/* Center col: Document title */}
                <div className="flex flex-col items-center space-y-2 text-center">
                  <span className="font-black text-base tracking-tight text-slate-950 font-bold">خلاصه تراز صورت وضعیت و مالیات پیمانکاران</span>
                  <span className="text-[10px] bg-neutral-100 px-3 py-1 rounded-full font-bold">
                    {settings.project_name || "پروژه مسکن ملی پرند"}
                  </span>
                </div>

                {/* Left col: Dates */}
                <div className="text-[9pt] flex flex-col space-y-1 text-left font-mono">
                  <span>تاریخ: {convertToPersianDigits(new Date().toLocaleDateString("fa-IR"))}</span>
                  <span>کد پیمانکار: C-{profile.id}</span>
                </div>
              </div>

              {/* Contractor Core Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-stone-50/50 p-4 rounded-xl border border-stone-200">
                <div>
                  <span className="text-[10px] text-stone-400 block mb-0.5">نام پیمانکار محترم:</span>
                  <strong className="text-stone-850 font-bold">{profile.name}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block mb-0.5">رسته و تخصص تفصیلی:</span>
                  <strong className="text-stone-850 font-bold">{profile.activity_field}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block mb-0.5">کل کارکرد ناخالص:</span>
                  <strong className="text-stone-850 font-bold font-mono text-slate-900">{formatCurrency(profile.total_gross)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block mb-0.5">کل علی‌الحساب پرداختی:</span>
                  <strong className="text-stone-850 font-bold font-mono text-emerald-850">{formatCurrency(profile.total_paid)}</strong>
                </div>
              </div>

              {/* Ledgers Grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Invoices */}
                <div>
                  <h4 className="font-black text-[11px] border-b pb-2 mb-3 text-slate-800">ریز صورت وضعیت‌های موقت تسلیمی</h4>
                  {profile.invoices && profile.invoices.length === 0 ? (
                    <div className="text-center py-4 text-stone-400">هیچ فاکتور یا صورت وضعیتی ثبت نشده است.</div>
                  ) : (
                    <table className="w-full text-right border border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b text-stone-600">
                          <th className="p-2 border-l">شماره سند</th>
                          <th className="p-2 border-l text-left">مبلغ ناخالص (ریال)</th>
                          <th className="p-2 border-l text-left">کسورات قانونی</th>
                          <th className="p-2 text-left">مبلغ خالص نهایی</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-mono">
                        {profile.invoices?.map((inv) => (
                          <tr key={inv.id}>
                            <td className="p-2 border-l font-bold text-slate-800">{inv.invoice_number}</td>
                            <td className="p-2 border-l text-left">{formatCurrency(inv.gross_amount)}</td>
                            <td className="p-2 border-l text-left text-rose-700">
                              {formatCurrency((inv.retention_bond || 0) + (inv.insurance || 0))}
                            </td>
                            <td className="p-2 text-left font-bold text-con-main">{formatCurrency(inv.net_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Payments */}
                <div>
                  <h4 className="font-black text-[11px] border-b pb-2 mb-3 text-slate-900 font-bold">ریز اسناد پرداختی کارفرما (علی‌الحساب)</h4>
                  {profile.payments && profile.payments.length === 0 ? (
                    <div className="text-center py-4 text-stone-400 font-bold">هیچ پرداختی ثبت نشده است</div>
                  ) : (
                    <table className="w-full text-right border border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b text-stone-600">
                          <th className="p-2 border-l col-span-2">تاریخ واریز فیش</th>
                          <th className="p-2 border-l">توضیحات حواله و بابت</th>
                          <th className="p-2 text-left">مبلغ واریزی (ریال)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-mono">
                        {profile.payments?.map((pay) => (
                          <tr key={pay.id}>
                            <td className="p-2 border-l font-bold">{convertToPersianDigits(pay.payment_date)}</td>
                            <td className="p-2 border-l text-stone-500 max-w-[170px] overflow-hidden text-ellipsis whitespace-nowrap">{pay.description || "ـ"}</td>
                            <td className="p-2 text-left font-bold text-emerald-800">{formatCurrency(pay.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Verified Ledger Bottom Summary */}
              <div className="border-t-2 border-slate-900 pt-5 flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Signatures */}
                <div className="flex gap-12 text-center text-[10px] font-bold text-stone-600">
                  <div className="flex flex-col space-y-6">
                    <span>امور مالی و حسابداری پروژه</span>
                    <span className="text-[8px] text-stone-400">(مهر و امضاء)</span>
                  </div>
                  <div className="flex flex-col space-y-6">
                    <span>ناظر مقیم فنی</span>
                    <span className="text-[8px] text-stone-400">(امضاء و تأیید تراز حساب)</span>
                  </div>
                </div>

                {/* Aggregate Calculations Block */}
                <div className="rounded-xl p-5 flex items-center justify-between gap-6 md:min-w-[340px] border" style={{ backgroundColor: '#fffbfb', borderColor: '#1c1919', color: '#100e0e' }}>
                  <div className="space-y-1">
                    <span className="text-[10px] block font-bold" style={{ color: '#111010' }}>باقیمانده تراز حساب (طلب پیمانکار)</span>
                    <strong className="text-lg font-black tracking-tight font-mono" style={{ color: '#11110e' }}>
                      {formatCurrency(profile.remaining_balance)}
                    </strong>
                  </div>
                  <div className="border-r pr-5 space-y-0.5 text-right font-mono text-[10px]" style={{ borderColor: '#1c1919' }}>
                    <div>کل خالص محاسباتی: {formatCurrency(profile.total_net)}</div>
                    <div>کل مبالغ پرداختی: {formatCurrency(profile.total_paid)}</div>
                  </div>
                </div>
              </div>

              {/* Footer technical indicators */}
              <div className="text-[8px] text-center text-stone-400 pt-2 border-t border-dashed">
                تنظیم شده به شیوه صورت وضعیت‌های قطعی تجمعی کارگاه الوان • تایید سند پس از امضای طرفین ارزش مالی خواهد داشت.
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
