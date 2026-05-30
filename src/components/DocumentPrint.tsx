import React from "react";
import { DocumentDetail } from "../types";
import { Printer, ArrowLeft, Calendar, User, FileText, CheckCircle2 } from "lucide-react";

interface DocumentPrintProps {
  document: DocumentDetail;
  onBack: () => void;
}

export default function DocumentPrint({ document, onBack }: DocumentPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Navigation and Actions */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200/70 flex items-center justify-between no-print">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 ml-1" />
          <span>بازگشت به تاریخچه اسناد</span>
        </button>

        <button
          id="btn-print-doc"
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs cursor-pointer text-xs"
        >
          <Printer className="w-4.5 h-4.5 text-emerald-100" />
          <span>چاپ سند / دریافت PDF (A4)</span>
        </button>
      </div>

      {/* Elegant Standard A4 Document Section */}
      <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xs border border-stone-300 print-card max-w-4xl mx-auto space-y-8 font-sans">
        
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center pb-6 border-b-2 border-double border-stone-300 gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${
              document.type === "incoming" ? "bg-[#eefcf2] text-[#15803d]" : "bg-[#fdf2f2] text-[#c2410c]"
            }`}>
              <CheckCircle2 className="w-10 h-10 stroke-[1.5]" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">حواله تحویل و تحول کالا</h1>
              <p className="text-xs text-stone-500 mt-1 font-medium">کارگاه مرکزی پروژه</p>
            </div>
          </div>
          
          <div className="text-center sm:text-left space-y-1.5">
            <div className="flex items-center justify-center sm:justify-end gap-1.5 text-slate-800 text-sm font-semibold">
              <span>سریال سند:</span>
              <span className="font-mono text-base font-bold bg-stone-100 px-2 py-0.5 rounded-md">
                {String(document.id).padStart(5, "0")}
              </span>
            </div>
            
            <div className="flex items-center justify-center sm:justify-end gap-2 text-xs text-stone-500 font-medium">
              <Calendar className="w-4 h-4 text-stone-400" />
              <span>تاریخ درج فیزیکی:</span>
              <span className="font-mono font-bold text-stone-700">{document.date}</span>
            </div>

            <div className="flex items-center justify-center sm:justify-end gap-1 px-4 py-1 text-xs font-semibold rounded-full border shadow-2xs mt-1.5 w-max mx-auto sm:ml-0 inline-block">
              {document.type === "incoming" ? (
                <span className="text-[#15502c] bg-[#eefcf2] border-emerald-150 px-2 rounded-full font-bold">سند ورود کالا (+)</span>
              ) : (
                <span className="text-[#911d1d] bg-[#fdf2f2] border-red-150 px-2 rounded-full font-bold">سند خروج کالا (-)</span>
              )}
            </div>
          </div>
        </div>

        {/* Stakeholder Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#fcfbfa] p-6 rounded-2xl border border-stone-200/70 text-sm">
          <div className="flex items-center gap-3 text-stone-700">
            <User className="w-5 h-5 text-stone-400 shrink-0" />
            <div>
              <span className="text-xs text-stone-400 block font-medium">پیمانکار / شخص طرف حساب مرتبط:</span>
              <span className="font-bold text-slate-850">{document.person_name}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-stone-700 border-t md:border-t-0 md:border-r border-stone-200 pt-4 md:pt-0 md:pr-6">
            <FileText className="w-5 h-5 text-stone-400 shrink-0" />
            <div>
              <span className="text-xs text-stone-400 block font-medium">نقش ثبتی طرف حساب در سیستم:</span>
              <span className="font-semibold text-stone-650">{document.person_role}</span>
            </div>
          </div>
        </div>

        {/* List of quantitative items Table */}
        <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="bg-[#fcfafa] border-b border-stone-200 text-stone-600 font-bold text-xs">
                <th className="py-3 px-4 w-12 text-center">ردیف</th>
                <th className="py-3 px-4 w-28 text-center border-r border-stone-200">کد اختصاصی</th>
                <th className="py-3 px-4 border-r border-stone-200">مشخصات فنی و عنوان کالا</th>
                <th className="py-3 px-4 w-32 text-center border-r border-stone-200">مقدار تحویلی</th>
                <th className="py-3 px-4 w-24 text-center border-r border-stone-200">واحد سنجش</th>
                <th className="py-3 px-4 w-32 text-center border-r border-stone-200">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-stone-750">
              {document.rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-stone-50/50">
                  <td className="py-3 px-4 text-center font-mono text-stone-400">{idx + 1}</td>
                  <td className="py-3 px-4 text-center font-mono font-medium text-stone-500 bg-stone-50/40 border-r border-stone-200">
                    {row.product_code}
                  </td>
                  <td className="py-3 px-4 font-bold border-r border-stone-200 text-slate-800">{row.product_name}</td>
                  <td className="py-3 px-4 text-center font-mono font-black text-slate-900 border-r border-stone-200">
                    {row.quantity.toLocaleString("fa-IR")}
                  </td>
                  <td className="py-3 px-4 text-center text-stone-500 font-medium border-r border-stone-200">
                    {row.product_unit}
                  </td>
                  <td className="py-3 px-4 border-r border-stone-200">
                    {/* Visual blank spot for manual written notes */}
                    <span className="text-stone-300">...</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total stats and description */}
        <div className="space-y-4">
          {document.description && (
            <div className="p-4 bg-[#fcfbfa] rounded-xl border border-stone-150 text-xs">
              <span className="font-bold text-stone-400 block mb-1">توضیحات و یادداشت حواله برگه جاری:</span>
              <p className="text-slate-755 leading-relaxed font-semibold">{document.description}</p>
            </div>
          )}

          {/* Quantitative audit sum */}
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold px-2">
            <span>تعداد تنوع اقلام: <strong className="text-stone-700 font-bold">{document.rows.length}</strong> کالا</span>
            <span>مجموع تمام مقادیر فیزیکی حواله شده: <strong className="text-stone-700 font-black">{(document.rows.reduce((sum, r) => sum + r.quantity, 0)).toLocaleString("fa-IR")}</strong> واحد</span>
          </div>
        </div>

        {/* Signatures columns */}
        <div className="grid grid-cols-2 gap-8 pt-12 border-t-2 border-dotted border-stone-200">
          {/* Signee Delivery Person */}
          <div className="text-center font-semibold space-y-12">
            <span className="text-xs text-stone-400 block tracking-wider uppercase">
              {document.type === "incoming" 
                ? "امضاء و مهر (تحویل‌ دهنده / تأمین کالا)" 
                : "امضاء و تاییدیه (تحویل‌ دهنده / پرسنل انبار)"
              }
            </span>
            <div className="h-10 border-b border-dashed border-stone-300 w-3/4 mx-auto"></div>
            <span className="text-xs text-slate-800 font-bold">{document.type === "incoming" ? document.person_name : "انبار کارگاه مرکزی"}</span>
          </div>

          {/* Signee Final Receiver Person */}
          <div className="text-center font-semibold space-y-12">
            <span className="text-xs text-stone-400 block tracking-wider uppercase">
              {document.type === "incoming" 
                ? "امضاء و مهر (تحویل‌ گیرنده / انبار کارگاه)" 
                : "امضاء و تاییدیه نهایی (تحویل‌ گیرنده / کارفرما)"
              }
            </span>
            <div className="h-10 border-b border-dashed border-stone-300 w-3/4 mx-auto"></div>
            <span className="text-xs text-slate-800 font-bold">{document.type === "incoming" ? "انبار کارگاه مرکزی" : document.person_name}</span>
          </div>
        </div>

        {/* Print Disclaimer */}
        <div className="pt-8 text-center text-xs text-stone-400 flex items-center justify-center gap-3 border-t border-stone-200">
          <span>کد پیگیری حواله: {String(document.id).padStart(5, "0")}</span>
          <span>·</span>
          <span>تاریخ بازبینی چاپ: {new Date().toLocaleDateString("fa-IR")}</span>
        </div>
      </div>
    </div>
  );
}
