import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import api from "@/api/api";
import { styles } from "@/components/ConfirmOrderPage/ConfirmOrderStyle";
import { COLORS } from "@/components/ConfirmOrderPage/ConfirmOrderColors";
import { formatSLMError, useNotificationGenerator } from "@/middleware/notification";

/* ============================================================
   IceKing — Confirm Order Screen (React Native / Expo, TypeScript)
   Opens when "Checkout" is tapped on the Cart screen.

   Two phases on one screen:
     1. REVIEW  — shows the cart (GET /cart/user), collects the
                  delivery address, and places the order with
                  POST /order/checkout  { shippingAddressSnapshot }
     2. SUCCESS — shows the OrderResponseDTO the server returns
                  (order number, status, items, tax, shipping,
                  total). These are the REAL numbers calculated by
                  the backend, so they're what the customer sees
                  as final.

   Types below mirror your Java DTOs:
     CreateOrderRequest   -> { shippingAddressSnapshot: string }
     OrderResponseDTO     -> OrderResponse
     OrderItemResponseDTO -> OrderItemResponse
   BigDecimal fields are coerced with Number(x ?? 0) so a null or
   string value can never crash .toFixed() during render.

   Wiring:
     CartScreen checkout button:
         onPress={() => navigation?.navigate?.("COrder")}
     Register it in a ROOT stack (above the tab navigator), the
     same place as "ViewProduct":
         <Stack.Screen name="COrder" component={ConfirmOrderScreen} />
   ============================================================ */



/* ---------------- Types ---------------- */
type CartItem = {
  id: number;
  image: string;
  productId: number;
  productName: string;
  price: number;
  quantity: number;
};

type CartResponse = {
  id: number;
  userId: number;
  items: CartItem[];
};

// Mirrors OrderItemResponseDTO
type OrderItemResponse = {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt: string;
};

// Mirrors OrderResponseDTO (enums arrive as strings)
type OrderResponse = {
  id: number;
  orderNumber: string;
  userId: number;
  subtotal: number;
  taxAmount: number;
  shippingFee: number;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  shippingAddressSnapshot: string;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItemResponse[];
};

type ConfirmOrderScreenProps = {
  navigation?: { navigate: (screen: string) => void; goBack?: () => void };
};

/* ---------------- Helpers ---------------- */
function sanitizeOrder(o: Partial<OrderResponse>): OrderResponse {
  return {
    id: Number(o.id ?? 0),
    orderNumber: o.orderNumber ?? "",
    userId: Number(o.userId ?? 0),
    subtotal: Number(o.subtotal ?? 0),
    taxAmount: Number(o.taxAmount ?? 0),
    shippingFee: Number(o.shippingFee ?? 0),
    totalAmount: Number(o.totalAmount ?? 0),
    orderStatus: o.orderStatus ?? "",
    paymentStatus: o.paymentStatus ?? "",
    shippingAddressSnapshot: o.shippingAddressSnapshot ?? "",
    createdAt: o.createdAt ?? "",
    updatedAt: o.updatedAt ?? "",
    orderItems: (o.orderItems ?? []).map((i) => ({
      id: Number(i.id ?? 0),
      productId: Number(i.productId ?? 0),
      productName: i.productName ?? "Flavor",
      quantity: Number(i.quantity ?? 0),
      unitPrice: Number(i.unitPrice ?? 0),
      subtotal: Number(i.subtotal ?? 0),
      createdAt: i.createdAt ?? "",
    })),
  };
}

// Values must come from the model's training vocabulary.
function getTimeContext(): { time_of_day: string; day_type: string } {
  const now = new Date();
  const h = now.getHours();
  const time_of_day = h < 12 ? "Morning" : h < 17 ? "Afternoon" : h < 21 ? "Evening" : "Night";
  const day_type = [0, 6].includes(now.getDay()) ? "Weekend" : "Weekday";
  return { time_of_day, day_type };
}

function formatDateTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// "OUT_FOR_DELIVERY" -> "Out For Delivery"
function prettyLabel(value: string): string {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Enum values aren't known here, so tone is picked by keyword.
function statusTone(value: string): { bg: string; text: string } {
  const v = (value || "").toUpperCase();
  if (/(PAID|CONFIRM|DELIVER|COMPLETE|SUCCESS)/.test(v)) return { bg: "#E8FAF0", text: "#2E9E5B" };
  if (/(CANCEL|FAIL|REFUND)/.test(v)) return { bg: "#FFF0F0", text: "#E4574A" };
  return { bg: "#FFF6DE", text: "#B8860B" }; // pending / processing / unknown
}

export default function ConfirmOrderScreen({ navigation }: ConfirmOrderScreenProps) {
  const { generateAndNotify, isReady } = useNotificationGenerator();
  const { width } = useWindowDimensions();
  const scale = (size: number): number => (width / 375) * size;

  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loadingCart, setLoadingCart] = useState(true);
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<OrderResponse | null>(null);

  const fetchCart = async () => {
    try {
      setLoadingCart(true);
      const response = await api.get<CartResponse>("/cart/user");
      setCart(response.data);
    } catch (error: any) {
      console.error("Fetch cart error:", error);
    } finally {
      setLoadingCart(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Once the order is placed the cart is no longer relevant here.
      if (!order) fetchCart();
    }, [order])
  );

  const items = cart?.items ?? [];
  const isEmpty = items.length === 0;

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.price ?? 0) * Number(i.quantity ?? 0), 0),
    [items]
  );

  const notifyOrderPlaced = (placed: OrderResponse) => {
    if (!isReady) {
      console.warn("SLM not ready yet — skipping notification");
      return;
    }

    const productName = placed.orderItems[0]?.productName || items[0]?.productName || "Ice Cream";
    const { time_of_day, day_type } = getTimeContext();

    generateAndNotify(
      {
        scenario: "Transactional",
        product: productName,
        category: "Ice Cream",
        customer_type: "Returning",
        user_activity: "Order Placed",
        time_of_day,
        day_type,
        season: "Winter",
        weather: "Cold",
        discount: "0%",
        urgency: "Low",
        tone: "Warm",
        emoji: "🍦",
      },
      `Order ${placed.orderNumber || `#${placed.id}`} placed! We're getting your treats ready 🍦`
    )
      .then(({ notification }) => {
        console.log("SLM Notification Output:", notification);
      })
      .catch((err) => {
        console.warn("Notification generation failed:", formatSLMError(err));
      });
  };

  const placeOrder = async () => {
    const trimmed = address.trim();
    if (trimmed.length < 5) {
      setAddressError("Please enter your full delivery address.");
      return;
    }
    setAddressError("");

    try {
      setSubmitting(true);
      // CreateOrderRequest
      const payload = { shippingAddressSnapshot: trimmed };
      const response = await api.post<OrderResponse>("/order/checkout", payload);
      const placed = sanitizeOrder(response.data);
      setOrder(placed);
      notifyOrderPlaced(placed);
    } catch (err: any) {
      if (err.response) {
        Alert.alert(
          "Couldn't place order",
          err.response.data?.message ?? `The server rejected the request (${err.response.status}).`
        );
      } else {
        Alert.alert(
          "Can't reach server",
          `Check that the backend is running and BASE_URL (${api.defaults.baseURL}) is correct.`
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ====================== SUCCESS PHASE ====================== */
  if (order) {
    const orderTone = statusTone(order.orderStatus);
    const payTone = statusTone(order.paymentStatus);

    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
          <View style={styles.successTop}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={42} color={COLORS.white} />
            </View>
            <Text style={[styles.successTitle, { fontSize: scale(22) }]}>Order Placed! 🎉</Text>
            <Text style={[styles.successSubtitle, { fontSize: scale(13) }]}>
              Thanks for ordering with IceKing. We're getting your treats ready.
            </Text>
          </View>

          {/* Order meta */}
          <View style={styles.card}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Order number</Text>
              <Text style={styles.metaValue}>{order.orderNumber || `#${order.id}`}</Text>
            </View>
            {!!order.createdAt && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Placed on</Text>
                <Text style={styles.metaValue}>{formatDateTime(order.createdAt)}</Text>
              </View>
            )}
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Order status</Text>
              <View style={[styles.badge, { backgroundColor: orderTone.bg }]}>
                <Text style={[styles.badgeText, { color: orderTone.text }]}>
                  {prettyLabel(order.orderStatus)}
                </Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Payment</Text>
              <View style={[styles.badge, { backgroundColor: payTone.bg }]}>
                <Text style={[styles.badgeText, { color: payTone.text }]}>
                  {prettyLabel(order.paymentStatus)}
                </Text>
              </View>
            </View>
          </View>

          {/* Items */}
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.card}>
            {order.orderItems.map((item, i) => (
              <View
                key={item.id || i}
                style={[styles.orderItemRow, i < order.orderItems.length - 1 && styles.rowBorder]}
              >
                <View style={styles.orderItemEmoji}>
                  <Text style={{ fontSize: 20 }}>🍦</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderItemName} numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <Text style={styles.orderItemSub}>
                    {item.quantity} × ${item.unitPrice.toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.orderItemTotal}>${item.subtotal.toFixed(2)}</Text>
              </View>
            ))}
          </View>

          {/* Delivery address */}
          <Text style={styles.sectionTitle}>Delivering to</Text>
          <View style={[styles.card, styles.addressRow]}>
            <Ionicons name="location-outline" size={18} color={COLORS.lavender} />
            <Text style={styles.addressText}>{order.shippingAddressSnapshot}</Text>
          </View>

          {/* Totals — real numbers from the backend */}
          <View style={[styles.card, { marginTop: 14 }]}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${order.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>${order.taxAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>${order.shippingFee.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${order.totalAmount.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.successActions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() => navigation?.navigate?.("Orders")}
            >
              <Text style={styles.primaryBtnText}>View My Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.85}
              onPress={() => navigation?.navigate?.("Home")}
            >
              <Text style={styles.secondaryBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ====================== REVIEW PHASE ====================== */
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation?.goBack?.()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          disabled={submitting}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scale(18) }]}>Confirm Order</Text>
        <View style={{ width: 36 }} />
      </View>

      {loadingCart ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.pink} />
        </View>
      ) : isEmpty ? (
        <View style={styles.centerWrap}>
          <Text style={{ fontSize: scale(56) }}>🍦</Text>
          <Text style={styles.emptyTitle}>Nothing to order</Text>
          <Text style={styles.emptySubtitle}>Your cart is empty. Add a scoop first!</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 18, paddingHorizontal: 28 }]}
            onPress={() => navigation?.navigate?.("Home")}
          >
            <Text style={styles.primaryBtnText}>Browse Flavors</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Delivery address */}
            <Text style={styles.sectionTitle}>Delivery address</Text>
            <View style={[styles.card, styles.addressInputCard, !!addressError && styles.inputError]}>
              <Ionicons
                name="location-outline"
                size={18}
                color={COLORS.lavender}
                style={{ marginTop: 2 }}
              />
              <TextInput
                style={styles.addressInput}
                placeholder="House no., street, area, city, pincode"
                placeholderTextColor={COLORS.inkLight}
                value={address}
                onChangeText={(v) => {
                  setAddress(v);
                  if (addressError) setAddressError("");
                }}
                multiline
                textAlignVertical="top"
                editable={!submitting}
              />
            </View>
            {!!addressError && <Text style={styles.errorText}>{addressError}</Text>}

            {/* Items */}
            <Text style={styles.sectionTitle}>Your items ({items.length})</Text>
            <View style={styles.card}>
              {items.map((item, i) => {
                const imageUrl = item.image?.trim();
                const hasImage =
                  !!imageUrl &&
                  (imageUrl.startsWith("http") ||
                    imageUrl.startsWith("file") ||
                    imageUrl.startsWith("data"));
                return (
                  <View
                    key={item.id || item.productId || i}
                    style={[styles.orderItemRow, i < items.length - 1 && styles.rowBorder]}
                  >
                    <View style={[styles.orderItemEmoji, { overflow: "hidden" }]}>
                      {hasImage ? (
                        <Image
                          source={{ uri: imageUrl }}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={{ fontSize: 20 }}>🍦</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderItemName} numberOfLines={1}>
                        {item.productName || "Flavor"}
                      </Text>
                      <Text style={styles.orderItemSub}>
                        {item.quantity} × ${Number(item.price ?? 0).toFixed(2)}
                      </Text>
                    </View>
                    <Text style={styles.orderItemTotal}>
                      ${(Number(item.price ?? 0) * Number(item.quantity ?? 0)).toFixed(2)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Summary */}
            <View style={[styles.card, { marginTop: 14 }]}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
              </View>
              <Text style={styles.noteText}>
                Tax and delivery fee are calculated when you place the order. You'll see the final
                total on the confirmation.
              </Text>
            </View>
          </ScrollView>

          {/* Bottom bar */}
          <View style={styles.bottomBar}>
            <View>
              <Text style={styles.bottomLabel}>Subtotal</Text>
              <Text style={[styles.bottomTotal, { fontSize: scale(18) }]}>
                ${subtotal.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.placeBtn, submitting && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={placeOrder}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Text style={[styles.placeBtnText, { fontSize: scale(15) }]}>Place Order</Text>
                  <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
