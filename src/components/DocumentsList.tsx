import React, { useState, useMemo } from "react";
import { DocumentHeader } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Printer, 
  Trash2, 
  FileSpreadsheet, 
  Layers, 
  Calendar,
  AlertTriangle,
  X
} from "lucide-react";
import * as XLSX from "xlsx";

interface DocumentsListProps {
  documents: DocumentHeader[];
  settings: Record<string, string>;
  onViewDocument: (id: number) => void;
  onDeleteDocument: (id: number) => void;
}

function formatDocId(id: number | string, settings: Record<string, string>) {
  const prefix = settings?.doc_prefix ?? "";
  const startNo = parseInt(settings?.doc_start_no ?? "1", 10);
  const offsetId = (Number(id) - 1) + (isNaN(startNo) ? 1 : startNo);
  return `${prefix}${String(offsetId).padStart(5, "0")}`;
}

export default function DocumentsList({ documents, settings, onViewDocument, onDeleteDocument }: DocumentsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "incoming" | "outgoing">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredDocs = useMemo(() => {
    return documents.filter(d => {
      const serialStr = formatDocId(d.id!, settings);
      
      const matchesSearch = 
        serialStr.includes(searchTerm) || 
        (d.person_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.description ?? "").toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.date.includes(searchTerm);

      const matchesType = 
        typeFilter === "all" || d.type === typeFilter;

      const matchesDateRange = 
        (!startDate || d.date >= startDate) && 
        (!endDate || d.date <= endDate);

      return matchesSearch && matchesType && matchesDateRange;
    });
  }, [documents, searchTerm, typeFilter, startDate, endDate, settings]);

  // Export all filtered docs history to Excel
  const handleExportHistoryExcel = () => {
    const data = filteredDocs.map((d, index) => ({
      "ردیف": index + 1,
      "شماره سریال سند": formatDocId(d.id!, settings),
      "نوع سند": d.type === "incoming" ? "سند ورود کالا (+)" : "سند خروج کالا (-)",
      "تاریخ ثبت": d.date,
      "طرف حساب مرتبط": d.person_name ?? "نامشخص",
      "نقش طرف حساب": d.person_role ?? "نامشخص",
      "تعداد ردیف کالا": d.item_count ?? 0,
      "مجموع کل اقلام": d.total_quantity ?? 0,
      "توضیح حواله": d.description
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    
    // Auto-fit columns
    ws["!cols"] = [
      { wch: 8 },  // ردیف
      { wch: 15 }, // سریال
      { wch: 18 }, // نوع
      { wch: 12 }, // تاریخ
      { wch: 30 }, // طرف حساب
      { wch: 15 }, // نقش
      { wch: 14 }, // تعداد ردیف
      { wch: 14 }, // مجموع
      { wch: 45 }  // توضیحات
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "سوابق اسناد انبار");
    Xsc: XLSX.writeFile(wb, `inventory-documents-history-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">تاریخچه و آرشیو اسناد صادرشده</h2>
          <p className="text-slate-500 text-sm mt-1">امکان مرور کامل پرونده تراکنشات ورود و خروج، صدور برگه A4 چاپی و لغو اسناد غیر صحیح</p>
        </div>

        <button
          onClick={handleExportHistoryExcel}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-[#15803d] hover:bg-emerald-800 transition-colors text-white text-sm font-semibold rounded-xl shadow-xs cursor-pointer"
        >
          <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
          <span>دانلود لیست اسناد (.xlsx)</span>
        </button>
      </div>

      {/* Main Grid Card file */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/70 overflow-hidden">
        {/* Filters Toolbar */}
        <div className="p-6 border-b border-stone-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-800">برگه‌های آرشیو انبارداری</h3>
            <span className="px-2.5 py-1 text-xs font-semibold bg-stone-100 text-stone-600 rounded-full">
              {filteredDocs.length} سند ثبت‌شده
            </span>
          </div>

          <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-3">
            {/* Search filter input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="جست‌وجوی سریال، نام طرف حساب یا توضیحات..."
                className="w-full pl-3 pr-10 py-2.5 bg-[#fcfbfa] border border-stone-200 placeholder-stone-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-[#15803d] focus:bg-white text-stone-900 font-medium"
              />
            </div>

            {/* Date Range Filters */}
            <div className="flex items-center gap-1 border border-stone-200 rounded-xl px-3 py-1 bg-[#fcfbfa] text-xs">
              <span className="text-stone-400 font-medium select-none">از تاریخ:</span>
              <input
                type="text"
                placeholder="۱۴۰۵/۰۱/۰۱"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-20 text-center bg-transparent border-none focus:outline-none text-stone-800 font-mono p-1"
              />
              <span className="text-stone-300 select-none">|</span>
              <span className="text-stone-400 font-medium select-none">تا تاریخ:</span>
              <input
                type="text"
                placeholder="۱۴۰۵/۱۲/۲۹"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-20 text-center bg-transparent border-none focus:outline-none text-stone-800 font-mono p-1"
              />
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => { setStartDate(""); setEndDate(""); }}
                  className="p-1 mr-1 text-stone-400 hover:text-rose-600 transition-colors"
                  title="پاک کردن فیلتر تاریخ"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Type Filter Select */}
            <select
              value={typeFilter}
              onChange={(e: any) => setTypeFilter(e.target.value)}
              className="px-3 py-2.5 bg-[#fcfbfa] border border-stone-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-[#15803d] text-stone-700 font-semibold cursor-pointer"
            >
              <option value="all">همه اسناد (ورود و خروج)</option>
              <option value="incoming">اسناد ورود کالا (+)</option>
              <option value="outgoing">اسناد خروج کالا (-)</option>
            </select>
          </div>
        </div>

        {/* List of Documents Table */}
        <div className="overflow-x-auto">
          {filteredDocs.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-semibold text-xs pb-10">
              <FileText className="w-12 h-12 mx-auto mb-2 text-stone-300 stroke-[1.5]" />
              <h4 className="font-bold text-stone-600">سند منطبق یافت نگردید!</h4>
              <p className="text-[11px] text-stone-400 mt-1">هنوز سندی از این دسته‌بندی در انبار صادر نگردیده یا با فیلتر شما هماهنگ نیست.</p>
            </div>
          ) : (
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="bg-[#fcfafa] border-b border-stone-200 text-stone-550 font-bold text-xs uppercase tracking-wider">
                  <th className="py-4 px-6 w-14">ردیف</th>
                  <th className="py-4 px-6 w-32 text-center border-l border-stone-100">سریال سند</th>
                  <th className="py-4 px-6 w-28 text-center">تاریخ ثبتی</th>
                  <th className="py-4 px-6 w-32 text-center border-l border-r border-stone-100">نوع حواله</th>
                  <th className="py-4 px-6">تحویل‌ دهنده / تحویل‌ گیرنده کالا</th>
                  <th className="py-4 px-6 w-28 text-center">تنوع اقلام</th>
                  <th className="py-4 px-6 w-36 text-center border-r border-stone-100">جمع کل حواله</th>
                  <th className="py-4 px-6 w-36 text-left">اقدامات ثبتی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-750">
                {filteredDocs.map((doc, index) => {
                  const serialStr = formatDocId(doc.id!, settings);
                  
                  return (
                    <motion.tr
                      key={doc.id}
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-stone-50/60 transition-colors group"
                    >
                      <td className="py-4 px-6 text-stone-400 text-xs font-mono">{index + 1}</td>
                      
                      <td className="py-4 px-6 text-center font-mono font-bold text-stone-600 bg-stone-50/40 group-hover:bg-transparent rounded-lg border-l border-stone-100/40">
                        {serialStr}
                      </td>

                      <td className="py-4 px-6 text-center font-mono font-semibold text-stone-550">
                        <div className="flex items-center justify-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>{doc.date}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center border-l border-r border-stone-100/40">
                        {doc.type === "incoming" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-[#15502c] bg-[#eefcf2] rounded-full border border-emerald-200/50">
                            <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                            <span>ورود (+)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-[#911d1d] bg-[#fdf2f2] rounded-full border border-red-200/50">
                            <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" />
                            <span>خروج (-)</span>
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-bold text-stone-850">{doc.person_name}</div>
                        {doc.description && (
                          <div className="text-[11px] text-stone-400 mt-0.5 max-w-sm truncate" title={doc.description}>
                            توضیحات: {doc.description}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6 text-center font-bold text-stone-550">
                        {doc.item_count} قلم کالا
                      </td>

                      <td className="py-4 px-6 text-center font-black font-mono text-stone-800 border-r border-stone-100/40">
                        {(doc.total_quantity ?? 0).toLocaleString("fa-IR")}
                      </td>

                      <td className="py-4 px-6 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Print Actions Button */}
                          <button
                            onClick={() => onViewDocument(doc.id!)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            title="مشاهده نسخه چاپی A4"
                          >
                            <Printer className="w-3.5 h-3.5 text-stone-500" />
                            <span>مشاهده و چاپ</span>
                          </button>

                          {/* Delete Document Button */}
                          <button
                            onClick={() => onDeleteDocument(doc.id!)}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="حذف کامل سند"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Warnings notice */}
        <div className="bg-amber-50/40 px-6 py-4 border-t border-stone-100 text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
          <span>هنگام حدف هر برگه حواله از دیتابیس، موازنه این اقلام در روکش انبار بلافاصله متناظر می‌گردد. اسناد حذف شده به هیچ عنوان قابل بازیابی یا خنثی‌سازی نیستند.</span>
        </div>
      </div>
    </div>
  );
}
