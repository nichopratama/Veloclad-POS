export type FieldType = 'text' | 'textarea' | 'number' | 'money' | 'checkbox' | 'email' | 'select';

export interface FieldDef {
  key: string;                 // nama field DB, mis. 'category_id'
  label: string;               // label ID, mis. 'Kategori'
  type: FieldType;
  required?: boolean;
  defaultValue?: string | number | boolean;
  nullable?: boolean;          // kosong → kirim null
  showInTable?: boolean;       // tampil sebagai kolom tabel
  // khusus type 'select' (foreign key):
  optionsEndpoint?: string;    // mis. '/api/library/categories'
  optionLabelKey?: string;     // 'name'
  optionValueKey?: string;     // 'id'
}

export interface EntityConfig {
  key: string;                 // 'items'
  label: string;               // 'Produk'
  endpoint: string;            // '/api/library/items'
  paginated: boolean;          // items=true; lainnya=false
  searchable: boolean;         // payment-types=false; lainnya=true
  mutateRoles: 'admin' | 'all';// create+update: 'all'=semua login (customers); 'admin'=owner/admin
  fields: FieldDef[];          // urutan render form + kolom tabel
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface FlatResponse<T> {
  data: T[];
}

/** Nilai form yang mungkin (scalar) — pengganti `any`. */
export type FormValue = string | number | boolean | null;

/** Satu baris entitas dari API. Kolom scalar bertipe `unknown` (di-narrow saat render). */
export interface EntityRow {
  id: number | string;
  [key: string]: unknown;
}

/** Bentuk response GET library (flat atau paginated). */
export interface LibraryListResponse {
  data: EntityRow[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
