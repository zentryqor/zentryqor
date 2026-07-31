/** Client-safe notification category catalogue (shared by UI + server). */
export const PUSH_CATEGORIES = [
  {
    key: "new_assets",
    label: "New assets",
    description: "A new pack or template lands in the vault.",
  },
  {
    key: "ai_ready",
    label: "AI results ready",
    description: "Captions, thumbnails or generations finish rendering.",
  },
  {
    key: "scheduled_posts",
    label: "Scheduled posts",
    description: "A scheduled post publishes, fails, or needs review.",
  },
  {
    key: "credits",
    label: "Credits & limits",
    description: "Daily credits reset or run low.",
  },
  {
    key: "referrals",
    label: "Referrals",
    description: "Someone joins with your invite and bonuses land.",
  },
  {
    key: "billing",
    label: "Billing",
    description: "Payments, renewals, and plan changes.",
  },
  {
    key: "product_updates",
    label: "Product updates",
    description: "New tools and releases from Zentry Qor.",
  },
] as const;

export type PushCategory = (typeof PUSH_CATEGORIES)[number]["key"];

export const PUSH_CATEGORY_KEYS = PUSH_CATEGORIES.map((c) => c.key) as PushCategory[];

export type PushPreferences = Record<PushCategory, boolean> & {
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
};

export const DEFAULT_PUSH_PREFERENCES: PushPreferences = {
  new_assets: true,
  ai_ready: true,
  scheduled_posts: true,
  credits: true,
  referrals: true,
  billing: true,
  product_updates: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
};

export type PushConfig = {
  configured: boolean;
  apiKey: string;
  projectId: string;
  appId: string;
  messagingSenderId: string;
  vapidKey: string;
};
