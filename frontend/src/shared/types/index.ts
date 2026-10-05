// ── Auth ──────────────────────────────────────────────────
export interface User {
  id: number;
  username: string;
  email: string;
  db_name: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

// ── Items ─────────────────────────────────────────────────
export interface ItemAlias {
  id: number;
  alias: string;
}

export interface Item {
  id: number;
  name: string;
  emoji: string | null;
  description: string | null;
  category: string | null;
  tag: string | null;
  unit: string | null;
  price_per_unit: number | null;
  created_at: string;
  aliases: ItemAlias[];
}

export interface ItemCreate {
  name: string;
  emoji?: string;
  description?: string;
  category?: string;
  tag?: string;
  unit?: string;
  price_per_unit?: number | null;
}

export interface PriceHistoryEntry {
  date: string;
  price: number;
}

// ── Item Intelligence ─────────────────────────────────────
export interface PriceStats {
  current_price: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  min_date: string | null;
  max_date: string | null;
  inflation_pct: number;
}

export interface VendorEntry {
  vendor: string;
  price: number;
  purchase_count: number;
}

export interface CadenceInfo {
  avg_cadence_days: number | null;
  days_since_last: number | null;
  last_purchase_date: string | null;
}

export interface ItemDetails {
  item: Item;
  price_history: PriceHistoryEntry[];
  stats: PriceStats;
  vendor_comparison: VendorEntry[];
  cadence: CadenceInfo;
  purchase_count: number;
  total_spent: number;
}

export interface AIInsights {
  market_timing: string;
  storage_tip: string;
  smart_buy: string;
}

// ── Transactions ──────────────────────────────────────────
export interface TransactionItem {
  id: number;
  name: string;
  qty: number;
  price: number;
  unit: string | null;
  item_id: number | null;
}

export interface Transaction {
  id: number;
  title: string;
  total: number;
  source: "OCR" | "Manual";
  status: "completed" | "pending";
  location_id: number | null;
  created_at: string;
  items: TransactionItem[];
}

export interface TransactionCreate {
  title: string;
  source?: string;
  status?: string;
  location_id?: number | null;
  items: { name: string; qty: number; price: number; unit?: string | null }[];
}

// ── Dashboard ─────────────────────────────────────────────
export interface DashboardSummary {
  total_damage: number;
  total_damage_change_pct: number;
  savings_potential: number;
  active_alerts: number;
  total_items: number;
  most_purchased_item: string | null;
  best_deal_saved: number;
  avg_daily_spend: number;
  total_transactions: number;
  member_since: string | null;
}

export interface TrendEntry {
  day: string;   // "Mon", "Tue", etc.
  date: string;  // ISO date
  amount: number;
}

export interface TopItem {
  id: number | null;
  name: string;
  emoji: string;
  price: number;
  last_bought: string | null;
  tag: string;
  purchase_count: number;
}

export interface PriceWatchItem {
  id: number;
  name: string;
  emoji: string;
  change_pct: number;
  description: string;
  price_history: number[];
}

// ── Profile / Spending DNA ────────────────────────────────
export interface SpendingDnaEntry {
  label: string;
  pct: number;
  color: string;
}

export interface ProfileStats {
  spending_dna: SpendingDnaEntry[];
  price_alerts_active: number;
  share_pricing_data?: boolean;
}

// ── Scan ──────────────────────────────────────────────────
export interface ParsedItem {
  name: string;
  qty: number;
  price: number;
  unit: string | null;
  raw?: string | null;
  display_qty?: string | null;
  normalized_qty?: number | null;
  unit_family?: string | null;
  unit_price?: number | null;
  suggested_price?: number | null;
  suggested_qty?: number | null;
  suggested_unit?: string | null;
}

export interface ScanResponse {
  scan_id: number;
  raw_ocr_text: string;
  parsed_items: ParsedItem[];
  confidence: number;
}

export interface ScanConfirmRequest {
  scan_id: number;
  title: string;
  items: ParsedItem[];
  location_id?: number | null;
  status?: string;
}

// ── Shopping Lists ────────────────────────────────────────
export type ShoppingListStatus = "DRAFT" | "SAVED" | "SHOPPING" | "COMPLETED" | "CANCELLED";

export interface ListItem {
  id: number;
  shopping_list_id: number;
  item_id: number | null;
  name: string;
  quantity: number;
  unit: string | null;
  suggested_price: number | null;
  user_price: number | null;
  is_bought: boolean;
  source: string;
  created_at: string;
  shop?: string | null;
}

export interface ListItemCreate {
  name: string;
  quantity?: number;
  unit?: string | null;
  user_price?: number | null;
  source?: string;
  shop?: string | null;
}

export interface ShoppingList {
  id: number;
  user_id: number;
  title: string;
  status: ShoppingListStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  items: ListItem[];
}

export interface ShoppingListCreate {
  title: string;
  items?: ListItemCreate[];
}

export interface ParseTextRequest {
  text: string;
}

export interface ParsedListItem {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  suggested_price?: number | null;
  suggested_unit?: string | null;
  user_last_price?: number | null;
  market_price?: number | null;
  price?: number | null;
  category?: string | null;
  emoji?: string | null;
  confidence?: "high" | "medium" | "low" | string;
  shop?: string | null;
}

export interface GlobalCatalogItem {
  id: number;
  name: string;
  bengali_name?: string | null;
  hindi_name?: string | null;
  category: string;
  unit: string;
  unit_family?: string | null;
  emoji?: string | null;
  avg_price_kg?: number | null;
  aliases: string[];
}

export interface ParseTextResponse {
  items: ParsedListItem[];
  raw_text: string;
}

export interface FinalizeRequest {
  title?: string | null;
  location_id?: number | null;
  price_overrides?: Record<number, number> | null;
}

export interface FinalizeResponse {
  success: boolean;
  transaction_id: number;
  total: number;
  items_bought: number;
  list_status: string;
}

/** Generic pagination wrapper (for future use) */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Market Intelligence ──────────────────────────────────
export interface MarketComparison {
  item_id: number;
  user_avg_price: number | null;
  market_avg_price: number | null;
  percentile: number | null;
  location_id: number | null;
  sample_size: number;
  savings_pct: number | null;
  status: string;
}

export interface PriceForecast {
  item_id: number;
  current_price: number | null;
  trend: "rising" | "falling" | "stable" | string;
  best_buy_window: string;
  confidence: number;
  projected_price_7d: number | null;
}

export interface RestockItem {
  item_id: number;
  item_name: string;
  emoji: string | null;
  category: string | null;
  avg_interval_days: number;
  days_since_last_purchase: number;
  urgency: "due" | "upcoming" | "stocked";
  last_purchased_at: string | null;
}

export interface RestockSuggestions {
  suggestions: RestockItem[];
  total_due: number;
}

export interface LocationRecommendation {
  location_id: number;
  location_name: string;
  avg_price_delta_pct: number;
  recommendation_score: number;
  cheapest_item_count: number;
  description: string;
}

export interface LocationRecommendationResponse {
  recommendations: LocationRecommendation[];
}

export interface SharePricingResponse {
  share_pricing_data: boolean;
  message: string;
}

// ── Advanced Analytics / Dashboard ───────────────────────
export interface InflationEntry {
  month: string;
  avg_basket_cost: number;
  total_spend: number;
  transaction_count: number;
  change_pct: number;
}

export interface MonthlyForecast {
  days_elapsed: number;
  days_in_month: number;
  remaining_days: number;
  current_total: number;
  projected_total: number;
  avg_daily: number;
  previous_month_total: number;
  pace_pct: number;
  status: "on_pace" | "higher" | "lower" | string;
}

export interface PriceAlertItem {
  item_id: number;
  item_name: string;
  emoji: string;
  alert_type: "spike" | "drop";
  pct_diff: number;
  current_price: number;
  avg_price: number;
  message: string;
}

export interface PriceAlertDetails {
  spike_count: number;
  drop_count: number;
  total_alerts: number;
  alerts: PriceAlertItem[];
}

// ── Household & Expense Splitting ────────────────────────
export interface HouseholdMember {
  id: number;
  user_id: number;
  username: string;
  email: string;
  role: string;
  joined_at: string;
}

export interface Household {
  id: number;
  name: string;
  owner_id: number;
  created_at: string;
  members: HouseholdMember[];
}

export interface HouseholdCreate {
  name: string;
}

export interface MemberSpendBreakdown {
  user_id: number;
  username: string;
  total_paid: number;
  total_owed: number;
  net_balance: number;
}

export interface HouseholdSummary {
  household_id: number;
  household_name: string;
  total_spend: number;
  members_count: number;
  member_breakdown: MemberSpendBreakdown[];
}

export interface SplitItem {
  user_id: number;
  amount_owed: number;
}

export interface CreateSplitRequest {
  household_id?: number | null;
  splits: SplitItem[];
}

export interface ExpenseSplit {
  id: number;
  transaction_id: number;
  user_id: number;
  username: string;
  amount_owed: number;
  settled: boolean;
  created_at: string;
}

export interface SettlementRecord {
  from_user_id: number;
  from_username: string;
  to_user_id: number;
  to_username: string;
  amount: number;
}

export interface HouseholdSettlement {
  household_id: number;
  settlements: SettlementRecord[];
  total_unsettled_amount: number;
}

// ── Gamification ──────────────────────────────────────────
export interface BadgeInfo {
  badge_key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  earned: boolean;
  earned_at: string | null;
}

export interface UserBadgesResponse {
  badges: BadgeInfo[];
  earned_count: number;
  total_count: number;
  current_streak_days: number;
}

