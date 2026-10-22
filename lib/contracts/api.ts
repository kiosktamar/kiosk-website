// lib/contracts/api.ts — single source of truth for every API request/response shape.
// Isomorphic: no imports from server-only code.

export type Role = 'STUDENT' | 'ADMIN';
export type OrderStatus = 'PENDING' | 'READY' | 'PAID' | 'CANCELED';
export type StockStatus = 'IN_STOCK' | 'LIMITED' | 'OUT_OF_STOCK';
export type ProductType = 'SINGLE' | 'COMBO';
export type ToppingKind = 'TOPPING' | 'SAUCE';
export type PaymentMethod = 'CASH' | 'VOUCHER';
export type IsoDateString = string; // ISO 8601, UTC

export interface OkResponse {
  ok: true;
}

// ---------- Auth & account ----------
export interface UserDTO {
  id: number;
  phone: string;
  fullName: string;
  role: Role;
}

export interface CheckPhoneRequest {
  phone: string;
}
export interface CheckPhoneResponse {
  exists: boolean;
}
export interface RegisterRequest {
  phone: string;
  fullName: string;
  password: string;
  passwordConfirm: string;
}
export interface LoginRequest {
  phone: string;
  password: string;
}
export interface AuthResponse {
  user: UserDTO;
  isDefaultPassword: boolean;
}
export interface MeResponse {
  user: UserDTO;
}
export interface UpdateAccountRequest {
  fullName: string;
}
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}
export interface ChangeAdminPasswordRequest {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

// ---------- Admin: users ----------
export interface AdminUserDTO {
  id: number;
  fullName: string;
  phone: string;
  isActive: boolean;
  createdAt: IsoDateString;
}
export interface AdminUserSearchResponse {
  user: AdminUserDTO;
}
export interface UpdateUserRequest {
  isActive: boolean;
}

// ---------- Kiosk ----------
export interface KioskStatusDTO {
  open: boolean; // computed: is_open && (closes_at null || closes_at > now)
  closesAt: IsoDateString | null; // only when open and a closing time is set; otherwise null
}
export interface UpdateKioskRequest {
  isOpen: boolean;
  closesAt: IsoDateString | null;
}

// ---------- Menu (student) ----------
export interface MenuToppingDTO {
  id: number;
  name: string;
  kind: ToppingKind;
  extraPriceAgorot: number;
}

export interface MenuComboOptionDTO {
  id: number;
  name: string;
  available: boolean;
}

export interface MenuComboComponentDTO {
  id: number; // ComboComponents.component_id
  slotLabel: string;
  sortOrder: number;
  kind: 'FIXED' | 'CHOICE';
  fixedProduct: {
    id: number;
    name: string;
    available: boolean;
    toppings: MenuToppingDTO[];
  } | null; // FIXED only
  choiceCategoryId: number | null; // CHOICE only
  options: MenuComboOptionDTO[]; // CHOICE only, else []
}

export interface MenuProductDTO {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  priceAgorot: number;
  type: ProductType;
  acceptsVoucher: boolean;
  stockStatus: StockStatus;
  stockCount: number | null; // non-null only when LIMITED
  available: boolean; // server-computed (see 00 §8.4)
  toppings: MenuToppingDTO[]; // SINGLE: associated + available + allowed by category; COMBO: []
  comboComponents: MenuComboComponentDTO[] | null; // COMBO only, sorted by sortOrder; SINGLE: null
}

export interface MenuCategoryDTO {
  id: number;
  name: string;
  sortOrder: number;
  allowsToppings: boolean;
  allowsSauces: boolean;
  products: MenuProductDTO[]; // non-archived, sorted by sortOrder then name
}
export interface MenuResponse {
  categories: MenuCategoryDTO[];
}

// ---------- Orders ----------
export interface OrderComponentSelection {
  componentId: number;
  productId?: number; // CHOICE components: required; FIXED: omit
  toppingIds?: number[]; // FIXED components only; CHOICE: omit or []
}
export interface OrderLineRequest {
  productId: number;
  quantity: number; // 1..5
  paymentMethod: PaymentMethod; // COMBO must be 'CASH'
  toppingIds?: number[]; // SINGLE only
  components?: OrderComponentSelection[]; // COMBO only: exactly one per combo component
}
export interface CreateOrderRequest {
  items: OrderLineRequest[];
}

export interface OrderItemToppingDTO {
  toppingId: number;
  name: string;
  extraPriceAgorot: number;
}
export interface OrderItemDTO {
  id: number;
  productId: number;
  productName: string;
  unitPriceAgorot: number;
  quantity: number;
  paymentMethod: PaymentMethod | null; // null on combo child lines
  lineTotalAgorot: number;
  toppings: OrderItemToppingDTO[];
  components: OrderItemDTO[]; // combo child lines (sorted by component order); [] otherwise
}
export interface OrderDTO {
  id: number;
  code: string;
  status: OrderStatus;
  totalAgorot: number;
  cashDueAgorot: number;
  voucherCount: number;
  createdAt: IsoDateString;
  readyAt: IsoDateString | null;
  closedAt: IsoDateString | null;
  items: OrderItemDTO[]; // top-level lines in creation order
}
export interface AdminOrderDTO extends OrderDTO {
  student: { id: number; fullName: string };
}

export interface CreateOrderResponse {
  order: OrderDTO;
}
export interface MyOrdersResponse {
  open: OrderDTO[];
  recentClosed: OrderDTO[];
}
export interface AdminOrdersResponse {
  orders: AdminOrderDTO[];
}
export interface UpdateOrderStatusRequest {
  to: 'READY' | 'PAID' | 'CANCELED';
}
export interface UpdateOrderStatusResponse {
  order: AdminOrderDTO;
}

// ---------- Admin: products & toppings ----------
export interface AdminToppingDTO {
  id: number;
  name: string;
  kind: ToppingKind;
  extraPriceAgorot: number;
  isAvailable: boolean;
  sortOrder: number;
}
export interface AdminComboComponentDTO {
  id: number;
  slotLabel: string;
  sortOrder: number;
  fixedProductId: number | null;
  choiceCategoryId: number | null;
}
export interface AdminProductDTO {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  priceAgorot: number;
  type: ProductType;
  acceptsVoucher: boolean;
  stockStatus: StockStatus;
  stockCount: number | null;
  sortOrder: number;
  toppingIds: number[]; // SINGLE: associated toppings and sauces; COMBO: []
  comboComponents: AdminComboComponentDTO[]; // COMBO: sorted; SINGLE: []
}
export interface AdminCategoryDTO {
  id: number;
  name: string;
  sortOrder: number;
  allowsToppings: boolean;
  allowsSauces: boolean;
  products: AdminProductDTO[]; // non-archived only
}
export interface AdminProductsResponse {
  categories: AdminCategoryDTO[];
  toppings: AdminToppingDTO[];
}
export interface AdminProductResponse {
  product: AdminProductDTO;
}
export interface AdminToppingResponse {
  topping: AdminToppingDTO;
}

export interface CreateProductRequest {
  categoryId: number;
  name: string;
  priceAgorot: number;
  productType?: ProductType; // default 'SINGLE'
  description?: string | null;
}
export interface UpdateProductRequest {
  // at least one field
  priceAgorot?: number;
  stockStatus?: StockStatus;
  stockCount?: number; // required when stockStatus becomes LIMITED
  acceptsVoucher?: boolean;
  isArchived?: true; // archiving is one-way; false is rejected
}
export interface SetProductToppingsRequest {
  toppingIds: number[];
}
export interface SetComboComponentsRequest {
  components: {
    slotLabel: string;
    fixedProductId: number | null;
    choiceCategoryId: number | null;
  }[];
}
export interface CreateToppingRequest {
  name: string;
  kind: ToppingKind;
  extraPriceAgorot: number;
}
export interface UpdateToppingRequest {
  name?: string;
  extraPriceAgorot?: number;
  isAvailable?: boolean;
}

// ---------- Stats ----------
export interface StatsDayDTO {
  date: string; // 'YYYY-MM-DD' in Asia/Jerusalem
  orders: number;
  vouchers: number;
  cashAgorot: number;
  avgPrepMinutes: number | null;
}
export interface StatsResponse {
  today: StatsDayDTO; // today's row (zeros and null when no paid orders today)
  topProducts: { productName: string; units: number; revenueAgorot: number }[]; // last 7 days, max 5
  daily: StatsDayDTO[]; // last 14 days, newest first, only days with paid orders
}
