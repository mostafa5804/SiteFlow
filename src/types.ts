export interface Product {
  id?: number;
  code: string;
  name: string;
  unit: string;
  category?: string;
  min_stock?: number;
  current_inventory?: number;
}

export interface Person {
  id?: number;
  name: string;
  role: string;
}

export interface DocumentRow {
  id?: number;
  document_id?: number;
  product_id: number;
  product_code?: string;
  product_name?: string;
  product_unit?: string;
  quantity: number;
}

export interface DocumentHeader {
  id?: number;
  type: "incoming" | "outgoing";
  date: string;
  person_id: number;
  person_name?: string;
  person_role?: string;
  description: string;
  item_count?: number;
  total_quantity?: number;
}

export type DocumentDetail = DocumentHeader & {
  rows: DocumentRow[];
};

export interface Contractor {
  id: number;
  name: string;
  activity_field: string;
  total_gross: number;
  total_retention: number;
  total_insurance: number;
  total_net: number;
  total_paid: number;
  remaining_balance: number;
  initial_amount?: number;
  retention_rate?: number;
  insurance_rate?: number;
  is_tax_and_insurance_exempt?: number;
  has_tax_val?: number;
  contract_no?: string;
  appendix_no?: string;
  contract_start?: string;
  contract_end?: string;
}

export interface ContractorInvoice {
  id: number;
  invoice_number: string;
  gross_amount: number;
  retention_bond: number;
  insurance: number;
  net_amount: number;
}

export interface ContractorPayment {
  id: number;
  payment_date: string;
  amount: number;
  description: string;
}

export interface ContractorProfile extends Contractor {
  invoices: ContractorInvoice[];
  payments: ContractorPayment[];
}

export interface Machine {
  id: number;
  owner_name: string;
  machine_type: string;
  license_plate: string;
  contract_type: 'hourly' | 'daily' | 'monthly';
  base_rent: number;
  total_performance: number;
  total_calculated: number;
  total_paid: number;
  remaining_balance: number;
}

export interface MachinePerformance {
  id: number;
  month_name: string;
  month_index: number;
  performance_value: number;
  total_calculated_amount: number;
}

export interface MachinePayment {
  id: number;
  payment_date: string;
  amount: number;
  description: string;
}

export interface MachineProfile extends Machine {
  performance: MachinePerformance[];
  payments: MachinePayment[];
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean | number;
  date?: string;
  created_at?: string;
}

