import client from "./client";
import type {
  ShoppingList,
  ShoppingListCreate,
  ListItem,
  ListItemCreate,
  ShoppingListStatus,
  ParseTextResponse,
  FinalizeRequest,
  FinalizeResponse,
} from "../types";

export const shoppingListsApi = {
  list: (status?: string) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return client<ShoppingList[]>(`/shopping-lists${query}`);
  },

  get: (id: number) => client<ShoppingList>(`/shopping-lists/${id}`),

  create: (data: ShoppingListCreate) =>
    client<ShoppingList>("/shopping-lists", { method: "POST", body: data }),

  updateStatus: (id: number, status: ShoppingListStatus) =>
    client<ShoppingList>(`/shopping-lists/${id}/status`, {
      method: "PATCH",
      body: { status },
    }),

  addItem: (listId: number, data: ListItemCreate) =>
    client<ListItem>(`/shopping-lists/${listId}/items`, {
      method: "POST",
      body: data,
    }),

  toggleBought: (listId: number, itemId: number, is_bought: boolean) =>
    client<ListItem>(`/shopping-lists/${listId}/items/${itemId}/bought`, {
      method: "PATCH",
      body: { is_bought },
    }),

  markAllBought: (listId: number) =>
    client<ShoppingList>(`/shopping-lists/${listId}/items/mark-all-bought`, {
      method: "POST",
    }),

  deleteItem: (listId: number, itemId: number) =>
    client<void>(`/shopping-lists/${listId}/items/${itemId}`, {
      method: "DELETE",
    }),

  deleteList: (id: number) =>
    client<void>(`/shopping-lists/${id}`, { method: "DELETE" }),

  finalize: (id: number, data: FinalizeRequest) =>
    client<FinalizeResponse>(`/shopping-lists/${id}/finalize`, {
      method: "POST",
      body: data,
    }),

  parseText: (text: string) =>
    client<ParseTextResponse>("/shopping-lists/parse", {
      method: "POST",
      body: { text },
    }),

  getCollaborators: (listId: number) =>
    client<import("../types").ShoppingListCollaborator[]>(`/shopping-lists/${listId}/collaborators`),

  addCollaborator: (listId: number, data: { tag?: string; friend_id?: number; user_id?: number }) =>
    client<{ message: string; collaborator?: import("../types").ShoppingListCollaborator }>(
      `/shopping-lists/${listId}/collaborators`,
      {
        method: "POST",
        body: data,
      }
    ),

  removeCollaborator: (listId: number, collaboratorUserId: number) =>
    client<{ message: string }>(`/shopping-lists/${listId}/collaborators/${collaboratorUserId}`, {
      method: "DELETE",
    }),
};
