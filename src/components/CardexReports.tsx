import React, { useState, useEffect, useMemo } from "react";
import { Product, Person } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Printer, 
  FileSpreadsheet, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  User, 
  Package, 
  RefreshCw, 
  Filter, 
  Info,
  Calendar,
  Layers,
  AlertTriangle,
  ChevronLeft,
  XCircle,
  TrendingUp,
  TrendingDown,
  FileText
} from "lucide-react";
import * as XLSX from "xlsx";
import { generateDirectPDF } from "../utils/pdfGenerator";

interface CardexReportsProps {
  products: Product[];
  persons: Person[];
  settings: Record<string, string>;
  initialProductId?: number;
  initialPersonId?: number;
}

// Format document numbers just like the documents archive
function formatDocId(id: number | string, settings: Record<string, string>) {
  const prefix = settings?.doc_prefix ?? "";
  const startNo = parseInt(settings?.doc_start_no ?? "1", 10);
  const offsetId = (Number(id) - 1) + (isNaN(startNo) ? 1 : startNo);
  return `${prefix}${String(offsetId).padStart(5, "0")}`;
}

export default function CardexReports({ 
  products, 
  persons, 
  settings, 
  initialProductId, 
  initialPersonId 
}: CardexReportsProps) {
  // Navigation states
  const [activeTab, setActiveTab] = useState<"product" | "person">("product");
  const [pdfProgress, setPdfProgress] = useState<{ active: boolean; message: string }>({ active: false, message: "" });
  const [pdfOrientation, setPdfOrientation] = useState<"portrait" | "landscape">("portrait");

  // Selection states
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);

  // Search filter inputs for the sidebar lists
  const [productSearch, setProductSearch] = useState("");
  const [personSearch, setPersonSearch] = useState("");

  // Loaded cardex data
  const [productCardex, setProductCardex] = useState<any | null>(null);
  const [personCardex, setPersonCardex] = useState<any | null>(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Person cardex sub-filter & sub-views
  const [personTab, setPersonTab] = useState<"summary" | "detailed">("summary");
  const [personProductFilter, setPersonProductFilter] = useState<string>("all"); // "all" or product code

  // Handle outside initials (e.g. from fast action links in Dashboard)
  useEffect(() => {
    if (initialProductId) {
      setActiveTab("product");
      setSelectedProductId(initialProductId);
    } else if (initialPersonId) {
      setActiveTab("person");
      setSelectedPersonId(initialPersonId);
    } else if (products.length > 0 && !selectedProductId) {
      // Auto-select first product if none selected
      setSelectedProductId(products[0].id!);
    }
  }, [initialProductId, initialPersonId, products]);

  // Sync / Fetch Product Cardex
  const fetchProductCardex = async (productId: number) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/products/${productId}/cardex`);
      if (!res.ok) {
        throw new Error("خطا در دریافت اطلاعات کارتکس کالا");
      }
      const data = await res.json();
      setProductCardex(data);
    } catch (err: any) {
      setErrorMsg(err.message || "بروز خطای ارتباطی");
      setProductCardex(null);
    } finally {
      setLoading(false);
    }
  };

  // Sync / Fetch Person Cardex
  const fetchPersonCardex = async (personId: number) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/persons/${personId}/cardex`);
      if (!res.ok) {
        throw new Error("خطا در دریافت اطلاعات پروندۀ تراکنش‌های شخص");
      }
      const data = await res.json();
      setPersonCardex(data);
    } catch (err: any) {
      setErrorMsg(err.message || "بروز خطای سروری");
      setPersonCardex(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when selection changes
  useEffect(() => {
    if (activeTab === "product" && selectedProductId) {
      fetchProductCardex(selectedProductId);
    } else if (activeTab === "person" && selectedPersonId) {
      fetchPersonCardex(selectedPersonId);
    }
  }, [selectedProductId, selectedPersonId, activeTab]);

  // If Tab switches, auto-select first option if none is selected
  useEffect(() => {
    if (activeTab === "product" && !selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].id!);
    } else if (activeTab === "person" && !selectedPersonId && persons.length > 0) {
      setSelectedPersonId(persons[0].id!);
    }
  }, [activeTab]);

  // Filter lists for Sidebar
  const filteredProductsList = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  const filteredPersonsList = useMemo(() => {
    return persons.filter(pe => 
      pe.name.toLowerCase().includes(personSearch.toLowerCase()) ||
      pe.role.toLowerCase().includes(personSearch.toLowerCase())
    );
  }, [persons, personSearch]);

  // Aggregated quantities for selected product cardex
  const productSummaryStats = useMemo(() => {
    if (!productCardex || !productCardex.cardex) return { incoming: 0, outgoing: 0, current: 0 };
    let incoming = 0;
    let outgoing = 0;
    productCardex.cardex.forEach((row: any) => {
      if (row.type === "incoming") incoming += Number(row.quantity);
      else outgoing += Number(row.quantity);
    });
    return {
      incoming,
      outgoing,
      current: incoming - outgoing
    };
  }, [productCardex]);

  // Process Person Cardex Data:
  // 1. Summarized unique products list delivered to/received from this person
  const personSummaryItems = useMemo(() => {
    if (!personCardex || !personCardex.rows) return [];
    
    // Aggregate by product code
    const map: Record<string, { 
      product_code: string; 
      product_name: string; 
      product_unit: string;
      product_category: string;
      delivered: number; // outgoing (taken from store)
      returned: number;  // incoming (given to store)
    }> = {};

    personCardex.rows.forEach((row: any) => {
      const code = row.product_code;
      if (!map[code]) {
        map[code] = {
          product_code: code,
          product_name: row.product_name,
          product_unit: row.product_unit,
          product_category: row.product_category || "عمومی",
          delivered: 0,
          returned: 0
        };
      }
      
      const q = Number(row.quantity);
      if (row.document_type === "outgoing") {
        // Taken from store by this person
        map[code].delivered += q;
      } else {
        // Brought back or delivered to store by this person
        map[code].returned += q;
      }
    });

    return Object.values(map);
  }, [personCardex]);

  // 2. Filtered Detailed Rows for this Person
  const filteredPersonDetailedRows = useMemo(() => {
    if (!personCardex || !personCardex.rows) return [];
    if (personProductFilter === "all") return personCardex.rows;
    return personCardex.rows.filter((r: any) => r.product_code === personProductFilter);
  }, [personCardex, personProductFilter]);

  // Unique transacted products list for dropdown sub-filter
  const uniqueTransactedProducts = useMemo(() => {
    if (!personCardex || !personCardex.rows) return [];
    const list: { code: string; name: string }[] = [];
    const seen = new Set();
    personCardex.rows.forEach((r: any) => {
      if (!seen.has(r.product_code)) {
        seen.add(r.product_code);
        list.push({ code: r.product_code, name: r.product_name });
      }
    });
    return list;
  }, [personCardex]);

  // PRINT: Product Cardex File Template
  const handlePrintProductCardex = () => {
    window.print();
  };

  // EXCEL: Export Product Cardex
  const handleExcelProductCardex = () => {
    if (!productCardex || !productCardex.cardex) return;
    const p = productCardex.product;
    const data = productCardex.cardex.map((row: any, idx: number) => ({
      "ردیف": idx + 1,
      "شناسه سند": formatDocId(row.document_id, settings),
      "تاریخ تراکنش": row.date,
      "نوع تراکنش": row.type === "incoming" ? "ورود به انبار (+)" : "خروج از انبار (-)",
      "طرف حساب مرتبط": row.person_name,
      "نقش": row.person_role === "contractor" ? "پیمانکار / شخص" : "کارفرما / پروژه",
      "مقدار": row.quantity,
      "واحد": p.unit,
      "موجودی متوالی": row.running_balance,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 18 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "کارتکس کالا");
    Xsc: XLSX.writeFile(wb, `cardex-${p.code}-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // EXCEL: Export Person Ledger Statement
  const handleExcelPersonStatement = () => {
    if (!personCardex) return;
    const pe = personCardex.person;
    
    // Check if printing summary or detailed
    let filename = `ledger-person-${pe.name}`;
    let ws;
    if (personTab === "summary") {
      filename += "-overall-summary";
      const data = personSummaryItems.map((item, idx) => ({
        "ردیف": idx + 1,
        "کد کالا": item.product_code,
        "نام کالا": item.product_name,
        "دسته‌بندی": item.product_category,
        "کل دریافتی از انبار (مصرف کالا)": item.delivered,
        "کل عودتی/تحویلی به انبار": item.returned,
        "خالص موازنه دست شخص": item.delivered - item.returned,
        "واحد سنجش": item.product_unit
      }));
      ws = XLSX.utils.json_to_sheet(data);
      ws["!cols"] = [
        { wch: 8 }, { wch: 15 }, { wch: 35 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 12 }
      ];
    } else {
      filename += "-detailed-trans";
      const data = filteredPersonDetailedRows.map((row: any, idx: number) => ({
        "ردیف": idx + 1,
        "شماره سند": formatDocId(row.document_id, settings),
        "تاریخ": row.document_date,
        "نوع تراکنش": row.document_type === "outgoing" ? "تحویل به شخص (خروج)" : "دریافت از شخص (ورود)",
        "کد کالا": row.product_code,
        "کالا": row.product_name,
        "مقدار تراکنش": row.quantity,
        "واحد": row.product_unit,
        "توضیحات": row.document_description ?? ""
      }));
      ws = XLSX.utils.json_to_sheet(data);
      ws["!cols"] = [
        { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 40 }
      ];
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "کارتکس طرف حساب");
    Xsc: XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">کارتکس و گزارشات گردش اقلام</h2>
          <p className="text-stone-500 text-sm mt-1">
            بررسی پرونده‌های موازنه کارگاه، ردگیری جزئیات ورود و خروج هر کالا و گزارش اقلام تحویلی به طرف‌های حساب
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200/40">
          <button
            onClick={() => {
              setActiveTab("product");
              setErrorMsg(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "product" ? "bg-white text-brand-moss shadow-xs font-bold" : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>کارتکس کالا (Stock Ledger)</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab("person");
              setErrorMsg(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "person" ? "bg-white text-brand-moss shadow-xs font-bold" : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <User className="w-4 h-4" />
            <span>کارتکس اشخاص / پروژه‌ها</span>
          </button>
        </div>
      </div>

      {/* ERROR MSG BANNER */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-800 flex items-center gap-2.5 text-sm no-print">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* MAIN DUAL-PANE VIEW CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* ======================================================== */}
        {/* SIDEBAR SELECTOR PANE (Search and Choose Item) */}
        {/* ======================================================== */}
        <div className="lg:col-span-1 bg-white p-4 rounded-2xl shadow-sm border border-stone-200/70 flex flex-col space-y-4 no-print">
          
          {activeTab === "product" ? (
            <>
              {/* Product list header */}
              <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                <Package className="w-4 h-4 text-brand-moss" />
                <span className="text-sm font-bold text-slate-800">کالاهای تعریف شده ({products.length})</span>
              </div>
              
              {/* Search Product info */}
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="جست‌وجوی سریع کد یا کالا..."
                  className="w-full pl-3 pr-9 py-2 bg-stone-50 border border-stone-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-moss text-stone-800"
                />
              </div>

              {/* Scrolling List */}
              <div className="max-h-[500px] overflow-y-auto divide-y divide-stone-100 pr-1 space-y-1">
                {filteredProductsList.length === 0 ? (
                  <div className="py-8 text-center text-stone-400 text-xs">کالایی یافت نشد.</div>
                ) : (
                  filteredProductsList.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProductId(p.id!)}
                      className={`w-full text-right p-2.5 rounded-xl transition-all flex flex-col space-y-1 text-xs cursor-pointer ${
                        selectedProductId === p.id 
                          ? "bg-emerald-50 border-r-4 border-brand-moss text-emerald-950 font-bold" 
                          : "hover:bg-stone-50 text-stone-700"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-mono text-[10px] text-stone-400 font-bold">{p.code}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-stone-100 rounded text-stone-500 font-semibold">{p.category || "عمومی"}</span>
                      </div>
                      <span className="line-clamp-2 leading-relaxed">{p.name}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              {/* Person list header */}
              <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                <User className="w-4 h-4 text-brand-moss" />
                <span className="text-sm font-bold text-slate-800">اشخاص و پروژه‌ها ({persons.length})</span>
              </div>
              
              {/* Search Person info */}
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={personSearch}
                  onChange={(e) => setPersonSearch(e.target.value)}
                  placeholder="جست‌وجوی نام شخص یا شرکت..."
                  className="w-full pl-3 pr-9 py-2 bg-stone-50 border border-stone-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-moss text-stone-800"
                />
              </div>

              {/* Scrolling List */}
              <div className="max-h-[500px] overflow-y-auto divide-y divide-stone-100 pr-1 space-y-1">
                {filteredPersonsList.length === 0 ? (
                  <div className="py-8 text-center text-stone-400 text-xs">طرف حسابی یافت نشد.</div>
                ) : (
                  filteredPersonsList.map(pe => (
                    <button
                      key={pe.id}
                      onClick={() => setSelectedPersonId(pe.id!)}
                      className={`w-full text-right p-2.5 rounded-xl transition-all flex flex-col space-y-1 text-xs cursor-pointer ${
                        selectedPersonId === pe.id 
                          ? "bg-emerald-50 border-r-4 border-brand-moss text-emerald-950 font-bold" 
                          : "hover:bg-stone-50 text-stone-700"
                      }`}
                    >
                      <span className="font-semibold">{pe.name}</span>
                      <span className="text-[10px] text-stone-400">
                        {pe.role === "contractor" ? "کاربر کارگاهی / پیمانکار" : "محل مصرف فرعی / پروژه"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}

        </div>


        {/* ======================================================== */}
        {/* MAIN LEDGER SHEET DISPLAY PANE */}
        {/* ======================================================== */}
        <div className="lg:col-span-3 space-y-6">

          {/* LOADING STATE INDICATOR */}
          {loading && (
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-stone-200/70 flex flex-col items-center justify-center space-y-3 no-print">
              <RefreshCw className="w-8 h-8 text-brand-moss animate-spin" />
              <p className="text-stone-500 text-sm">در حال واکشی اطلاعات و محاسبه مانده‌ی ریزگردش‌های حساب از دیتابیس...</p>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: PRODUCT CARDEX SCREEN */}
          {/* ======================================================== */}
          {!loading && activeTab === "product" && productCardex && (
            <div className="space-y-6">
              
              {/* Top toolbar buttons (print, excel) */}
              <div className="bg-white p-4 rounded-xl border border-stone-200/70 flex flex-wrap justify-end gap-3 no-print text-xs font-semibold">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-stone-500 font-bold">جهت صفحه PDF:</span>
                  <select
                    value={pdfOrientation}
                    onChange={(e) => setPdfOrientation(e.target.value as any)}
                    className="p-1 px-2 border border-stone-200 bg-white rounded cursor-pointer font-sans"
                  >
                    <option value="portrait">عمودی (Portrait)</option>
                    <option value="landscape">افقی (Landscape)</option>
                  </select>
                </div>

                <button
                  onClick={handleExcelProductCardex}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>خروجی فایل اکسل (.xlsx)</span>
                </button>

                <button
                  onClick={() => generateDirectPDF("printable-area-product-cardex", `کارتکس_${productCardex.product.name}`, (active, message) => setPdfProgress({ active, message }), { orientation: pdfOrientation })}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  disabled={pdfProgress.active}
                >
                  {pdfProgress.active ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <FileText className="w-4 h-4 text-emerald-300" />
                  )}
                  <span>دانلود مستقیم PDF</span>
                </button>

                <button
                  onClick={handlePrintProductCardex}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-stone-200 border border-stone-300/60 text-slate-800 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-stone-600" />
                  <span>چاپ با مرورگر</span>
                </button>
              </div>

              {pdfProgress.active && (
                <div className="no-print bg-amber-50 text-amber-800 border-r-4 border-amber-500 p-3 rounded-r-xl text-[11px] font-sans font-bold flex items-center gap-2 mb-4 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  <span>{pdfProgress.message}</span>
                </div>
              )}

              {/* Printable Wrapper Block */}
              <div id="printable-area-product-cardex" className="bg-white p-8 rounded-2xl border border-stone-200/70 shadow-xs space-y-6">
                
                {/* Brand Header */}
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
                        انبار
                      </div>
                    )}
                    <div className="flex flex-col space-y-1 text-right">
                      <span className="font-extrabold text-sm text-slate-900 border-r-4 border-slate-900 pr-2.5">
                        {settings.enterprise_name || "دفتر کارگاه فنی الوان"}
                      </span>
                      <span className="text-[10px] text-stone-500 pr-2.5 font-bold">پروژه: {settings.project_name || "سامانه انبارداری و پیمانکاران"}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center space-y-0.5">
                    <strong className="text-sm font-black text-slate-950">کارتکس حساب فیزیکی کالا (دفتر انبار کارگاه)</strong>
                    <span className="text-[9px] bg-neutral-100 px-3 py-0.5 rounded-full font-bold">
                      ریزگردش تفصیلی رویدادهای ورود و خروج کالا
                    </span>
                  </div>

                  <div className="text-left font-mono text-[9px] text-stone-500 space-y-0.5">
                    <div>تاریخ خروجی: {new Date().toLocaleDateString("fa-IR")}</div>
                    <div>وضعیت گزارش: ممانعت کارکرد کالا</div>
                  </div>
                </div>

                {/* Sub Metadata Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200/50 text-xs">
                  <div>
                    <span className="font-bold text-stone-500 block">مشخصات و نام کالا :</span>
                    <strong className="text-slate-900">{productCardex.product.name}</strong>
                  </div>
                  <div>
                    <span className="font-bold text-stone-500 block">کد کالا کلاسیفاید :</span>
                    <strong className="text-slate-900 font-mono">{productCardex.product.code}</strong>
                  </div>
                  <div>
                    <span className="font-bold text-stone-500 block">واحد سنجش / مقیاس :</span>
                    <strong className="text-slate-900">{productCardex.product.unit}</strong>
                  </div>
                  <div>
                    <span className="font-bold text-stone-500 block">حد سفارش بحرانی :</span>
                    <strong className="text-rose-700 font-mono">{productCardex.product.min_stock || "تکمیل نشده"}</strong>
                  </div>
                </div>

              {/* Screen Info card / Summary stats */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 no-print">
                {/* 1. Name card */}
                <div className="bg-brand-forest text-white p-5 rounded-2xl shadow-sm sm:col-span-2">
                  <span className="text-[10px] font-bold text-stone-300 uppercase block font-mono">شرح مشخصات کالا</span>
                  <h3 className="text-lg font-bold mt-1 line-clamp-1">{productCardex.product.name}</h3>
                  <div className="flex items-center gap-3 mt-2 text-xs text-stone-200 font-mono">
                    <span className="bg-brand-sage px-2 py-0.5 rounded text-[11px] font-bold">کد: {productCardex.product.code}</span>
                    <span>واحد: {productCardex.product.unit}</span>
                    <span>گروه: {productCardex.product.category || "عمومی"}</span>
                  </div>
                </div>

                {/* 2. Overally inputs */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200/70">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-400">کل ورودی (وارده)</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600 bg-emerald-50 p-0.5 rounded-full" />
                  </div>
                  <div className="mt-2">
                    <span className="text-xl font-mono font-bold text-emerald-800">
                      {productSummaryStats.incoming.toLocaleString("fa-IR")}
                    </span>
                    <span className="text-[11px] text-stone-500 mr-1">{productCardex.product.unit}</span>
                  </div>
                </div>

                {/* 3. Overally outputs */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200/70">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-400">کل خروجی (صادره)</span>
                    <TrendingDown className="w-4 h-4 text-red-600 bg-rose-50 p-0.5 rounded-full" />
                  </div>
                  <div className="mt-2">
                    <span className="text-xl font-mono font-bold text-amber-700">
                      {productSummaryStats.outgoing.toLocaleString("fa-IR")}
                    </span>
                    <span className="text-[11px] text-stone-500 mr-1">{productCardex.product.unit}</span>
                  </div>
                </div>
              </div>

              {/* Stock health indicator in sidebar row */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200/70 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-stone-400">موجودی موازنه لحظه‌ای فعلی</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-mono font-black text-slate-800">
                      {productSummaryStats.current.toLocaleString("fa-IR")}
                    </span>
                    <span className="text-sm text-stone-500 font-bold">{productCardex.product.unit}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full sm:w-auto text-left justify-end">
                  {/* Alert level */}
                  {productSummaryStats.current <= 0 ? (
                    <span className="px-3 py-1.5 text-xs font-black bg-rose-50 text-rose-800 border border-rose-200 rounded-xl inline-flex items-center gap-1.5 self-start sm:self-end">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>اتمام کامل موجودی کالا (بحرانی)</span>
                    </span>
                  ) : productSummaryStats.current <= (productCardex.product.min_stock ?? 0) ? (
                    <span className="px-3 py-1.5 text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 rounded-xl inline-flex items-center gap-1.5 self-start sm:self-end">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>رسیدن به حد سفارش کالا ({productCardex.product.min_stock ?? 0})</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl inline-flex items-center gap-1.5 self-start sm:self-end">
                      <span>موجودی ایمن است (حد سفارش: {productCardex.product.min_stock ?? 0})</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Ledger Cardex chronological Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-stone-200/70 overflow-hidden">
                <div className="p-5 border-b border-stone-100 no-print">
                  <h3 className="text-md font-bold text-slate-800">ریزگردش رویدادهای انبار (روزنما)</h3>
                </div>

                <div className="overflow-x-auto">
                  {productCardex.cardex.length === 0 ? (
                    <div className="py-16 text-center text-stone-400">
                      <Calendar className="w-12 h-12 mx-auto stroke-[1.5] mb-2 text-stone-300" />
                      <p className="text-sm font-semibold">هیچ حوالۀ ورود یا خروجی هنوز برای این کالا صادر نگردیده است.</p>
                      <p className="text-xs text-stone-400 mt-1">با ثبت اولین سند انبار، موازنه این جدول از روز اول ایجاد می‌گردد.</p>
                    </div>
                  ) : (
                    <table className="w-full text-right border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-[#fcfafa] border-b border-stone-200 text-stone-550 font-bold text-[11px] uppercase tracking-wider">
                          <th className="py-3 px-4 w-12 text-center">ردیف</th>
                          <th className="py-3 px-4 w-28 text-center">شماره سند</th>
                          <th className="py-3 px-4 w-28 text-center">تاریخ</th>
                          <th className="py-3 px-4 w-32 border-l border-r border-stone-100 text-center">نوع سند</th>
                          <th className="py-3 px-4">طرف حساب مرتبط</th>
                          <th className="py-3 px-4 w-24 text-center font-bold text-emerald-850 bg-emerald-50/20">مقدار وارده (+)</th>
                          <th className="py-3 px-4 w-24 text-center font-bold text-rose-800 bg-rose-50/20">مقدار صادره (-)</th>
                          <th className="py-3 px-4 w-28 text-center border-r border-stone-100 font-bold text-slate-800 bg-stone-50/50">موجودی کارگاه (مانده)</th>
                          <th className="py-3 px-4 max-w-xs truncate no-print">توضیحات فرعی حواله</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-stone-850">
                        {productCardex.cardex.map((row: any, idx: number) => {
                          return (
                            <tr key={idx} className="hover:bg-stone-50/40 transition-colors">
                              <td className="py-3.5 px-4 text-center text-stone-400 font-mono text-xs">{idx + 1}</td>
                              <td className="py-3.5 px-4 text-center font-mono font-bold text-stone-600">
                                {formatDocId(row.document_id, settings)}
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-stone-500">{row.date}</td>
                              
                              {/* Document Type badge */}
                              <td className="py-3.5 px-4 text-center border-l border-r border-stone-100/50">
                                {row.type === "incoming" ? (
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-bold text-[10px]">
                                    ورود به انبار
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-rose-50 text-rose-800 rounded font-bold text-[10px]">
                                    خروج از انبار
                                  </span>
                                )}
                              </td>

                              {/* Person */}
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-stone-800">{row.person_name}</div>
                                <div className="text-[10px] text-stone-400">
                                  {row.person_role === "contractor" ? "پیمانکار شخص" : "انبار مصرف فرعی"}
                                </div>
                              </td>

                              {/* Quantities */}
                              <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-800 bg-emerald-50/10">
                                {row.type === "incoming" ? row.quantity.toLocaleString("fa-IR") : "-"}
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono font-bold text-[#c2410c] bg-rose-50/10">
                                {row.type === "outgoing" ? row.quantity.toLocaleString("fa-IR") : "-"}
                              </td>

                              {/* Running Balance */}
                              <td className="py-3.5 px-4 text-center font-mono font-black text-xs text-slate-800 bg-stone-50/30 border-r border-stone-150/40">
                                <span className={row.running_balance < 0 ? "text-rose-700" : ""}>
                                  {row.running_balance.toLocaleString("fa-IR")}
                                </span>
                              </td>

                              {/* Description */}
                              <td className="py-3.5 px-4 text-stone-500 text-xs max-w-xs truncate no-print" title={row.document_description}>
                                {row.document_description || "---"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
                
                {/* Print bottom sign space */}
                <div className="hidden print:flex justify-between mt-12 px-8 text-xs font-bold text-stone-800 font-mono">
                  <span>امضاء انباردار کارگاه: .......................</span>
                  <span>امضاء تحویل‌دهنده: .......................</span>
                  <span>امضاء سرپرست کارگاه: .......................</span>
                </div>
              </div>

              </div>

            </div>
          )}


          {/* ======================================================== */}
          {/* TAB 2: PERSON CARDEX SCREEN */}
          {/* ======================================================== */}
          {!loading && activeTab === "person" && personCardex && (
            <div className="space-y-6">
              
              {/* Toolbar */}
              <div className="bg-white p-4 rounded-xl border border-stone-200/70 flex flex-wrap justify-end gap-3 no-print text-xs font-semibold">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-stone-500 font-bold">جهت صفحه PDF:</span>
                  <select
                    value={pdfOrientation}
                    onChange={(e) => setPdfOrientation(e.target.value as any)}
                    className="p-1 px-2 border border-stone-200 bg-white rounded cursor-pointer font-sans"
                  >
                    <option value="portrait">عمودی (Portrait)</option>
                    <option value="landscape">افقی (Landscape)</option>
                  </select>
                </div>

                <button
                  onClick={handleExcelPersonStatement}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>خروجی فایل اکسل (.xlsx)</span>
                </button>

                <button
                  onClick={() => generateDirectPDF("printable-area-person-cardex", `گزارش_اقلام_تحویلی_${personCardex.person.name}`, (active, message) => setPdfProgress({ active, message }), { orientation: pdfOrientation })}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  disabled={pdfProgress.active}
                >
                  {pdfProgress.active ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <FileText className="w-4 h-4 text-emerald-300" />
                  )}
                  <span>دانلود مستقیم PDF</span>
                </button>

                <button
                  onClick={handlePrintProductCardex}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-stone-200 border border-stone-300/60 text-slate-800 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-stone-600" />
                  <span>چاپ با مرورگر</span>
                </button>
              </div>

              {pdfProgress.active && (
                <div className="no-print bg-amber-50 text-amber-800 border-r-4 border-amber-500 p-3 rounded-r-xl text-[11px] font-sans font-bold flex items-center gap-2 mb-4 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  <span>{pdfProgress.message}</span>
                </div>
              )}

              {/* Printable Wrapper Block */}
              <div id="printable-area-person-cardex" className="bg-white p-8 rounded-2xl border border-stone-200/70 shadow-xs space-y-6">

                {/* Brand Header */}
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
                        انبار
                      </div>
                    )}
                    <div className="flex flex-col space-y-1 text-right">
                      <span className="font-extrabold text-sm text-slate-900 border-r-4 border-slate-900 pr-2.5">
                        {settings.enterprise_name || "دفتر کارگاه فنی الوان"}
                      </span>
                      <span className="text-[10px] text-stone-500 pr-2.5 font-bold">پروژه: {settings.project_name || "سامانه انبارداری و پیمانکاران"}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center space-y-0.5">
                    <strong className="text-sm font-black text-slate-950">صورت‌حساب اقلام تحویلی و دریافتی اشخاص</strong>
                    <span className="text-[9px] bg-neutral-100 px-3 py-0.5 rounded-full font-bold">
                      روکش تفصیلی تراکنش‌های کالایی شخص با انبارداری مرکزی
                    </span>
                  </div>

                  <div className="text-left font-mono text-[9px] text-stone-500 space-y-0.5">
                    <div>تاریخ خروجی: {new Date().toLocaleDateString("fa-IR")}</div>
                    <div>وضعیت گزارش: مانه حساب فیزیکی</div>
                  </div>
                </div>

                {/* Sub Metadata Row */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200/50 text-xs">
                  <div>
                    <span className="font-bold text-stone-500 block">نام کامل شخص/شرکت طرف‌حساب :</span>
                    <strong className="text-slate-900">{personCardex.person.name}</strong>
                  </div>
                  <div>
                    <span className="font-bold text-stone-500 block">سمت و رسته فنی در کارگاه :</span>
                    <strong className="text-slate-900">{personCardex.person.role === "contractor" ? "پیمانکار کارگاهی جزء" : "انبار فرعی / بخش مصرفی"}</strong>
                  </div>
                  <div>
                    <span className="font-bold text-stone-500 block">تلفن تماس :</span>
                    <strong className="text-slate-900 font-mono">{personCardex.person.phone || "---"}</strong>
                  </div>
                </div>

              {/* Profile details */}
              <div className="bg-brand-forest text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-stone-300 uppercase block font-mono">پروفایل طرف حساب</span>
                  <h3 className="text-xl font-bold">{personCardex.person.name}</h3>
                  <span className="text-xs text-stone-300 block">
                    {personCardex.person.role === "contractor" 
                      ? "پیمانکار، آرماتوربند، اکیپ‌های اجرایی کارگاه" 
                      : "بخش فرعی کارگاه / مرکز هزینه پروژه تخصیصی"}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 bg-brand-sage px-4 py-2.5 rounded-xl border border-brand-sage/50 text-xs">
                  <Info className="w-4 h-4 text-emerald-450" />
                  <span>تعداد کل ردیف تراکنشات ثبت شده: <strong className="font-mono text-emerald-300 font-black text-sm bg-brand-forest px-2 py-0.5 rounded mr-1">{personCardex.rows.length}</strong></span>
                </div>
              </div>

              {/* Sub-Tabs for Person Ledger: Table of item balances vs detailed logs */}
              <div className="flex border-b border-stone-200/50 no-print">
                <button
                  onClick={() => setPersonTab("summary")}
                  className={`px-4 py-2.5 text-sm font-bold transition-all border-b-2 cursor-pointer ${
                    personTab === "summary" 
                      ? "border-brand-moss text-brand-moss" 
                      : "border-transparent text-stone-500 hover:text-stone-800"
                  }`}
                >
                  ۱. لیست کلی اقلام تحویلی (مانده هر قلم کالا نزد شخص)
                </button>
                <button
                  onClick={() => setPersonTab("detailed")}
                  className={`px-4 py-2.5 text-sm font-bold transition-all border-b-2 cursor-pointer ${
                    personTab === "detailed" 
                      ? "border-brand-moss text-brand-moss" 
                      : "border-transparent text-stone-500 hover:text-stone-800"
                  }`}
                >
                  ۲. ریز سوابق گردش کالاها (حواله به حواله)
                </button>
              </div>

              {/* PANE VIEW 1: SUMMARY ITEMS AT PERSON'S HAND */}
              {personTab === "summary" && (
                <div className="bg-white rounded-2xl shadow-sm border border-stone-200/70 overflow-hidden">
                  <div className="p-5 border-b border-stone-100 no-print">
                    <h4 className="text-sm font-bold text-slate-800">وضعیت کثر/اضاف موازنه مادی کالاها نزد {personCardex.person.name}</h4>
                  </div>

                  <div className="overflow-x-auto">
                    {personSummaryItems.length === 0 ? (
                      <div className="py-16 text-center text-stone-400">
                        <Package className="w-12 h-12 mx-auto stroke-[1.5] mb-2 text-stone-300" />
                        <p className="text-sm font-semibold">هیچ موازنه کالایی با این شخص صورت نپذیرفته است.</p>
                      </div>
                    ) : (
                      <table className="w-full text-right border-collapse text-xs sm:text-sm">
                        <thead>
                          <tr className="bg-[#fcfafa] border-b border-stone-200 text-stone-550 font-bold text-[11px] uppercase tracking-wider">
                            <th className="py-3 px-4 w-12 text-center">ردیف</th>
                            <th className="py-3 px-4 w-28 text-center border-l">کد کالا</th>
                            <th className="py-3 px-4">نام و عنوان کالا</th>
                            <th className="py-3 px-4 text-center border-r">دسته‌بندی موضوعی</th>
                            <th className="py-3 px-4 w-32 text-center bg-rose-50/10 text-rose-900 border-r">دریافت از انبار (تحویل به شخص)</th>
                            <th className="py-3 px-4 w-32 text-center bg-emerald-50/10 text-emerald-950 border-r">بازگشت به انبار (آورده شخص)</th>
                            <th className="py-3 px-4 w-32 text-center bg-amber-50/20 font-black text-stone-900 border-r">مانده نزد شخص (خالص مصرف)</th>
                            <th className="py-3 px-4 w-24 text-center border-r font-bold text-stone-500">واحد</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 text-stone-850">
                          {personSummaryItems.map((item, idx) => {
                            const net = item.delivered - item.returned;
                            return (
                              <tr key={idx} className="hover:bg-stone-50/40 transition-colors">
                                <td className="py-3.5 px-4 text-center text-stone-400 font-mono text-xs">{idx + 1}</td>
                                <td className="py-3.5 px-4 text-center font-mono font-bold text-stone-500 border-l bg-stone-50/20">{item.product_code}</td>
                                <td className="py-3.5 px-4 font-semibold text-stone-800">{item.product_name}</td>
                                <td className="py-3.5 px-4 text-center border-r">
                                  <span className="px-2 py-0.5 bg-stone-100 rounded text-[10px] text-stone-600 font-semibold">{item.product_category}</span>
                                </td>
                                
                                <td className="py-3.5 px-4 text-center font-mono font-bold text-[#c2410c] bg-rose-50/10 border-r">{item.delivered.toLocaleString("fa-IR")}</td>
                                <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-800 bg-emerald-50/10 border-r">{item.returned.toLocaleString("fa-IR")}</td>
                                
                                <td className="py-3.5 px-4 text-center font-mono font-black bg-amber-50/20 border-r text-stone-800">
                                  <span className={net > 0 ? "text-[#c2410c]" : net < 0 ? "text-emerald-700" : "text-stone-400"}>
                                    {net.toLocaleString("fa-IR")}
                                  </span>
                                </td>
                                
                                <td className="py-3.5 px-4 text-center border-r text-stone-500 font-bold text-xs">{item.product_unit}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                  
                  {/* Print bottom sign space */}
                  <div className="hidden print:flex justify-between mt-12 px-8 text-xs font-bold text-stone-800 font-mono">
                    <span>امضاء انباردار کارگاه: .......................</span>
                    <span>امضاء {personCardex.person.name}: .......................</span>
                    <span>تایید بخش امور پیمانکاران: .......................</span>
                  </div>
                </div>
              )}

              {/* PANE VIEW 2: DETAILED LAUNCHED SLABS */}
              {personTab === "detailed" && (
                <div className="space-y-4">
                  {/* Sub-Filter to meet user's requirement: "ارماتور برای فلان شخص به چه صورت بوده" */}
                  <div className="bg-white p-4 rounded-2xl border border-stone-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full no-print">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-brand-moss" />
                      <span className="text-xs font-bold text-stone-550">فیلتر کردن ریزگردش ها بر اساس یک کالای خاص:</span>
                    </div>

                    <select
                      value={personProductFilter}
                      onChange={(e) => setPersonProductFilter(e.target.value)}
                      className="px-3 py-2 bg-stone-50 border border-stone-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-moss text-stone-850 cursor-pointer min-w-[200px]"
                    >
                      <option value="all">همه اقلام گردش یافته</option>
                      {uniqueTransactedProducts.map(p => (
                        <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* detailed database result */}
                  <div className="bg-white rounded-2xl shadow-sm border border-stone-200/70 overflow-hidden">
                    <div className="p-4 bg-stone-50/50 border-b border-stone-100 flex justify-between items-center no-print">
                      <span className="text-xs font-bold text-stone-500">سوابق گردش کالاکارتهای فیزیکی تحویل شده</span>
                      <span className="text-xs px-2.5 py-1 bg-white border border-stone-200 text-stone-600 rounded-full font-bold">
                        {filteredPersonDetailedRows.length} ردیف تراکنش یافت شد
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      {filteredPersonDetailedRows.length === 0 ? (
                        <div className="py-16 text-center text-stone-400">
                          <Calendar className="w-12 h-12 mx-auto stroke-[1.5] mb-2 text-stone-300" />
                          <p className="text-sm font-semibold">هیچ رویدادی با فیلتر انتخاب شده یافت نگردید.</p>
                        </div>
                      ) : (
                        <table className="w-full text-right border-collapse text-xs sm:text-sm">
                          <thead>
                            <tr className="bg-[#fcfafa] border-b border-stone-200 text-stone-550 font-bold text-[11px] uppercase tracking-wider">
                              <th className="py-3 px-4 w-12 text-center">ردیف</th>
                              <th className="py-3 px-4 w-28 text-center">شماره سند</th>
                              <th className="py-3 px-4 w-28 text-center">تاریخ</th>
                              <th className="py-3 px-4 w-40 text-center border-l border-r">نوع حواله</th>
                              <th className="py-3 px-4 border-r">کد و عنوان کالا</th>
                              <th className="py-3 px-4 w-28 text-center bg-amber-50/10 font-bold border-r">مقدار تراکنش</th>
                              <th className="py-3 px-4 w-20 text-center border-r text-stone-500">واحد</th>
                              <th className="py-3 px-4 max-w-xs truncate no-print">شرح فرعی حواله</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 text-stone-850">
                            {filteredPersonDetailedRows.map((row: any, idx: number) => {
                              return (
                                <tr key={idx} className="hover:bg-stone-50/40 transition-colors">
                                  <td className="py-3.5 px-4 text-center text-stone-400 font-mono text-xs">{idx + 1}</td>
                                  <td className="py-3.5 px-4 text-center font-mono font-bold text-stone-600">
                                    {formatDocId(row.document_id, settings)}
                                  </td>
                                  <td className="py-3.5 px-4 text-center font-mono text-stone-500">{row.document_date}</td>
                                  
                                  {/* in / out */}
                                  <td className="py-3.5 px-4 text-center border-l border-r font-bold text-[10px]">
                                    {row.document_type === "outgoing" ? (
                                      <span className="px-2 py-0.5 bg-rose-50 text-rose-800 rounded border border-rose-200/50">
                                        تحویل به شخص (خروج از انبار)
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-250/30">
                                        دریافت از شخص (ورود به انبار)
                                      </span>
                                    )}
                                  </td>

                                  {/* product */}
                                  <td className="py-3.5 px-4 border-r">
                                    <div className="font-mono text-[10px] text-stone-400 font-bold">{row.product_code}</div>
                                    <div className="font-semibold text-stone-850">{row.product_name}</div>
                                  </td>

                                  {/* quantity */}
                                  <td className="py-3.5 px-4 text-center font-mono font-extrabold text-stone-800 bg-amber-50/10 border-r">
                                    {row.quantity.toLocaleString("fa-IR")}
                                  </td>

                                  {/* unit */}
                                  <td className="py-3.5 px-4 text-center border-r text-stone-500 font-semibold">{row.product_unit}</td>

                                  {/* desc */}
                                  <td className="py-3.5 px-4 text-stone-400 text-xs max-w-xs truncate no-print" title={row.document_description}>
                                    {row.document_description || "---"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}

              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
