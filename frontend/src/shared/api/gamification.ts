import client from "./client";
import type { UserBadgesResponse } from "../types";

export const gamificationApi = {
  getBadges: () => client<UserBadgesResponse>("/gamification/badges"),
};
