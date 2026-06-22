import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  DollarSign, 
  Truck, 
  Briefcase, 
  Layers, 
  BarChart3, 
  CalendarDays, 
  RefreshCw, 
  ChevronLeft, 
  Info,
  Calendar
} from "lucide-react";
import { formatCurrency, convertToPersianDigits } from "../utils/formatters";

function formatBrief(num: number): string {
  if (!num) return "۰";
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  let formatted = "";
  if (abs >= 1_000_000_000_000) {
    formatted = (abs / 1_000_000_000_000).toFixed(1) + " ه.م"; // هزار میلیارد ریال
  } else if (abs >= 1_000_000_000) {
    formatted = (abs / 1_000_000_000).toFixed(1) + " م.د"; // میلیارد ریال
  } else if (abs >= 1_000_000) {
    formatted = (abs / 1_000_000).toFixed(1) + " م"; // میلیون ریال
  } else if (abs >= 1_000) {
    formatted = (abs / 1_000).toFixed(0) + " ه"; // هزار ریال
  } else {
    formatted = abs.toString();
  }
  return convertToPersianDigits(sign + formatted);
}

interface MonthlyReportData {
  index: number;
  name: string;
  machinery_total: number;
  machinery_heavy: number;
  machinery_light: number;
  contractor_payments: number;
  machinery_payments: number;
  contractor_work: number;
  combined_payments: number;
  combined_cost: number;
}

interface AnalyticalReportsProps {
  onBack?: () => void;
}

