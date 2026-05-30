import React, { useState, useRef } from "react";
import { Product, Person } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  FileSpreadsheet, 
  Upload, 
  Users, 
  PackageMinus, 
  Info,
  CheckCircle,
  XCircle,
  FileText,
  Layers
} from "lucide-react";
import * as XLSX from "xlsx";

interface BaseDataProps {
  products: Product[];
  persons: Person[];
  settings: Record<string, string>;
  onRefreshProducts: () => void;
  onRefreshPersons: () => void;
}

export default function BaseData({ products, persons, settings, onRefreshProducts, onRefreshPersons }: BaseDataProps) {
  const [activeTab, setActiveTab] = useState<"products" | "persons">("products");
  
  // Alerts and States
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  
  // Product Form states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [pCode, setPCode] = useState("");
  const [pName, setPName] = useState("");
  const [pUnit, setPUnit] = useState("عدد");
  const [pCategory, setPCategory] = useState("عمومی");
  const [pMinStock, setPMinStock] = useState("0");
  const [customUnit, setCustomUnit] = useState("");
  const [isCustomUnit, setIsCustomUnit] = useState(false);

  // Person Form states
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [perName, setPerName] = useState("");
  const [perRole, setPerRole] = useState("تأمین‌کننده");
  const [customRole, setCustomRole] = useState("");
  const [isCustomRole, setIsCustomRole] = useState(false);

  // File upload drag state
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const unitPresets = ["عدد", "متر", "کیلوگرم", "شاخه", "دستگاه", "جین", "کارتن", "لیتر", "بسته"];
  const rolePresets = ["تأمین‌کننده", "تحویل‌گیرنده", "سرپرست کارگاه", "بخش مصرف‌کننده", "خریدار"];

  const showAlert = (type: "success" | "error", message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 5000);
  };

  // Product CRUD
  const handleOpenProductCreate = () => {
    setEditingProduct(null);
    
    // Auto generate code from settings.product_prefix
    const prefix = settings?.product_prefix ?? "PR-";
    let maxNum = 100;
    products.forEach(p => {
      if (p.code.startsWith(prefix)) {
        const numPart = p.code.substring(prefix.length);
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    });
    setPCode(`${prefix}${maxNum + 1}`);

    setPName("");
    setPCategory("عمومی");
    setPMinStock("0");
    setPUnit("عدد");
    setIsCustomUnit(false);
    setCustomUnit("");
    setShowProductForm(true);
  };

  const handleOpenProductEdit = (product: Product) => {
    setEditingProduct(product);
    setPCode(product.code);
    setPName(product.name);
    setPCategory(product.category || "عمومی");
    setPMinStock(String(product.min_stock ?? 0));
    if (unitPresets.includes(product.unit)) {
      setPUnit(product.unit);
      setIsCustomUnit(false);
    } else {
      setPUnit("سایر");
      setIsCustomUnit(true);
      setCustomUnit(product.unit);
    }
    setShowProductForm(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalUnit = isCustomUnit ? customUnit.trim() : pUnit;
    if (!pCode.trim() || !pName.trim() || !finalUnit) {
      showAlert("error", "لطفاً تمامی فیلدها را با مقادیر معتبر تکمیل کنید.");
      return;
    }

    const payload = {
      code: pCode.trim(),
      name: pName.trim(),
      unit: finalUnit,
      category: pCategory.trim() || "عمومی",
      min_stock: isNaN(Number(pMinStock)) ? 0 : Number(pMinStock)
    };

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "بروز خطا در برقراری ارتباط با سرور");
      }

      showAlert("success", editingProduct ? "کالا با موفقیت بروزرسانی شد." : "کالای جدید با موفقیت به انبار افزوده شد.");
      setShowProductForm(false);
      onRefreshProducts();
    } catch (err: any) {
      showAlert("error", err.message);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm("آیا از حذف این کالا اطمینان کامل دارید؟ کارهای انبار قدیمی با این کالا آسیب خواهند دید.")) {
      return;
    }
    if (!window.confirm("تأیید مجدد جهت اطمینان نهایی:\nپیرو هشدار قبلی، آیا واقعاً تمایل دارید کالا را به کلی از ساختار سیستم حذف نمایید؟ این عمل پس از بازنویسی تراکنش‌ها قابل بازیابی نیست.")) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "خطا در حذف کالا");
      }

      showAlert("success", "کالا با موفقیت از سیستم حذف گردید.");
      onRefreshProducts();
    } catch (err: any) {
      showAlert("error", err.message);
    }
  };


  // Stakeholder (Persons) CRUD
  const handleOpenPersonCreate = () => {
    setEditingPerson(null);
    setPerName("");
    setPerRole("تأمین‌کننده");
    setIsCustomRole(false);
    setCustomRole("");
    setShowPersonForm(true);
  };

  const handleOpenPersonEdit = (person: Person) => {
    setEditingPerson(person);
    setPerName(person.name);
    if (rolePresets.includes(person.role)) {
      setPerRole(person.role);
      setIsCustomRole(false);
    } else {
      setPerRole("سایر");
      setIsCustomRole(true);
      setCustomRole(person.role);
    }
    setShowPersonForm(true);
  };

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRole = isCustomRole ? customRole.trim() : perRole;
    if (!perName.trim() || !finalRole) {
      showAlert("error", "تکمیل فیلدهای نام و نقش الزامی است.");
      return;
    }

    const payload = {
      name: perName.trim(),
      role: finalRole
    };

    try {
      const url = editingPerson ? `/api/persons/${editingPerson.id}` : "/api/persons";
      const method = editingPerson ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "بروز خطا");
      }

      showAlert("success", editingPerson ? "پروفایل شخص با موفقیت تصحیح شد." : "شخص/سازمان جدید به بانک اطلاعات اضافه شد.");
      setShowPersonForm(false);
      onRefreshPersons();
    } catch (err: any) {
      showAlert("error", err.message);
    }
  };

  const handleDeletePerson = async (id: number) => {
    if (!window.confirm("آیا تمایل دارید اطلاعات این شخص/شرکت را حذف کنید؟")) {
      return;
    }
    if (!window.confirm("تأیید مجدد جهت اطمینان نهایی:\nپیرو هشدار قبلی، آیا واقعاً مایل به حذف پروفایل این شخص/شرکت هستید؟ داده‌های سوابق قدیمی ممکن است فاقد نام طرف حساب شوند.")) {
      return;
    }

    try {
      const res = await fetch(`/api/persons/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "خطا در حذف طرف حساب");
      }

      showAlert("success", "پروفایل شخص با موفقیت حذف گردید.");
      onRefreshPersons();
    } catch (err: any) {
      showAlert("error", err.message);
    }
  };


  // Excel Downloader Template Function
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "کد کالا": "PR-1001",
        "نام کالا": "لوله پنج لایه نیوپایپ سایز ۲۵ میلی‌متر",
        "واحد سنجش": "متر",
        "دسته‌بندی": "لوله و اتصالات",
        "حداقل موجودی": 15
      },
      {
        "کد کالا": "PR-1002",
        "نام کالا": "رابط تبدیلی برنجی روپیچ نیوپایپ",
        "واحد سنجش": "عدد",
        "دسته‌بندی": "لوله و اتصالات",
        "حداقل موجودی": 5
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الگو کالاها");
    Xsc: XLSX.writeFile(wb, "inventory-products-template.xlsx");
    showAlert("success", "فایل نمونه الگو برای وارد کردن اکسل کالاها دانلود شد.");
  };

  // Excel Bulk Import parser
  const parseExcelAndUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse raw rows
        const rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        if (rawRows.length === 0) {
          throw new Error("فایل اکسل ارسالی فاقد ردیف داده می‌باشد.");
        }

        // Standardize mapping
        const formattedProducts = rawRows.map((r, i) => {
          const code = r["کد کالا"] || r["کد_کالا"] || r["code"] || r["Code"];
          const name = r["نام کالا"] || r["نام_کالا"] || r["name"] || r["Name"];
          const unit = r["واحد سنجش"] || r["واحد_سنجش"] || r["unit"] || r["Unit"] || "عدد";
          const category = r["دسته‌بندی"] || r["دستهبندی"] || r["دسته بندی"] || r["category"] || r["Category"] || "عمومی";
          const minStockRaw = r["حداقل موجودی"] || r["حداقل_موجودی"] || r["min_stock"] || r["MinStock"] || r["minStock"] || 0;
          const min_stock = isNaN(Number(minStockRaw)) ? 0 : Number(minStockRaw);

          if (!code || !name) {
            throw new Error(`خطا در ردیف شماره ${i + 2}: فیلدهای کد کالا و نام کالا الزامی هستند.`);
          }

          return {
            code: String(code).trim(),
            name: String(name).trim(),
            unit: String(unit).trim(),
            category: String(category).trim(),
            min_stock
          };
        });

        // Send to Server API Bulk Insert
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formattedProducts)
        });

        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || "آپلود فایل با شکست مواجه شد.");
        }

        showAlert("success", `تعداد ${formattedProducts.length} قلم کالا با موفقیت بارگذاری و با انبار همگام‌سازی شد.`);
        onRefreshProducts();
      } catch (err: any) {
        showAlert("error", `خطا در وارد کردن فایل اکسل: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Handle excel drag events and file selections
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension === "xlsx" || extension === "xls") {
        parseExcelAndUpload(file);
      } else {
        showAlert("error", "تنها فایل‌های اکسل با فرمت .xlsx یا .xls مجاز هستند.");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseExcelAndUpload(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">اطلاعات پایه سیستم انبارداری</h2>
          <p className="text-slate-500 text-sm mt-1">مدیریت لیست کالاها، تعاریف واحد سنجش کالا و طرف‌های حساب (اشخاص و پروژه‌ها)</p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200/30">
          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "products" ? "bg-white text-[#15803d] shadow-xs font-bold" : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>مدیریت کالاها</span>
          </button>
          <button
            onClick={() => setActiveTab("persons")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "persons" ? "bg-white text-[#15803d] shadow-xs font-bold" : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>مدیریت اشخاص</span>
          </button>
        </div>
      </div>

      {/* Global Toast Alert banner */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-4 rounded-xl flex items-start gap-3 shadow-md ${
              alert.type === "success" 
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {alert.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="text-sm font-medium">{alert.message}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Contents: PRODUCTS TAB */}
      {activeTab === "products" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main List Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-200/70 overflow-hidden self-start">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">کاتالوگ کالاها ({products.length} قلم کالا)</h3>
              <button
                onClick={handleOpenProductCreate}
                className="flex items-center gap-1 bg-[#15803d] hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن کالای جدید</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              {products.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <PackageMinus className="w-14 h-14 mx-auto mb-3 stroke-[1.5]" />
                  <h4 className="font-bold text-slate-600">هنوز کالایی ایجاد نشده است!</h4>
                  <p className="text-xs text-slate-400 mt-1">شما می‌توانید به صورت تکی یا دسته‌جمعی از طریق بارگذاری اکسل کالاهای خود را تعریف کنید.</p>
                </div>
              ) : (
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-[#fcfafa] border-b border-stone-200 text-stone-550 font-bold text-xs uppercase">
                      <th className="py-3 px-4 h-12 w-12 text-center text-[11px]">ردیف</th>
                      <th className="py-3 px-4 w-28 text-center border-l border-stone-150/40 text-[11px]">کد کالا</th>
                      <th className="py-3 px-4 text-[11px]">عنوان کامل کالا</th>
                      <th className="py-3 px-4 w-32 border-r border-stone-150/40 text-center text-[11px]">دسته‌بندی موضوعی</th>
                      <th className="py-3 px-4 w-24 border-r border-stone-150/40 text-center text-[11px]">واحد</th>
                      <th className="py-3 px-4 w-24 border-r border-stone-150/40 text-center text-[11px]">حد سفارش</th>
                      <th className="py-3 px-4 w-24 text-left text-[11px]">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm">
                    {products.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-4 text-center text-stone-400 text-xs font-mono">{idx + 1}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-stone-600 bg-[#fbfbf9] border-l border-stone-100/40">{p.code}</td>
                        <td className="py-3 px-4 font-semibold text-stone-850">{p.name}</td>
                        <td className="py-3 px-4 text-center border-r border-stone-100/40">
                          <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-[#15803d] rounded-full text-[10px] font-bold border border-emerald-200/20">
                            {p.category || "عمومی"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-stone-500 border-r border-stone-100/40 text-xs font-medium">{p.unit}</td>
                        <td className="py-3 px-4 text-center font-mono text-stone-600 border-r border-stone-100/40 font-bold text-xs">{p.min_stock ?? 0}</td>
                        <td className="py-3 px-4 text-left">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenProductEdit(p)}
                              className="p-1.5 text-[#15803d] hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="ویرایش کالا"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id!)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف کالا"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Sider forms & Excel Upload */}
          <div className="space-y-6">
            {/* Create Product card form */}
            {showProductForm && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/70 space-y-4"
              >
                <h3 className="text-md font-bold text-slate-800 border-b border-stone-100 pb-3">
                  {editingProduct ? "ویرایش کالا" : "ثبت و تعریف کالای جدید"}
                </h3>

                <form onSubmit={handleSaveProduct} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">کد اختصاصی کالا</label>
                    <input
                      type="text"
                      required
                      value={pCode}
                      onChange={(e) => setPCode(e.target.value)}
                      placeholder="مانند: PR-112"
                      className="w-full text-right px-3 py-2 border border-stone-255 focus:outline-none focus:ring-2 focus:ring-[#15803d] outline-none text-sm rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">نام و مشخصات فنی کالا</label>
                    <input
                      type="text"
                      required
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                      placeholder="مثال: بست دو پا نمره ۱۶ گالوانیزه"
                      className="w-full text-right px-3 py-2 border border-stone-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#15803d] font-semibold text-stone-750"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">دسته‌بندی موضوعی کالا</label>
                    <input
                      type="text"
                      required
                      value={pCategory}
                      onChange={(e) => setPCategory(e.target.value)}
                      placeholder="مثال: لوله و اتصالات"
                      className="w-full text-right px-3 py-2 border border-stone-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#15803d] font-semibold text-stone-750"
                    />
                    {products.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {Array.from(new Set(products.map(p => p.category || "عمومی"))).filter(c => c !== "عمومی" && c !== pCategory).slice(0, 5).map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setPCategory(cat)}
                            className="text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full transition-colors border border-stone-200/50 cursor-pointer"
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">حداقل موجودی (نقطه سفارش)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={pMinStock}
                      onChange={(e) => setPMinStock(e.target.value)}
                      placeholder="مثلا: 10"
                      className="w-full text-right px-3 py-2 border border-stone-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#15803d] font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 mb-1.5">واحد سنجش</label>
                      <select
                        value={pUnit}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPUnit(val);
                          setIsCustomUnit(val === "سایر");
                        }}
                        className="w-full text-right px-3 py-2 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-[#15803d] outline-none text-stone-700 cursor-pointer"
                      >
                        {unitPresets.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                        <option value="سایر">سایر (تایپ دستی)...</option>
                      </select>
                    </div>

                    {isCustomUnit && (
                      <div>
                        <label className="block text-xs font-semibold text-stone-500 mb-1.5">تایپ نام واحد</label>
                        <input
                          type="text"
                          required
                          value={customUnit}
                          onChange={(e) => setCustomUnit(e.target.value)}
                          placeholder="مانند: شاخه"
                          className="w-full text-right px-3 py-2 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-[#15803d] outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-[#15803d] hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      ذخیره‌سازی اطلاعات
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowProductForm(false)}
                      className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      بستن
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Excel Drag and drop box */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/70 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="text-md font-bold text-slate-800">ورود دسته‌جمعی اقلام (اکسل)</h3>
                <button
                  onClick={handleDownloadTemplate}
                  className="text-xs text-[#15803d] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  title="دانلود فایل الگوی نمونه"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>دانلود فایل الگو</span>
                </button>
              </div>

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center ${
                  isDragActive 
                    ? "bg-emerald-50/60 border-emerald-400 text-emerald-800" 
                    : "bg-stone-50/55 border-stone-200 hover:bg-stone-50/80 text-stone-500 hover:border-stone-300"
                }`}
              >
                <Upload className="w-10 h-10 mb-2 stroke-[1.5] text-stone-455" />
                <p className="text-xs font-semibold text-stone-700">فایل اکسل خود را اینجا رها کنید</p>
                <p className="text-[10px] text-stone-400 mt-1">یا برای انتخاب فایل کلیک کنید (.xlsx)</p>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".xlsx, .xls"
                  className="hidden"
                />
              </div>

              <div className="bg-[#f0f9f4] p-4 rounded-xl text-[11px] text-[#15502c] leading-relaxed space-y-1 border border-emerald-100/40">
                <div className="flex items-start gap-1 font-bold">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#15803d]" />
                  <span>راهنمای آپلود به انبار:</span>
                </div>
                <p>ستون‌های فایل اکسل را به ترتیب با هدرهای <strong className="font-bold underline text-[#1b2a21]">کد کالا</strong>، <strong className="font-bold underline text-[#1b2a21]">نام کالا</strong>، <strong className="font-bold underline text-[#1b2a21]">واحد سنجش</strong>، <strong className="font-bold underline text-[#1b2a21]">دسته‌بندی</strong> و <strong className="font-bold underline text-[#1b2a21]">حداقل موجودی</strong> مرتب کرده و ذخیره نمایید.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: PERSONS TAB */}
      {activeTab === "persons" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main List Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-200/70 overflow-hidden self-start">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">بانک اطلاعات اشخاص و ذینفعان ({persons.length} شخص)</h3>
              <button
                onClick={handleOpenPersonCreate}
                className="flex items-center gap-1 bg-[#15803d] hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>تعریف شخص/سازمان جدید</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              {persons.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Users className="w-14 h-14 mx-auto mb-3 stroke-[1.5]" />
                  <h4 className="font-bold text-slate-600">پروفایل شخصی اضافه نشده است!</h4>
                  <p className="text-xs text-slate-400 mt-1">افراد مسئول دریافت کالا یا پیمانکاران تأمین‌کننده را اضافه کنید.</p>
                </div>
              ) : (
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-[#fcfafa] border-b border-stone-200 text-stone-500 font-bold text-xs uppercase">
                      <th className="py-3 px-6 h-12 w-14">ردیف</th>
                      <th className="py-3 px-6">نام کامل شخص یا سازمان</th>
                      <th className="py-3 px-6 w-48 text-center border-r border-l border-stone-100">نوع نقش سیستم</th>
                      <th className="py-3 px-6 w-28 text-left">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm">
                    {persons.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-6 text-stone-400 text-xs font-mono">{idx + 1}</td>
                        <td className="py-3 px-6 font-bold text-slate-800">{p.name}</td>
                        <td className="py-3 px-6 text-center border-r border-l border-stone-100/30">
                          <span className="px-2.5 py-1 text-xs font-semibold bg-stone-100 text-stone-600 rounded-full">
                            {p.role}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-left">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenPersonEdit(p)}
                              className="p-1.5 text-[#15803d] hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="ویرایش مشخصات"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePerson(p.id!)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف مشخصات"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Person Form Column */}
          <div className="space-y-6">
            {showPersonForm && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/70 space-y-4"
              >
                <h3 className="text-md font-bold text-slate-800 border-b border-stone-100 pb-3">
                  {editingPerson ? "ویرایش مشخصات نقش" : "ثبت و تعریف پرسنل/سازمان جدید"}
                </h3>

                <form onSubmit={handleSavePerson} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">نام و نام خانوادگی / نام شرکت</label>
                    <input
                      type="text"
                      required
                      value={perName}
                      onChange={(e) => setPerName(e.target.value)}
                      placeholder="مثال: مهندس حسن‌زاده - مجری طرح برق"
                      className="w-full text-right px-3 py-2 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-[#15803d] outline-none font-semibold text-slate-750"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 mb-1.5">نوع نقش شغلی/سیستمی</label>
                      <select
                        value={perRole}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPerRole(val);
                          setIsCustomRole(val === "سایر");
                        }}
                        className="w-full text-right px-3 py-2 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-[#15803d] outline-none text-slate-750 cursor-pointer"
                      >
                        {rolePresets.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                        <option value="سایر">سایر (تایپ اختیاری)...</option>
                      </select>
                    </div>

                    {isCustomRole && (
                      <div>
                        <label className="block text-xs font-semibold text-stone-500 mb-1.5">تایپ عنوان نقش</label>
                        <input
                          type="text"
                          required
                          value={customRole}
                          onChange={(e) => setCustomRole(e.target.value)}
                          placeholder="مانند: ناظر کارفرما"
                          className="w-full text-right px-3 py-2 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-[#15803d] outline-none text-slate-750"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-[#15803d] hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      ثبت طرف حساب
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPersonForm(false)}
                      className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      لغو
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-100/50 space-y-2">
              <div className="flex items-start gap-1.5 font-bold text-amber-800 text-xs">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                <span>محدودیت حذف منطقی:</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                برای تضمین اعتبار موازنه تاریخی انبار، اشخاصی که دارای سند ثبت شده (ورود یا خروج) هستند را نمی‌توانید حذف کنید. ابتدا اسناد مربوط به ایشان را لغو کنید.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
