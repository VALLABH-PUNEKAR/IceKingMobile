import React, { useState, useMemo, useCallback } from "react";
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
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import api from "@/api/api";

/* ============================================================
   IceKing — Orders Screen (React Native / Expo, TypeScript)
   Connected to Spring Boot OrderController (/order/user)
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

/* ---------------- Types matching OrderResponseDTO & OrderItemResponseDTO ---------------- */
export type BackendOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type OrderItemResponseDTO = {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt?: string;
};

export type OrderResponseDTO = {
  id: number;
  orderNumber: string;
  userId: number;
  subtotal: number;
  taxAmount: number;
  shippingFee: number;
  totalAmount: number;
  orderStatus: BackendOrderStatus;
  paymentStatus: PaymentStatus;
  shippingAddressSnapshot?: string;
  createdAt: string;
  updatedAt?: string;
  orderItems: OrderItemResponseDTO[];
};

type FilterKey = "All" | "Active" | "Completed" | "Cancelled";

type OrdersScreenProps = {
  navigation?: { navigate: (screen: string) => void };
};

const FILTERS: FilterKey[] = ["All", "Active", "Completed", "Cancelled"];

const STATUS_STYLE: Record<
  BackendOrderStatus,
  { label: string; bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  PENDING: { label: "Pending", bg: "#FFF6DE", text: "#B8860B", icon: "time-outline" },
  CONFIRMED: { label: "Confirmed", bg: "#E9F3FF", text: "#2E7BC7", icon: "checkmark-circle-outline" },
  PREPARING: { label: "Preparing", bg: "#FFF6DE", text: "#B8860B", icon: "time-outline" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", bg: "#E9F3FF", text: "#2E7BC7", icon: "bicycle-outline" },
  DELIVERED: { label: "Delivered", bg: "#E8FAF0", text: "#2E9E5B", icon: "checkmark-circle-outline" },
  CANCELLED: { label: "Cancelled", bg: "#FFF0F0", text: "#E4574A", icon: "close-circle-outline" },
};

function matchesFilter(status: BackendOrderStatus, filter: FilterKey): boolean {
  if (filter === "All") return true;
  if (filter === "Active")
    return status === "PENDING" || status === "CONFIRMED" || status === "PREPARING" || status === "OUT_FOR_DELIVERY";
  if (filter === "Completed") return status === "DELIVERED";
  return status === "CANCELLED";
}

export default function OrdersScreen({ navigation }: OrdersScreenProps) {
  const { width } = useWindowDimensions();
  const scale = (size: number): number => (width / 375) * size;

  const [orders, setOrders] = useState<OrderResponseDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<FilterKey>("All");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get<OrderResponseDTO[]>("/order/user");
      if (response?.data) {
        setOrders(response.data);
      }
    } catch (error: any) {
      console.error("Fetch orders error:", error?.response?.data || error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const filteredOrders = useMemo(
    () => orders.filter((o) => matchesFilter(o.orderStatus, filter)),
    [orders, filter]
  );

  const itemsSummary = (items: OrderItemResponseDTO[]) => {
    if (!items || items.length === 0) return "No items";
    return items
      .map((i) => `${i.productName}${i.quantity > 1 ? ` x${i.quantity}` : ""}`)
      .join(", ");
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greetingSmall, { fontSize: scale(13) }]}>Track your treats</Text>
            <Text style={[styles.greetingName, { fontSize: scale(21) }]}>My Orders</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={fetchOrders}>
            <Ionicons name="refresh" size={18} color={COLORS.ink} />
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
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

        {/* Orders Content */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.pink} />
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={{ fontSize: scale(56) }}>🍦</Text>
            <Text style={[styles.emptyTitle, { fontSize: scale(16) }]}>
              No {filter.toLowerCase()} orders
            </Text>
            <Text style={[styles.emptySubtitle, { fontSize: scale(12.5) }]}>
              Your {filter === "All" ? "" : filter.toLowerCase()} orders will show up here.
            </Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {filteredOrders.map((order) => {
              const statusStyle = STATUS_STYLE[order.orderStatus] || STATUS_STYLE.PENDING;
              const canReorder = order.orderStatus === "DELIVERED" || order.orderStatus === "CANCELLED";

              return (
                <TouchableOpacity
                  key={order.id || order.orderNumber}
                  style={styles.orderCard}
                  activeOpacity={0.85}
                >
                  <View style={styles.orderTop}>
                    <View style={styles.orderEmojiCircle}>
                      <Text style={{ fontSize: scale(18) }}>🍦</Text>
                    </View>

                    <View style={styles.orderInfo}>
                      <Text style={[styles.orderId, { fontSize: scale(13.5) }]}>
                        {order.orderNumber || `#IK-${order.id}`}
                      </Text>
                      <Text style={[styles.orderDate, { fontSize: scale(11.5) }]}>
                        {formatDate(order.createdAt)}
                      </Text>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Ionicons name={statusStyle.icon} size={12} color={statusStyle.text} />
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {statusStyle.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.orderItems, { fontSize: scale(12.5) }]} numberOfLines={1}>
                    {itemsSummary(order.orderItems)}
                  </Text>

                  <View style={styles.orderBottom}>
                    <Text style={[styles.orderTotal, { fontSize: scale(15) }]}>
                      ${Number(order.totalAmount ?? 0).toFixed(2)}
                    </Text>
                    {canReorder ? (
                      <TouchableOpacity
                        style={styles.reorderBtn}
                        onPress={() => navigation?.navigate?.("Home")}
                      >
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

  loadingWrap: { paddingVertical: 60, alignItems: "center", justifyContent: "center" },
  emptyWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 30 },
  emptyTitle: { fontWeight: "900", color: COLORS.ink, marginTop: 10 },
  emptySubtitle: { fontWeight: "600", color: COLORS.inkLight, marginTop: 4, textAlign: "center" },
});