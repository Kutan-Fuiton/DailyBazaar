import client from "./client";
import type { Friend, UserTagSearchResult } from "../types";

export const friendsApi = {
  getMyTag: () => client<{ tag: string; username: string; email: string }>("/users/me/tag"),

  searchByTag: (tag: string) =>
    client<UserTagSearchResult>(`/users/search-tag?tag=${encodeURIComponent(tag)}`),

  listFriends: () => client<Friend[]>("/users/me/friends"),

  addFriend: (data: { tag?: string; friend_id?: number }) =>
    client<{ message: string; friend: Friend }>("/users/me/friends", {
      method: "POST",
      body: data,
    }),

  removeFriend: (friendId: number) =>
    client<{ message: string }>(`/users/me/friends/${friendId}`, {
      method: "DELETE",
    }),
};
