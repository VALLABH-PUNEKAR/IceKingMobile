import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  useWindowDimensions,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

/* ============================================================
   IceKing — Orders Screen (React Native / Expo, TypeScript)
   Same theme/conventions as HomeScreen.tsx, CartScreen.tsx and
   ProfileScreen.tsx: candy palette, rounded cards, soft shadows.

   Wiring note (matches your BottomTabs / BottomNavigation /
   MainNavigator setup):
     1. Add "Orders" to BottomTab in BottomTabs.tsx:
          export type BottomTab = "Home" | "Cart" | "Orders" | "favorites" | "Profile";
        and add an entry to BOTTOM_TABS:
          { key: "Orders", label: "Orders", icon: "receipt-outline" }
     2. Add it to MainTabParamList + <Tab.Screen> in MainNavigator.tsx:
          Orders: undefined;
          <Tab.Screen name="Orders" component={OrdersScreen} />
     This file ships with its own COLORS/styles (self-contained,
     like CartScreen/ProfileScreen) — swap in your shared
     "./Colors" and "./Styles" imports if you'd rather centralize.
   ============================================================ */

const COLORS = {
  skyBlue: "#6EC6FF",
  pink: "#FF69B4",
  yellow: "#FFD93D",
  mint: "#7EE8A6",
  lavender: "#B388FF",
  ink: "#5b4a8a",
  inkLight: "#8a7db0",
  white: "#FFFFFF",
  bg: "#FBF9FF",
} as const;

/* ---------------- Types ---------------- */
type OrderStatus = "Preparing" | "Out for Delivery" | "Delivered" | "Cancelled";
type FilterKey = "All" | "Active" | "Completed" | "Cancelled";

type OrderItem = {
  name: string;
  emoji: string;
  qty: number;
};

type Order = {
  id: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
};

type OrdersScreenProps = {
  navigation?: { navigate: (screen: string) => void };
};

/* ---------------- Mock data (swap for a real /orders fetch) ---------------- */
const ORDERS: Order[] = [
  {
    id: "#IK-3025",
    date: "Today, 2:45 PM",
    status: "Out for Delivery",
    items: [
      { name: "Rainbow Scoop", emoji: "🌈", qty: 2 },
      { name: "Chocolate Blast", emoji: "🍫", qty: 1 },
    ],
    total: 16.0,
  },
  {
    id: "#IK-3019",
    date: "Today, 11:20 AM",
    status: "Preparing",
    items: [{ name: "Blueberry Heaven", emoji: "🫐", qty: 1 }],
    total: 4.9,
  },
  {
    id: "#IK-2987",
    date: "Yesterday, 6:10 PM",
    status: "Delivered",
    items: [
      { name: "Vanilla Dream", emoji: "🍦", qty: 2 },
      { name: "Mango Magic", emoji: "🥭", qty: 1 },
    ],
    total: 14.2,
  },
  {
    id: "#IK-2960",
    date: "Mar 2, 1:05 PM",
    status: "Delivered",
    items: [{ name: "Strawberry Swirl", emoji: "🍓", qty: 3 }],
    total: 14.4,
  },
  {
    id: "#IK-2941",
    date: "Feb 27, 5:30 PM",
    status: "Cancelled",
    items: [{ name: "Mint Chip Chill", emoji: "🌿", qty: 1 }],
    total: 4.7,
  },
];

const FILTERS: FilterKey[] = ["All", "Active", "Completed", "Cancelled"];

const STATUS_STYLE: Record<OrderStatus, { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Preparing: { bg: "#FFF6DE", text: "#B8860B", icon: "time-outline" },
  "Out for Delivery": { bg: "#E9F3FF", text: "#2E7BC7", icon: "bicycle-outline" },
  Delivered: { bg: "#E8FAF0", text: "#2E9E5B", icon: "checkmark-circle-outline" },
  Cancelled: { bg: "#FFF0F0", text: "#E4574A", icon: "close-circle-outline" },
};

function matchesFilter(status: OrderStatus, filter: FilterKey): boolean {
  if (filter === "All") return true;
  if (filter === "Active") return status === "Preparing" || status === "Out for Delivery";
  if (filter === "Completed") return status === "Delivered";
  return status === "Cancelled";
}

