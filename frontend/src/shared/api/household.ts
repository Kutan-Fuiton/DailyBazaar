import client from "./client";
import type {
  Household,
  HouseholdCreate,
  HouseholdMember,
  HouseholdSummary,
  HouseholdSettlement,
  CreateSplitRequest,
} from "../types";

export const householdApi = {
  createHousehold: (name: string) =>
    client<Household>("/households", {
      method: "POST",
      body: JSON.stringify({ name } as HouseholdCreate),
    }),

  listHouseholds: () =>
    client<Household[]>("/households"),

  inviteMember: (householdId: number, identifier: string) =>
    client<HouseholdMember>(`/households/${householdId}/invite`, {
      method: "POST",
      body: JSON.stringify({ identifier }),
    }),

  getSummary: (householdId: number) =>
    client<HouseholdSummary>(`/households/${householdId}/summary`),

  getSettlements: (householdId: number) =>
    client<HouseholdSettlement>(`/households/${householdId}/settlements`),

  splitTransaction: (transactionId: number, data: CreateSplitRequest) =>
    client<{ success: boolean; splits_created: number }>(`/households/transactions/${transactionId}/split`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
