import * as XLSX from "xlsx";
import { Contractor, Machine } from "../types";

export function exportContractorsToExcel(contractors: Contractor[]) {
  const data = contractors.map((c, idx) => ({
    "ردیف": idx + 1,
    "نام پیمانکار": c.name,
    "زمینه فعالیت": c.activity_field,
    "کارکرد ناخالص (ریال)": c.total_gross || 0,
    "سپرده حسن انجام کار ۱۰٪ (ریال)": c.total_retention || 0,
    "سپرده حق بیمه ۵٪ (ریال)": c.total_insurance || 0,
    "کارکرد خالص (ریال)": c.total_net || 0,
    "مجموع پرداخت ناخالص (ریال)": c.total_paid || 0,
    "مانده تراز نهایی (ریال)": c.remaining_balance || 0,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 8 },
    { wch: 30 },
    { wch: 25 },
    { wch: 22 },
    { wch: 25 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "پیمانکاران");
  XLSX.writeFile(wb, `contractors-report-${new Date().toISOString().split("T")[0]}.xlsx`);
}

export function exportMachineryToExcel(machinery: Machine[]) {
  const data = machinery.map((m, idx) => ({
    "ردیف": idx + 1,
    "مالک دستگاه": m.owner_name,
    "نوع ماشین‌آلات": m.machine_type,
    "پلاک شهربانی": m.license_plate,
    "نوع قرارداد": m.contract_type === "hourly" ? "ساعتی" : "روزانه/ماهانه",
    "نرخ پایه اجاره (ریال)": m.base_rent || 0,
    "مجموع کارکرد ثبت‌شده": m.total_performance || 0,
    "کل هزینه کارکرد محاسبه‌شده (ریال)": m.total_calculated || 0,
    "مجموع کل پرداختی‌ها (ریال)": m.total_paid || 0,
    "باقیمانده طلب مالک (ریال)": m.remaining_balance || 0,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 8 },
    { wch: 20 },
    { wch: 25 },
    { wch: 20 },
    { wch: 15 },
    { wch: 20 },
    { wch: 18 },
    { wch: 26 },
    { wch: 22 },
    { wch: 22 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ماشین‌آلات");
  XLSX.writeFile(wb, `machinery-report-${new Date().toISOString().split("T")[0]}.xlsx`);
}