export default function OrdersScreen({ navigation }: OrdersScreenProps) {
  const { width } = useWindowDimensions();
  const scale = (size: number): number => (width / 375) * size;
  const [filter, setFilter] = useState<FilterKey>("All");

  const filteredOrders = useMemo(
    () => ORDERS.filter((o) => matchesFilter(o.status, filter)),
    [filter]
  );

  const itemsSummary = (items: OrderItem[]) =>
    items.map((i) => `${i.name}${i.qty > 1 ? ` x${i.qty}` : ""}`).join(", ");

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ---------- Header (matches Home's greeting style) ---------- */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greetingSmall, { fontSize: scale(13) }]}>Track your treats</Text>
            <Text style={[styles.greetingName, { fontSize: scale(21) }]}>My Orders</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="search" size={18} color={COLORS.ink} />
          </TouchableOpacity>
        </View>

        {/* ---------- Status filter chips (matches Home's category chips) ---------- */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = f === filter;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ---------- Orders list ---------- */}
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={{ fontSize: scale(56) }}>🍦</Text>
            <Text style={[styles.emptyTitle, { fontSize: scale(16) }]}>No {filter.toLowerCase()} orders</Text>
            <Text style={[styles.emptySubtitle, { fontSize: scale(12.5) }]}>
              Your {filter === "All" ? "" : filter.toLowerCase()} orders will show up here.
            </Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {filteredOrders.map((order) => {
              const statusStyle = STATUS_STYLE[order.status];
              const canReorder = order.status === "Delivered" || order.status === "Cancelled";
              return (
                <TouchableOpacity key={order.id} style={styles.orderCard} activeOpacity={0.85}>
                  <View style={styles.orderTop}>
                    <View style={styles.orderEmojiStack}>
                      {order.items.slice(0, 2).map((item, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.orderEmojiCircle,
                            idx > 0 && { marginLeft: -12 },
                          ]}
                        >
                          <Text style={{ fontSize: scale(18) }}>{item.emoji}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.orderInfo}>
                      <Text style={[styles.orderId, { fontSize: scale(13.5) }]}>{order.id}</Text>
                      <Text style={[styles.orderDate, { fontSize: scale(11.5) }]}>{order.date}</Text>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Ionicons name={statusStyle.icon} size={12} color={statusStyle.text} />
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>{order.status}</Text>
                    </View>
                  </View>

                  <Text style={[styles.orderItems, { fontSize: scale(12.5) }]} numberOfLines={1}>
                    {itemsSummary(order.items)}
                  </Text>

                  <View style={styles.orderBottom}>
                    <Text style={[styles.orderTotal, { fontSize: scale(15) }]}>
                      ${order.total.toFixed(2)}
                    </Text>
                    {canReorder ? (
                      <TouchableOpacity style={styles.reorderBtn}>
                        <Ionicons name="refresh" size={13} color={COLORS.white} />
                        <Text style={styles.reorderText}>Reorder</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.trackBtn}>
                        <Text style={styles.trackText}>Track Order</Text>
                        <Ionicons name="chevron-forward" size={13} color={COLORS.pink} />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 16 : 4,
    paddingBottom: 8,
  },
  greetingSmall: { color: COLORS.inkLight, fontWeight: "600" },
  greetingName: { color: COLORS.ink, fontWeight: "900" },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#B388FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },

  filterRow: { paddingHorizontal: 20, gap: 10, paddingTop: 14, paddingBottom: 4 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: "#EDE7FA",
  },
  filterChipActive: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },
  filterLabel: { color: COLORS.ink, fontWeight: "700", fontSize: 12.5 },
  filterLabelActive: { color: COLORS.white },

  listWrap: { paddingHorizontal: 20, marginTop: 14, gap: 14 },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 14,
    shadowColor: "#B388FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  orderTop: { flexDirection: "row", alignItems: "center" },
  orderEmojiStack: { flexDirection: "row" },
  orderEmojiCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F7F5FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  orderInfo: { flex: 1, marginLeft: 10 },
  orderId: { fontWeight: "800", color: COLORS.ink },
  orderDate: { fontWeight: "600", color: COLORS.inkLight, marginTop: 1 },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: { fontSize: 10.5, fontWeight: "800" },

  orderItems: { color: COLORS.inkLight, fontWeight: "600", marginTop: 10, marginLeft: 2 },

  orderBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F5F2FC",
  },
  orderTotal: { fontWeight: "900", color: COLORS.pink },
  reorderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.lavender,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 14,
  },
  reorderText: { color: COLORS.white, fontWeight: "800", fontSize: 12 },
  trackBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  trackText: { color: COLORS.pink, fontWeight: "800", fontSize: 12.5 },

  emptyWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 30 },
  emptyTitle: { fontWeight: "900", color: COLORS.ink, marginTop: 10 },
  emptySubtitle: { fontWeight: "600", color: COLORS.inkLight, marginTop: 4, textAlign: "center" },
});
