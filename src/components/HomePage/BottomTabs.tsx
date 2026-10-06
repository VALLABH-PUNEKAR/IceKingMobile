import { Ionicons } from "@expo/vector-icons";
export type BottomTab = "Home" | "Cart" | "Orders" | "favorites" | "Profile";
export const BOTTOM_TABS: { key: BottomTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "Home", label: "Home", icon: "home" },
  { key: "Cart", label: "Cart", icon: "cart-outline" },
  { key: "Orders", label: "Orders", icon: "receipt-outline" },
  { key: "Profile", label: "Profile", icon: "person-outline" },
];