export default function AnalyticalReports({ onBack }: AnalyticalReportsProps) {
  const [data, setData] = useState<MonthlyReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"combined" | "contractors" | "machinery">("combined");
  const [machineryViewMode, setMachineryViewMode] = useState<"stacked" | "cumulative">("stacked");
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/summary");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Error loading analytical reports:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute stats
  const totalMachineryCost = data.reduce((sum, m) => sum + m.machinery_total, 0);
  const totalMachineryHeavy = data.reduce((sum, m) => sum + m.machinery_heavy, 0);
  const totalMachineryLight = data.reduce((sum, m) => sum + m.machinery_light, 0);
  const totalContractorWork = data.reduce((sum, m) => sum + m.contractor_work, 0);
  const totalCombinedCost = totalMachineryCost + totalContractorWork;

  const totalContractorPayments = data.reduce((sum, m) => sum + m.contractor_payments, 0);
  const totalMachineryPayments = data.reduce((sum, m) => sum + m.machinery_payments, 0);
  const totalCombinedPayments = totalContractorPayments + totalMachineryPayments;

  // Find max values for chart scale calculation
  const maxMachinery = Math.max(...data.map(d => d.machinery_total), 1);
  const maxContractorWork = Math.max(...data.map(d => d.contractor_work), 1);
  const maxCombinedCost = Math.max(...data.map(d => d.combined_cost), 1);
  const maxCombinedPayments = Math.max(...data.map(d => d.combined_payments), 1);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="text-xs font-bold text-stone-500 font-sans">در حال بارگزاری و پردازش نمودارها و آمار جامع کارگاه...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans leading-relaxed text-right animate-fade-in" dir="rtl" id="analytical-reports-root">
      
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs" id="reports-header-card">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-stone-100 border border-stone-200 rounded-xl transition-all cursor-pointer text-stone-600 flex items-center justify-center shrink-0"
              title="برگشت به پورتال اصلی"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-lg font-black text-stone-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              داشبورد آنالیز پیشرفته و ترازهای کل کارگاه
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              گزارش‌های همزمان، نمودارهای پویای هزینه و زمان، و تراز کل ماشین‌آلات (سبک/سنگین) و پیمانکاران جزء در سال ۱۴۰۵
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData}
            id="reports-refresh-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 rounded-xl text-[11px] font-bold text-stone-600 bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            بروزرسانی داده‌ها
          </button>
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            سال مالی ۱۴۰۵
          </div>
        </div>
      </div>

      {/* Main KPI metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="reports-kpi-grid">
        
        <div className="bg-gradient-to-br from-indigo-50/50 to-indigo-100/25 p-4 rounded-xl border border-indigo-100/80 shadow-xs">
          <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 block mb-1">کل هزینه تجمعی پیشرفت کارگاه</span>
          <p className="text-md sm:text-base font-black text-indigo-900 font-mono">
            {formatCurrency(totalCombinedCost)}
          </p>
          <div className="text-[9px] text-indigo-500 mt-1.5 font-bold">ماشین‌آلات کارکرد + کارکرد خالص پیمانکاران</div>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 rounded-xl border border-slate-200/60 shadow-xs">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">سهم کل کارکرد ماشین‌آلات</span>
          <p className="text-md sm:text-base font-black text-slate-800 font-mono">
            {formatCurrency(totalMachineryCost)}
          </p>
          <div className="text-[9px] text-stone-400 mt-1.5 flex justify-between font-bold">
            <span>سنگین: {convertToPersianDigits((totalMachineryHeavy/Math.max(totalMachineryCost, 1)*100).toFixed(0))}%</span>
            <span>سبک: {convertToPersianDigits((totalMachineryLight/Math.max(totalMachineryCost, 1)*100).toFixed(0))}%</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50/30 to-rose-50/30 p-4 rounded-xl border border-stone-100 shadow-xs">
          <span className="text-[10px] uppercase tracking-wider font-bold text-rose-500 block mb-1">سهم تجمعی پیمانکاران جزء</span>
          <p className="text-md sm:text-base font-black text-rose-900 font-mono">
            {formatCurrency(totalContractorWork)}
          </p>
          <div className="text-[9px] text-stone-400 mt-1.5 font-bold">ارزش کل صورت‌وضعیت‌های ثبت شده کارگاه</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50/40 to-emerald-100/20 p-4 rounded-xl border border-emerald-100/80 shadow-xs">
          <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 block mb-1">کل پرداخت‌های علی‌الحساب کارگاه</span>
          <p className="text-md sm:text-base font-black text-emerald-800 font-mono">
            {formatCurrency(totalCombinedPayments)}
          </p>
          <div className="text-[9px] text-emerald-600 mt-1.5 flex justify-between font-bold">
            <span>به ماشین‌آلات: {convertToPersianDigits((totalMachineryPayments/Math.max(totalCombinedPayments,1)*100).toFixed(0))}%</span>
            <span>به پیمانکاران: {convertToPersianDigits((totalContractorPayments/Math.max(totalCombinedPayments,1)*100).toFixed(0))}%</span>
          </div>
        </div>

      </div>

      {/* Primary Chart panel with segment selector */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden" id="reports-charts-container">
        
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 bg-slate-50/40 p-4 gap-4">
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("combined")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "combined" 
                  ? "bg-white text-indigo-700 shadow-xs" 
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              ۱. گزارش تجمعی سیستم (پیمانکار + ماشین)
            </button>
            <button
              onClick={() => setActiveTab("contractors")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "contractors" 
                  ? "bg-white text-indigo-700 shadow-xs" 
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              ۲. نمودار پیشرفت پیمانکاران
            </button>
            <button
              onClick={() => setActiveTab("machinery")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "machinery" 
                  ? "bg-white text-indigo-700 shadow-xs" 
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              ۳. کارکرد تفکیکی ماشین‌آلات
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "machinery" && (
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg text-[10px] font-bold">
                <button
                  onClick={() => setMachineryViewMode("stacked")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    machineryViewMode === "stacked" ? "bg-white text-slate-800 shadow-xs" : "text-stone-500"
                  }`}
                >
                  تفکیک سبک / سنگین
                </button>
                <button
                  onClick={() => setMachineryViewMode("cumulative")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    machineryViewMode === "cumulative" ? "bg-white text-slate-800 shadow-xs" : "text-stone-500"
                  }`}
                >
                  نمودار تجمعی کل
                </button>
              </div>
            )}
            <span className="text-[10px] font-bold text-stone-400 flex items-center gap-1">
              <Info className="w-3 h-3 text-stone-400" />
              جهت مشاهده موازنه تراز هر ماه، نشانگر ماوس را روی ستون‌ها قرار دهید.
            </span>
          </div>
        </div>

        {/* Dynamic Custom Chart Content */}
        <div className="p-6">
          {activeTab === "combined" && (
            <div>
              <div className="mb-4">
                <h3 className="text-xs font-extrabold text-stone-600">نمودار تجمعی ماهیانه مخارج و ترازهای کل (۱۴۰۵)</h3>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  مقایسه کارکرد کل ثبت‌شده ماشین‌آلات کارگاهی در برابر مجموع واریزی‌های قطعی پیمانکاران
                </p>
              </div>

              {/* Graphical Canvas */}
              <div className="h-[280px] w-full flex items-end justify-between border-b border-l border-stone-200 mt-6 pt-4 pb-2 px-2 relative">
                
                {/* Horizontal grid lines */}
                <div className="absolute left-0 right-0 top-1/4 border-t border-stone-100 pointer-events-none"></div>
                <div className="absolute left-0 right-0 top-2/4 border-t border-stone-100 pointer-events-none"></div>
                <div className="absolute left-0 right-0 top-3/4 border-t border-stone-100 pointer-events-none"></div>

                {data.map((m, i) => {
                  const maxVal = Math.max(maxCombinedCost, maxCombinedPayments);
                  const combinedHeight = (m.combined_cost / maxVal) * 100;
                  const paymentHeight = (m.combined_payments / maxVal) * 100;

                  return (
                    <div 
                      key={m.index} 
                      className="flex-1 flex flex-col items-center group relative h-full justify-end px-1 sm:px-3"
                      onMouseEnter={() => setHoveredMonth(m.index)}
                      onMouseLeave={() => setHoveredMonth(null)}
                    >
                      {/* Tooltip */}
                      {hoveredMonth === m.index && (
                        <div className="absolute bottom-[105%] left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-950 text-white p-3.5 rounded-xl shadow-xl w-52 z-30 font-sans text-right animate-fade-in text-[10px] space-y-1 leading-normal">
                          <strong className="block text-amber-400 text-xs text-center border-b border-white/10 pb-1 mb-1">{m.name} ۱۴۰۵</strong>
                          <div className="flex justify-between">
                            <span className="text-white/70">کارکرد پیشرفت کار:</span>
                            <span className="font-mono font-bold text-indigo-300">{formatCurrency(m.combined_cost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70">کل واریزی‌ها:</span>
                            <span className="font-mono font-bold text-emerald-400">{formatCurrency(m.combined_payments)}</span>
                          </div>
                          <div className="border-t border-white/10 mt-1.5 pt-1 flex justify-between font-bold text-amber-200">
                            <span>اختلاف تراز ماه:</span>
                            <span className="font-mono">{formatCurrency(m.combined_cost - m.combined_payments)}</span>
                          </div>
                        </div>
                      )}

                      {/* Stacked columns */}
                      <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full relative group">
                        {/* Cost Bar */}
                        <div 
                          className="w-3 sm:w-5 bg-indigo-600 rounded-t shadow-xs transition-all duration-300 group-hover:bg-indigo-700 relative"
                          style={{ height: `${Math.max(combinedHeight, 2)}%` }}
                        >
                          <span className="absolute bottom-[102%] left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold text-indigo-900 leading-none whitespace-nowrap bg-white/95 border border-indigo-100 px-0.5 rounded shadow-2xs pointer-events-none">
                            {formatBrief(m.combined_cost)}
                          </span>
                        </div>
                        {/* Payment Bar */}
                        <div 
                          className="w-3 sm:w-5 bg-emerald-500 rounded-t shadow-xs transition-all duration-300 group-hover:bg-emerald-600 relative"
                          style={{ height: `${Math.max(paymentHeight, 2)}%` }}
                        >
                          <span className="absolute bottom-[102%] left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold text-emerald-800 leading-none whitespace-nowrap bg-white/95 border border-emerald-100 px-0.5 rounded shadow-2xs pointer-events-none">
                            {formatBrief(m.combined_payments)}
                          </span>
                        </div>
                      </div>

                      {/* Month label and permanent balance state info */}
                      <div className="text-[10px] font-bold text-stone-500 font-sans mt-3 transform group-hover:text-indigo-600 transition-colors whitespace-nowrap flex flex-col items-center gap-0.5">
                        <span className="text-stone-700 font-bold">{m.name}</span>
                        <span className={`text-[8.5px] font-mono font-black scale-95 leading-none px-1 py-0.5 rounded-sm border ${
                          (m.combined_cost - m.combined_payments) > 0 
                            ? "bg-amber-50 text-amber-700 border-amber-200/55" 
                            : (m.combined_cost - m.combined_payments) === 0 
                              ? "bg-slate-50 text-slate-500 border-stone-200/40" 
                              : "bg-emerald-50 text-emerald-700 border-emerald-200/55"
                        }`}>
                          تراز: {formatBrief(m.combined_cost - m.combined_payments)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

               {/* Legends */}
              <div className="flex items-center gap-6 justify-center mt-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-indigo-600 rounded"></span>
                  <span className="text-[10px] font-bold text-stone-600">میزان کل کارکرد انجام شده (ماشین‌آلات + پیمانکاران)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-emerald-500 rounded"></span>
                  <span className="text-[10px] font-bold text-stone-600">کل پرداختی‌ها و تسویه‌های پرداختی</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "contractors" && (
            <div>
              <div className="mb-4">
                <h3 className="text-xs font-extrabold text-stone-600">نمودار زمانی و هزینه کارکرد پیمانکاران (۱۴۰۵)</h3>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  روند پیشرفت ماهیانه و کارکرد ناخالص/خالص تایید شده پیمانکاران جزء کارگاه
                </p>
              </div>

              {/* Graphical Canvas */}
              <div className="h-[280px] w-full flex items-end justify-between border-b border-l border-stone-200 mt-6 pt-4 pb-2 px-2 relative">
                
                {/* Horizontal grid lines */}
                <div className="absolute left-0 right-0 top-1/4 border-t border-stone-100 pointer-events-none"></div>
                <div className="absolute left-0 right-0 top-2/4 border-t border-stone-100 pointer-events-none"></div>
                <div className="absolute left-0 right-0 top-3/4 border-t border-stone-100 pointer-events-none"></div>

                {data.map((m, i) => {
                  const workHeight = (m.contractor_work / maxContractorWork) * 100;
                  const payHeight = (m.contractor_payments / maxContractorWork) * 100;

                  return (
                    <div 
                      key={m.index} 
                      className="flex-1 flex flex-col items-center group relative h-full justify-end px-1 sm:px-3"
                      onMouseEnter={() => setHoveredMonth(m.index)}
                      onMouseLeave={() => setHoveredMonth(null)}
                    >
                      {/* Tooltip */}
                      {hoveredMonth === m.index && (
                        <div className="absolute bottom-[105%] left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-950 text-white p-3 shadow-xl w-48 z-30 font-sans text-right animate-fade-in text-[10px] space-y-1">
                          <strong className="block text-orange-400 text-xs text-center border-b border-white/10 pb-0.5 mb-1">{m.name} ۱۴۰۵</strong>
                          <div className="flex justify-between">
                            <span className="text-white/70">پیشرفت کارکرد خالص:</span>
                            <span className="font-mono font-bold text-orange-300">{formatCurrency(m.contractor_work)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70">پرداختی صورت‌وضعیت:</span>
                            <span className="font-mono font-bold text-emerald-300">{formatCurrency(m.contractor_payments)}</span>
                          </div>
                        </div>
                      )}

                      {/* Columns */}
                      <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full relative">
                        {/* Work Bar */}
                        <div 
                          className="w-3/5 bg-rose-600 rounded-t shadow-xs transition-all duration-300 group-hover:bg-rose-700"
                          style={{ height: `${Math.max(workHeight, 2)}%` }}
                        ></div>
                        {/* Payments Bar */}
                        <div 
                          className="w-2/5 bg-emerald-500 rounded-t shadow-xs transition-all duration-300 group-hover:bg-emerald-600"
                          style={{ height: `${Math.max(payHeight, 2)}%` }}
                        ></div>
                      </div>

                      {/* Month label */}
                      <span className="text-[10px] font-bold text-stone-500 font-sans mt-3 transform group-hover:text-amber-600 transition-colors whitespace-nowrap">
                        {m.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legends */}
              <div className="flex items-center gap-6 justify-center mt-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-rose-600 rounded"></span>
                  <span className="text-[10px] font-bold text-stone-600">صورت وضعیت‌های تایید شده پیمانکاران</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-emerald-50 rounded bg-emerald-500"></span>
                  <span className="text-[10px] font-bold text-stone-600">واریزی‌های مالی به حساب پیمانکاران</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "machinery" && (
            <div>
              <div className="mb-4">
                <h3 className="text-xs font-extrabold text-stone-600">نمودار روند کارکرد ماهیانه ماشین‌آلات کارگاهی (۱۴۰۵)</h3>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  {machineryViewMode === "stacked" 
                    ? "نمایش تفکیک کارکرد ماهیانه بر اساس رده سنگین (لودر، گریدر و...) و سبک (نیسان، خاور و...)" 
                    : "نمایش کارکرد تجمعی یکپارچه ماشین‌آلات"
                  }
                </p>
              </div>

              {/* Graphical Canvas */}
              <div className="h-[280px] w-full flex items-end justify-between border-b border-l border-stone-200 mt-6 pt-4 pb-2 px-2 relative">
                
                {/* Horizontal grid lines */}
                <div className="absolute left-0 right-0 top-1/4 border-t border-stone-100 pointer-events-none"></div>
                <div className="absolute left-0 right-0 top-2/4 border-t border-stone-100 pointer-events-none"></div>
                <div className="absolute left-0 right-0 top-3/4 border-t border-stone-100 pointer-events-none"></div>

                {data.map((m, i) => {
                  const valHeavy = m.machinery_heavy;
                  const valLight = m.machinery_light;
                  const valTotal = m.machinery_total;

                  const heavyHeight = (valHeavy / maxMachinery) * 100;
                  const lightHeight = (valLight / maxMachinery) * 100;
                  const totalHeight = (valTotal / maxMachinery) * 100;

                  return (
                    <div 
                      key={m.index} 
                      className="flex-1 flex flex-col items-center group relative h-full justify-end px-1 sm:px-3"
                      onMouseEnter={() => setHoveredMonth(m.index)}
                      onMouseLeave={() => setHoveredMonth(null)}
                    >
                      {/* Tooltip */}
                      {hoveredMonth === m.index && (
                        <div className="absolute bottom-[105%] left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-950 text-white p-3.5 rounded-xl shadow-xl w-52 z-30 font-sans text-right animate-fade-in text-[10px] space-y-1">
                          <strong className="block text-indigo-400 text-xs text-center border-b border-white/10 pb-0.5 mb-1">{m.name} ۱۴۰۵</strong>
                          <div className="flex justify-between">
                            <span className="text-white/70">کارکرد ماشین‌آلات سنگین:</span>
                            <span className="font-mono font-bold text-amber-500">{formatCurrency(valHeavy)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70">کارکرد ماشین‌آلات سبک:</span>
                            <span className="font-mono font-bold text-cyan-400">{formatCurrency(valLight)}</span>
                          </div>
                          <div className="border-t border-white/10 mt-1 pt-1 flex justify-between font-bold text-white">
                            <span>جمع کل کارکرد ماه:</span>
                            <span className="font-mono text-indigo-300">{formatCurrency(valTotal)}</span>
                          </div>
                        </div>
                      )}

                      {/* Column Stack Rendering */}
                      <div className="w-2/3 flex flex-col justify-end h-full relative">
                        {machineryViewMode === "stacked" ? (
                          <>
                            {/* Light Machinery block (Top Stack component) */}
                            <div 
                              className="w-full bg-cyan-500 hover:bg-cyan-600 transition-colors"
                              style={{ height: `${Math.max(lightHeight, 2)}%` }}
                            ></div>
                            {/* Heavy Machinery block (Bottom Stack core) */}
                            <div 
                              className="w-full bg-amber-500 rounded-t hover:bg-amber-600 transition-colors"
                              style={{ height: `${Math.max(heavyHeight, 2)}%` }}
                            ></div>
                          </>
                        ) : (
                          <div 
                            className="w-full bg-slate-700 rounded-t group-hover:bg-indigo-600 transition-colors"
                            style={{ height: `${Math.max(totalHeight, 2)}%` }}
                          ></div>
                        )}
                      </div>

                      {/* Month label */}
                      <span className="text-[10px] font-bold text-stone-500 font-sans mt-3 transform group-hover:text-cyan-600 transition-colors whitespace-nowrap">
                        {m.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legends */}
              <div className="flex items-center gap-6 justify-center mt-4">
                {machineryViewMode === "stacked" ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-amber-500 rounded"></span>
                      <span className="text-[10px] font-bold text-stone-600">رده سنگین کارگاهی (لودر، گریدر، بیل، غلتک...)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-cyan-500 rounded"></span>
                      <span className="text-[10px] font-bold text-stone-600">رده سبک کارگاهی (نیسان، وانت، سواری...)</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-slate-700 rounded"></span>
                    <span className="text-[10px] font-bold text-stone-600">جمع کل کارکرد اجاره ماهیانه ماشین‌آلات</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid view showing exactly what was spent under Farvardin 1405 machinery or contractor payments */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden" id="reports-grid-card">
        <div className="p-5 border-b border-stone-100 bg-slate-50/20">
          <h3 className="text-xs font-extrabold text-stone-750 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-orange-600" />
            جدول ریز تراز و بهای تمام‌شده ماهیانه کارگاه (۱۴۰۵)
          </h3>
          <p className="text-[10px] text-stone-400 mt-0.5">
            پیمان‌سپاری تجمعی و کارکرد و پرداخت‌های منسجم برای شناسایی هزینه‌های پروژه‌های فعال
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-stone-200">
              <tr className="text-stone-500 font-bold">
                <th className="py-3 px-4">نام ماه</th>
                <th className="py-3 px-4 text-left">کارکرد کل ماشین‌آلات</th>
                <th className="py-3 px-4 text-left font-mono text-[10px] text-stone-400">(رده سنگین)</th>
                <th className="py-3 px-4 text-left font-mono text-[10px] text-stone-400">(رده سبک)</th>
                <th className="py-3 px-4 text-left text-indigo-700">کارکرد پیمانکاران</th>
                <th className="py-3 px-2 text-left text-emerald-800">کل پرداخت‌ها</th>
                <th className="py-3 px-4 text-left font-bold text-stone-850 bg-indigo-50/40">مجموع هزینه کل پیشرفت ماه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data.map((m) => (
                <tr key={m.index} className="hover:bg-slate-50/50 transition-all font-semibold text-stone-700">
                  <td className="py-3.5 px-4 font-bold text-stone-800 font-sans">{m.name}</td>
                  
                  {/* Machinery rent */}
                  <td className="py-3.5 px-4 text-left font-mono">{formatCurrency(m.machinery_total)}</td>
                  
                  {/* Split details in light weights */}
                  <td className="py-3.5 px-4 text-left font-mono text-stone-400 text-[10px]">
                    {m.machinery_heavy > 0 ? formatCurrency(m.machinery_heavy) : "۰"}
                  </td>
                  <td className="py-3.5 px-4 text-left font-mono text-stone-400 text-[10px]">
                    {m.machinery_light > 0 ? formatCurrency(m.machinery_light) : "۰"}
                  </td>

                  {/* Contractor work progress */}
                  <td className="py-3.5 px-4 text-left font-mono text-indigo-600">{formatCurrency(m.contractor_work)}</td>
                  
                  {/* Realized payments of BOTH sections */}
                  <td className="py-3.5 px-2 text-left font-mono text-emerald-700 font-semibold">{formatCurrency(m.combined_payments)}</td>
                  
                  {/* Combined billing values */}
                  <td className="py-3.5 px-4 text-left font-mono font-black text-indigo-900 bg-indigo-50/30">
                    {formatCurrency(m.combined_cost)}
                  </td>
                </tr>
              ))}

              {/* Total Summary Row */}
              <tr className="bg-slate-50 font-black border-t-2 border-stone-200">
                <td className="py-4 px-4">جمع کل سال ۱۴۰۵</td>
                <td className="py-4 px-4 text-left font-mono font-black text-slate-800">{formatCurrency(totalMachineryCost)}</td>
                <td className="py-4 px-4 text-left font-mono text-[10px] text-stone-500">{formatCurrency(totalMachineryHeavy)}</td>
                <td className="py-4 px-4 text-left font-mono text-[10px] text-stone-500">{formatCurrency(totalMachineryLight)}</td>
                <td className="py-4 px-4 text-left font-mono font-black text-indigo-750">{formatCurrency(totalContractorWork)}</td>
                <td className="py-4 px-2 text-left font-mono font-black text-emerald-800">{formatCurrency(totalCombinedPayments)}</td>
                <td className="py-4 px-4 text-left font-mono font-black text-indigo-950 bg-indigo-100/30">{formatCurrency(totalCombinedCost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
