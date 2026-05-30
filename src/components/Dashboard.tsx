import React, { useState, useMemo } from "react";
import { Product } from "../types";
import { motion } from "motion/react";
import { 
  Package, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileSpreadsheet, 
  AlertTriangle, 
  Layers, 
  TrendingUp, 
  TrendingDown,
  Info,
  FileText,
  Plus,
  Minus
} from "lucide-react";
import * as XLSX from "xlsx";

interface DashboardProps {
  products: Product[];
  onCreateDocument: (type: "incoming" | "outgoing", preselectedProductId?: number) => void;
  onNavigateToCardex: (productId: number) => void;
  onNavigateToProducts: () => void;
}

export default function Dashboard({ products, onCreateDocument, onNavigateToCardex, onNavigateToProducts }: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.code.toLowerCase().includes(searchTerm.toLowerCase());
      
      const inventory = p.current_inventory ?? 0;
      if (stockFilter === "in_stock") return matchesSearch && inventory > 0;
      if (stockFilter === "low_stock") return matchesSearch && inventory > 0 && inventory <= 5;
      if (stockFilter === "out_of_stock") return matchesSearch && inventory <= 0;
      return matchesSearch;
    });
  }, [products, searchTerm, stockFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalToxicityCount = products.length; // Variety of products
    let totalItemsStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach(p => {
      const qty = p.current_inventory ?? 0;
      totalItemsStock += qty;
      if (qty <= 0) {
        outOfStockCount++;
      } else if (qty <= 5) {
        lowStockCount++;
      }
    });

    return {
      totalToxicityCount,
      totalItemsStock,
      lowStockCount,
      outOfStockCount
    };
  }, [products]);

  // Excel Export
  const handleExportExcel = () => {
    const data = filteredProducts.map((p, idx) => ({
      "ردیف": idx + 1,
      "کد کالا": p.code,
      "نام کالا": p.name,
      "واحد سنجش": p.unit,
      "موجودی لحظه‌ای": p.current_inventory ?? 0
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    
    // Set column widths and RTL properties
    ws["!cols"] = [
      { wch: 8 },  // ردیف
      { wch: 15 }, // کد کالا
      { wch: 45 }, // نام کالا
      { wch: 15 }, // واحد سنجش
      { wch: 18 }  // موجودی لحظه‌ای
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "روکش موجودی انبار");
    Xsc: XLSX.writeFile(wb, `inventory-stock-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Welcome and Action buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-stone-200/70">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">پیشخوان و وضعیت موجودی لحظه‌ای</h2>
          <p className="text-slate-500 text-sm mt-1">مدیریت فیزیکی، ثبت حواله‌های ورود و خروج کالا با موازنه لحظه‌ای موجودی انبار</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick Incoming Button */}
          <button
            id="btn-incoming-doc"
            onClick={() => onCreateDocument("incoming")}
            className="flex items-center gap-2 px-5 py-3 bg-[#15803d] hover:bg-emerald-800 transition-colors text-white font-semibold rounded-xl shadow-md cursor-pointer text-sm"
          >
            <ArrowUpRight className="w-5 h-5" />
            <span>ثبت سند ورود کالا (+)</span>
          </button>
          
          {/* Quick Outgoing Button */}
          <button
            id="btn-outgoing-doc"
            onClick={() => onCreateDocument("outgoing")}
            className="flex items-center gap-2 px-5 py-3 bg-[#c2410c] hover:bg-red-800 transition-colors text-white font-semibold rounded-xl shadow-md cursor-pointer text-sm"
          >
            <ArrowDownLeft className="w-5 h-5" />
            <span>ثبت سند خروج کالا (-)</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div id="stat-variety" className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200/70 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-stone-400 block">تنوع اقلام کالا</span>
            <span className="text-2xl font-bold text-stone-800">{stats.totalToxicityCount}</span>
            <span className="text-xs text-stone-500 block">قلم کالا تعریف شده</span>
          </div>
          <div className="p-3 bg-[#e8f2ec] text-[#2d4a38] rounded-xl border border-[#d1e7dd]/60">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3 */}
        <div id="stat-low-stock" className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200/70 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-stone-400 block">کالاهای رو به اتمام (کمتر از ۵)</span>
            <span className="text-2xl font-bold text-amber-700">{stats.lowStockCount}</span>
            <span className="text-xs text-amber-600 block font-semibold">نیازمند شارژ مجدد</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-100/60">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4 */}
        <div id="stat-out-stock" className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200/70 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-stone-400 block">کالاهای با موجودی صفر</span>
            <span className="text-2xl font-bold text-rose-700">{stats.outOfStockCount}</span>
            <span className="text-xs text-rose-500 block font-semibold">موجودی کسر موازنه کامل</span>
          </div>
          <div className="p-3 bg-rose-550 text-white rounded-xl border border-rose-100/10">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Stock Inventory Sheet Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/70 overflow-hidden">
        {/* Table Filters & Toolbar */}
        <div className="p-6 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-800">برگه روکش موجودی کارگاه</h3>
            <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
              {filteredProducts.length} قلم کالا یافت شد
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="جست‌وجوی کد یا نام کالا..."
                className="w-full pl-3 pr-10 py-2 bg-[#fcfbfa] border border-stone-200 placeholder-stone-400 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#15803d] focus:bg-white text-stone-900"
              />
            </div>

            {/* Filter Dropdown */}
            <select
              value={stockFilter}
              onChange={(e: any) => setStockFilter(e.target.value)}
              className="px-3 py-2 bg-[#fcfbfa] border border-stone-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#15803d] text-stone-800 cursor-pointer"
            >
              <option value="all">همه گروه بندی ها (کل کالایا)</option>
              <option value="in_stock">دارای موجودی فیزیکی</option>
              <option value="low_stock">رو به اتمام (&le; ۵)</option>
              <option value="out_of_stock">موجودی صفر (بدون کالا)</option>
            </select>

            {/* Download Excel */}
            <button
              onClick={handleExportExcel}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-sage hover:bg-brand-forest transition-colors text-white text-sm font-medium rounded-xl cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>خروجی اکسل (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Dynamic Items Table */}
        <div className="overflow-x-auto">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <Package className="w-16 h-16 text-stone-300 stroke-[1.5] mb-3" />
              <h4 className="text-lg font-bold text-stone-700">هیچ کالایی یافت نشد!</h4>
              <p className="text-stone-400 text-sm mt-1 max-w-md">
                یا اطلاعات با عبارت مورد نظر تطابق ندارند، یا هنوز کالایی در سیستم تعریف نگردیده است.
              </p>
              {products.length === 0 && (
                <button
                  onClick={onNavigateToProducts}
                  className="mt-4 px-4 py-2 bg-brand-sage text-white rounded-xl text-xs font-semibold hover:bg-brand-forest cursor-pointer"
                >
                  تعریف اولین کالا در اطلاعات پایه
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-[#fcfafa] border-b border-[#ebd7d7]/30 text-stone-500 font-bold text-xs uppercase tracking-wider">
                  <th className="py-4 px-6 w-14 border-l border-stone-100/40">ردیف</th>
                  <th className="py-4 px-6 w-28 text-center border-l border-stone-100/40">کد کالا</th>
                  <th className="py-4 px-6">نام و مشخصات کامل فنی کالا</th>
                  <th className="py-4 px-6 w-24 text-center border-r border-stone-100/40">واحد</th>
                  <th className="py-4 px-6 w-36 text-left border-r border-stone-100/40">موجودی فیزیکی</th>
                  <th className="py-4 px-6 w-52 text-center border-r border-stone-100/40">عملیات سریع گزارش و سند</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm text-stone-850">
                {filteredProducts.map((p, index) => {
                  const inventory = p.current_inventory ?? 0;
                  
                  // Stylings for indicator status (Natural Tones)
                  let statusBg = "bg-[#eefcf2] text-[#15502c] border border-emerald-200/50";
                  if (inventory <= 0) {
                    statusBg = "bg-[#fdf2f2] text-[#911d1d] border border-red-200/50";
                  } else if (inventory <= 5) {
                    statusBg = "bg-[#fef9c3] text-[#854d0e] border border-amber-200/50";
                  }

                  return (
                    <motion.tr 
                      key={p.id}
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-stone-50/60 transition-colors group"
                    >
                      <td className="py-4 px-6 text-stone-400 text-xs font-mono">{index + 1}</td>
                      <td className="py-4 px-6 text-center font-mono font-bold text-stone-600 bg-[#fbfbf9] group-hover:bg-transparent border-l border-stone-100/40">
                        {p.code}
                      </td>
                      <td className="py-4 px-6 font-semibold text-stone-850">
                        {p.name}
                      </td>
                      <td className="py-4 px-6 text-center text-stone-500 font-medium border-r border-stone-100/40">
                        {p.unit}
                      </td>
                      <td className="py-4 px-6 text-left border-r border-stone-100/40 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full ${statusBg} whitespace-nowrap`}>
                          {inventory <= 0 ? (
                            <>
                              <span className="font-mono text-sm font-black">۰</span>
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            </>
                          ) : (
                            <>
                              <span className="font-mono text-sm font-black">{inventory.toLocaleString("fa-IR")}</span>
                              <span className="opacity-90">{p.unit}</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center border-r border-stone-100/40">
                        <div className="flex items-center justify-center gap-2">
                          {/* Quick incoming (+) button */}
                          <button
                            onClick={() => onCreateDocument("incoming", p.id)}
                            className="bg-emerald-50 hover:bg-brand-moss hover:text-white text-emerald-800 w-8 h-8 flex items-center justify-center rounded-lg border border-emerald-200 transition-all font-bold cursor-pointer shadow-xs"
                            title="ثبت سریع ورود (+)"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          
                          {/* Quick outgoing (-) button */}
                          <button
                            onClick={() => onCreateDocument("outgoing", p.id)}
                            className="bg-rose-50 hover:bg-rose-700 hover:text-white text-rose-800 w-8 h-8 flex items-center justify-center rounded-lg border border-rose-200 transition-all font-bold cursor-pointer shadow-xs"
                            title="ثبت سریع خروج (-)"
                          >
                            <Minus className="w-4 h-4" />
                          </button>

                          {/* Cardex Ledger link */}
                          <button
                            onClick={() => onNavigateToCardex(p.id!)}
                            className="h-8 px-2.5 text-stone-600 hover:bg-stone-100 hover:text-brand-moss border border-stone-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold"
                            title="مشاهده کارتکس ریزگردش کالا"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>کارتکس</span>
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

        {/* Informative Footer */}
        <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-50 text-xs text-slate-400 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400" />
          <span>موجودی به محض انتخاب سند جدید در قالب فرم‌های اتوماتیک موازنه می‌گردد. از وارد نمودن اطلاعات تکراری پرهیز بفرمایید.</span>
        </div>
      </div>
    </div>
  );
}
