import React, { useState, useMemo } from "react";
import { Product, Person, DocumentRow } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Check, 
  Trash2, 
  Save, 
  X, 
  Plus, 
  AlertTriangle,
  Info
} from "lucide-react";

interface DocumentFormProps {
  type: "incoming" | "outgoing";
  products: Product[];
  persons: Person[];
  preselectedProductId?: number;
  onCancel: () => void;
  onSave: (docData: {
    type: "incoming" | "outgoing";
    date: string;
    person_id: number;
    description: string;
    rows: { product_id: number; quantity: number }[];
  }) => Promise<void>;
}

export default function DocumentForm({ 
  type, 
  products, 
  persons, 
  preselectedProductId,
  onCancel, 
  onSave 
}: DocumentFormProps) {
  // Document Header States
  const [docType, setDocType] = useState<"incoming" | "outgoing">(type);
  
  // Calculate standard Jalali date for May 2026. 
  // 2026-05-29 is approx 1405/03/08 (8th Khordad 1405)
  const [date, setDate] = useState("1405/03/08");
  const [personId, setPersonId] = useState<number>(persons[0]?.id ?? 0);
  const [description, setDescription] = useState("");

  // Product Selection States (Selected items are mapped on rows)
  const [selectedRows, setSelectedRows] = useState<{ product: Product; quantity: number }[]>(() => {
    if (preselectedProductId) {
      const found = products.find(p => p.id === preselectedProductId);
      if (found) {
        return [{ product: found, quantity: 1 }];
      }
    }
    return [];
  });
  const [productSearch, setProductSearch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search filter for products
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  // Handle product select click
  const handleProductToggle = (product: Product) => {
    const exists = selectedRows.find(r => r.product.id === product.id);
    if (exists) {
      // Remove it if clicked again
      setSelectedRows(prev => prev.filter(r => r.product.id !== product.id));
    } else {
      // Add row with default quantity = 1
      setSelectedRows(prev => [...prev, { product, quantity: 1 }]);
    }
  };

  // Update quantity on row
  const handleQuantityChange = (productId: number, val: string) => {
    const num = parseFloat(val);
    setSelectedRows(prev => prev.map(r => {
      if (r.product.id === productId) {
        return { ...r, quantity: isNaN(num) ? 0 : num };
      }
      return r;
    }));
  };

  // Remove single item completely from draft
  const handleRemoveItem = (productId: number) => {
    setSelectedRows(prev => prev.filter(r => r.product.id !== productId));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!personId) {
      setFormError("تعیین شخص یا شرکت طرف حساب برای صدور سند الزامی است.");
      return;
    }

    if (!date.trim()) {
      setFormError("وارد کردن تاریخ ثبت سند الزامی است.");
      return;
    }

    if (selectedRows.length === 0) {
      setFormError("حداقل باید یک ردیف کالا به برگه سند جاری اضافه نمایید.");
      return;
    }

    // Validation: make sure all quantities are positive
    const hasZeroOrNegative = selectedRows.some(r => r.quantity <= 0);
    if (hasZeroOrNegative) {
      setFormError("مقدار فیزیکی کالا برای تمامی ردیف‌ها باید عددی بزرگتر از صفر باشد.");
      return;
    }

    // Warning validation: check if outgoing has enough stock
    if (docType === "outgoing") {
      const negativeAlerts = selectedRows.filter(r => (r.product.current_inventory ?? 0) < r.quantity);
      if (negativeAlerts.length > 0) {
        const itemNames = negativeAlerts.map(r => `«${r.product.name}»`).join("، ");
        const confirmGo = window.confirm(
          `هشدار موازنه کالا:\nموجودی لحظه‌ای برای اقلام ${itemNames} کمتر از مقدار خروجی درخواستی است و موجودی موقتاً منفی خواهد شد.\n\nآیا با ثبت سند خروج موافق هستید؟`
        );
        if (!confirmGo) return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSave({
        type: docType,
        date: date.trim(),
        person_id: Number(personId),
        description: description.trim(),
        rows: selectedRows.map(r => ({
          product_id: r.product.id!,
          quantity: r.quantity
        }))
      });
    } catch (err: any) {
      setFormError(err.message || "بروز خطا در ثبت نهایی سند.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {docType === "incoming" ? (
              <>
                <ArrowUpRight className="w-6 h-6 text-emerald-500 bg-emerald-50 p-0.5 rounded-lg border border-emerald-100" />
                <span>صدور و تنظیم «سند ورود به انبار» (+)</span>
              </>
            ) : (
              <>
                <ArrowDownLeft className="w-6 h-6 text-rose-500 bg-rose-50 p-0.5 rounded-lg border border-rose-100" />
                <span>صدور و تنظیم «سند خروج از انبار» (-)</span>
              </>
            )}
          </h2>
          <p className="text-slate-500 text-xs mt-1">تکمیل اقلام کالاها و مشخصات سربرگ جهت افزودن به اسناد رسمی انبارداری</p>
        </div>

        {/* Rapid Type Switcher lock */}
        <div className="flex bg-stone-150 p-1.5 rounded-xl text-xs font-semibold border border-stone-200/50">
          <button
            type="button"
            onClick={() => setDocType("incoming")}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
              docType === "incoming" ? "bg-[#15803d] text-white shadow-xs" : "text-stone-550 hover:text-stone-850"
            }`}
          >
            ورود کالا (+)
          </button>
          <button
            type="button"
            onClick={() => setDocType("outgoing")}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
              docType === "outgoing" ? "bg-[#c2410c] text-white shadow-xs" : "text-stone-550 hover:text-stone-850"
            }`}
          >
            خروج کالا (-)
          </button>
        </div>
      </div>

      {formError && (
        <div id="form-error-banner" className="bg-rose-50 border border-rose-200 text-rose-900 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Side-by-Side Drafting Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Fast Product Picker (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl shadow-sm border border-stone-200/70 flex flex-col h-[550px]">
          <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-stone-100">انتخابگر سریع اقلام کالا</h3>
          
          {/* Dynamic Search */}
          <div className="relative my-3">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="جست‌وجوی کد یا نام کالا..."
              className="w-full pl-3 pr-9 py-2 bg-[#fcfbfa] border border-stone-200 rounded-xl text-xs placeholder-stone-400 focus:bg-white focus:ring-2 focus:ring-[#15803d] outline-none text-stone-900"
            />
          </div>

          {/* Catalog list */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredProducts.length === 0 ? (
              <div className="py-12 text-center text-stone-400 text-xs">کالایی با مشخصات مورد نظر یافت نشد.</div>
            ) : (
              filteredProducts.map(p => {
                const isSelected = selectedRows.some(r => r.product.id === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProductToggle(p)}
                    className={`w-full text-right p-2.5 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${
                      isSelected 
                        ? "bg-brand-forest text-white shadow-xs" 
                        : "bg-stone-50/50 hover:bg-stone-100 text-stone-700"
                    }`}
                  >
                    <div className="space-y-1 truncate max-w-[80%]">
                      <p className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-stone-850"}`}>
                        {p.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono ${isSelected ? "text-stone-200" : "text-stone-400"}`}>
                          کد: {p.code}
                        </span>
                        <span className="text-[10px]">·</span>
                        <span className={`text-[10px] ${isSelected ? "text-stone-200" : "text-stone-500"}`}>
                          موجودی: {(p.current_inventory ?? 0).toLocaleString("fa-IR")} {p.unit}
                        </span>
                      </div>
                    </div>
                    
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                      isSelected 
                        ? "bg-[#15803d] border-[#15803d] text-white" 
                        : "border-stone-300 bg-white text-transparent group-hover:border-stone-400"
                    }`}>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Document Header Details & Added Items Grid (lg:col-span-8) */}
        <form onSubmit={handleSubmit} className="lg:col-span-8 flex flex-col gap-6">
          {/* Header Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/70 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-stone-100 pb-3">مشخصات سربرگ حواله انبار</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date Input */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">تاریخ ثبت سند</label>
                <input
                  type="text"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="مثال: ۱۴۰۵/۰۳/۰۸"
                  className="w-full text-center px-3 py-2 bg-[#fcfbfa] border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-[#15803d] outline-none font-mono"
                />
              </div>

              {/* Stakeholder Select */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">شخص مرتبط / سازمان تحویل‌دهنده یا تحویل‌گیرنده</label>
                <select
                  required
                  value={personId}
                  onChange={(e) => setPersonId(Number(e.target.value))}
                  className="w-full text-right px-3 py-2 bg-[#fcfbfa] border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-[#15803d] outline-none text-stone-800 font-semibold cursor-pointer"
                >
                  <option value={0}>انتخاب کنید...</option>
                  {persons.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description Textarea */}
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5 font-sans">توضیحات تکمیلی سند</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیحات، شماره حواله متناظر یا پروژه تخصیصی را اینجا یادداشت کنید..."
                rows={2}
                className="w-full text-right p-3 bg-[#fcfbfa] border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-[#15803d] outline-none"
              />
            </div>
          </div>

          {/* Rows details Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200/70 overflow-hidden flex-1 flex flex-col min-h-[300px]">
            <div className="px-6 py-4 bg-[#fcfbfa] border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">اقلام و مقادیر در سند ({selectedRows.length} ردیف)</h3>
              <p className="text-[11px] text-stone-400">مقدار کالاهای تحویلی را با دقت تصحیح کنید.</p>
            </div>

            <div className="flex-1 overflow-x-auto">
              {selectedRows.length === 0 ? (
                <div className="py-16 text-center text-stone-400 flex flex-col items-center justify-center">
                  <Plus className="w-12 h-12 text-stone-300 stroke-[1.5] mb-2" />
                  <p className="text-xs font-semibold">هیچ کالایی به این سند اضافه نشده است.</p>
                  <p className="text-[10px] text-stone-400 mt-1 max-w-xs">از منوی انتخابگر کالا در ستون سمت راست برای انتخاب مکرر اقلام استفاده بفرمایید.</p>
                </div>
              ) : (
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-[#fcfbfa] border-b border-stone-200 text-stone-500 font-bold text-xs">
                      <th className="py-3 px-6 w-14">ردیف</th>
                      <th className="py-3 px-6 w-24">کد کالا</th>
                      <th className="py-3 px-6">شرح اقلام کالا</th>
                      <th className="py-3 px-6 w-44 text-center">مقدار کالا در حواله</th>
                      <th className="py-3 px-6 w-14">حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRows.map((row, idx) => {
                      const curInv = row.product.current_inventory ?? 0;
                      const hasLowStock = docType === "outgoing" && curInv < row.quantity;

                      return (
                        <tr key={row.product.id} className="border-b border-stone-100 hover:bg-stone-50/40 transition-colors">
                          <td className="py-4 px-6 text-stone-400 text-xs font-mono">{idx + 1}</td>
                          <td className="py-4 px-6 font-mono font-medium text-stone-500">{row.product.code}</td>
                          <td className="py-4 px-6 font-semibold text-stone-800">
                            <div>{row.product.name}</div>
                            <div className="flex gap-2 mt-1">
                              <span className="text-[10px] font-medium text-stone-450">واحد: {row.product.unit}</span>
                              <span className="text-[10px] text-stone-200">|</span>
                              <span className="text-[10px] text-stone-455 font-medium font-mono">
                                موجودی انبار: {curInv.toLocaleString("fa-IR")}
                              </span>
                              {hasLowStock && (
                                <span className="text-[10px] text-[#c2410c] font-semibold flex items-center gap-0.5">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>کسر قطعی موجودی (منفی خواهد شد)</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="inline-flex items-center gap-2 border border-stone-200 rounded-xl bg-white px-2.5 py-1 text-sm font-semibold shadow-xs">
                              <input
                                type="number"
                                required
                                step="any"
                                min="0.001"
                                value={row.quantity === 0 ? "" : row.quantity}
                                onChange={(e) => handleQuantityChange(row.product.id!, e.target.value)}
                                className="w-20 text-center font-semibold font-mono focus:outline-none placeholder-stone-300 text-stone-900 text-sm"
                                placeholder="۰.۰۰"
                              />
                              <span className="text-stone-400 text-xs border-r pr-2">{row.product.unit}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(row.product.id!)}
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="حذف ردیف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            
            {/* Action Save/Cancel Buttons */}
            <div className="p-6 bg-[#fcfbfa] border-t border-stone-100 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#15803d] hover:bg-emerald-800 disabled:bg-stone-300 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer text-sm"
              >
                <Save className="w-4.5 h-4.5 text-emerald-100" />
                <span>{isSubmitting ? "در حال ذخیره‌سازی..." : "ثبت قطعی و صدور سند"}</span>
              </button>
              
              <button
                type="button"
                onClick={onCancel}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold rounded-xl text-sm transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
                <span>انصراف و خروج</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
