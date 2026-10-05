import client from "./client";
import type {
  DashboardSummary,
  TrendEntry,
  TopItem,
  PriceWatchItem,
  ProfileStats,
  MonthlyForecast,
  InflationEntry,
  PriceAlertDetails,
} from "../types";

export interface DashboardOverview {
  summary: DashboardSummary;
  top_items: TopItem[];
  price_map: PriceWatchItem[];
  recent_hauls: import("../types").Transaction[];
  inflation: InflationEntry[];
  alerts: PriceAlertDetails;
}

export const dashboardApi = {
  overview: (includeDetails: boolean = true) =>
    client<{ success: boolean; data: DashboardOverview }>(
      `/dashboard/overview${includeDetails ? "?include_details=true" : ""}`
    ),

  summary: () =>
    client<{ success: boolean; data: DashboardSummary }>("/dashboard/summary"),

  trends: () =>
    client<{ success: boolean; data: TrendEntry[] }>("/dashboard/trends"),

  topItems: () =>
    client<{ success: boolean; data: TopItem[] }>("/dashboard/top-items"),

  priceMap: () =>
    client<{ success: boolean; data: PriceWatchItem[] }>("/dashboard/price-map"),

  profileStats: () =>
    client<ProfileStats>("/users/me/stats"),

  forecast: () =>
    client<{ success: boolean; data: MonthlyForecast }>("/dashboard/forecast"),

  inflationIndex: () =>
    client<{ success: boolean; data: InflationEntry[] }>("/dashboard/inflation-index"),

  priceAlerts: () =>
    client<{ success: boolean; data: PriceAlertDetails }>("/dashboard/price-alerts"),
};

