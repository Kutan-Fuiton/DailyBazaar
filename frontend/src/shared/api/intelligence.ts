import client from "./client";
import type {
  MarketComparison,
  PriceForecast,
  RestockSuggestions,
  LocationRecommendationResponse,
  SharePricingResponse,
} from "../types";

export const intelligenceApi = {
  getMarketComparison: (itemId: number, locationId?: number) => {
    const query = locationId ? `?location_id=${locationId}` : "";
    return client<MarketComparison>(`/intelligence/items/${itemId}/market-comparison${query}`);
  },

  getPriceForecast: (itemId: number) =>
    client<PriceForecast>(`/intelligence/items/${itemId}/price-forecast`),

  getRestockSuggestions: () =>
    client<RestockSuggestions>("/intelligence/restock-suggestions"),

  getLocationRecommendations: () =>
    client<LocationRecommendationResponse>("/intelligence/locations/recommendations"),

  toggleSharePricing: (share: boolean) =>
    client<SharePricingResponse>("/intelligence/share-pricing", {
      method: "PATCH",
      body: JSON.stringify({ share }),
    }),

  getPublicMarketRadar: (lat?: number, lng?: number, marketName?: string) => {
    const params = new URLSearchParams();
    if (lat !== undefined && lat !== null) params.append("lat", String(lat));
    if (lng !== undefined && lng !== null) params.append("lng", String(lng));
    if (marketName) params.append("market_name", marketName);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return client<import("../types").PublicMarketRadarResponse>(`/intelligence/public-market${qs}`);
  },
};
