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
};
