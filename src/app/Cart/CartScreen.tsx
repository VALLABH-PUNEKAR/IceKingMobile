import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ScrollView,
  useWindowDimensions,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "@/components/CartPage/CartStyles";
import { COLORS } from "@/components/CartPage/CartColors";
import { useFocusEffect } from "@react-navigation/native";
import api from "@/api/api";

export type CartItem = {
  id: number;   
  image: string;       
  productId: number;   
  productName: string; 
  price: number;       
  quantity: number;   
};

export type CartsEntity = {
  id: number;          
  userId: number;      
  items: CartItem[];   
};

const DELIVERY_FEE = 2.5;
const PROMO_CODE = "SCOOP10";
const PROMO_DISCOUNT_RATE = 0.1;

type CartScreenProps = {
  navigation?: { navigate: (screen: string) => void; goBack?: () => void };
};

export default function CartScreen({ navigation }: CartScreenProps) {
  const { width } = useWindowDimensions();
  const scale = (size: number): number => (width / 375) * size;

  const [cart, setCart] = useState<CartsEntity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState("");

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await api.get<CartsEntity>("/cart/user");
      if (response?.data) {
        setCart(response.data);
      }
    } catch (error: any) {
      console.error("Fetch cart error:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [])
  );

  const updateQty = async (productId: number, delta: number) => {
    const item = cart?.items.find((cartItem) => cartItem.productId === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeItem(item.id);
      return;
    }

    setCart((prevCart) => {
      if (!prevCart) return null;
      return {
        ...prevCart,
        items: prevCart.items.map((cartItem) =>
          cartItem.productId === productId
            ? { ...cartItem, quantity: newQty }
            : cartItem
        ),
      };
    });

    try {
      await api.put("/cart/update", {
        productId: Number(productId),
        quantity: Number(newQty),
      });
    } catch (error: any) {
      console.error("Update qty error:", error);
      fetchCart();
    }
  };

  const removeItem = async (cartItemId: number) => {
    setCart((prevCart) => {
      if (!prevCart) return null;
      return {
        ...prevCart,
        items: prevCart.items.filter((item) => item.id !== cartItemId),
      };
    });

    try {
      await api.delete(`/cart/item/${cartItemId}`);
    } catch (error) {
      console.error("Remove item error:", error);
      fetchCart();
    }
  };

  const clearCart = async () => {
    try {
      setCart({ id: cart?.id || 0, userId: cart?.userId || 0, items: [] });
      await api.delete("/cart/clear");
    } catch (error) {
      console.error("Clear cart error:", error);
      fetchCart();
    }
  };

  const applyPromo = () => {
    if (promo.trim().toUpperCase() === PROMO_CODE) {
      setAppliedPromo(promo.trim().toUpperCase());
      setPromoError("");
    } else {
      setAppliedPromo(null);
      setPromoError("That code isn't valid.");
    }
  };

  const itemsList = cart?.items || [];
  const isEmpty = itemsList.length === 0;

  const subtotal = useMemo(() => {
    if (!itemsList.length) return 0;
    return itemsList.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  }, [itemsList]);

  const discount = appliedPromo ? subtotal * PROMO_DISCOUNT_RATE : 0;
  const total = Math.max(0, subtotal + (!isEmpty ? DELIVERY_FEE : 0) - discount);

  return (
    <SafeAreaView style={[styles.safe, { flex: 1 }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation?.goBack?.()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scale(18) }]}>My Cart</Text>
        <TouchableOpacity
          onPress={clearCart}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          disabled={isEmpty}
        >
          <Text style={[styles.clearText, isEmpty && { opacity: 0.3 }]}>Clear</Text>
        </TouchableOpacity>
      </View>

      {isEmpty ? (
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: scale(64) }}>🍦</Text>
          <Text style={[styles.emptyTitle, { fontSize: scale(17) }]}>Your cart is empty</Text>
          <Text style={[styles.emptySubtitle, { fontSize: scale(13) }]}>
            Add a scoop or two to get started!
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => navigation?.navigate?.("Home")}
          >
            <Text style={styles.emptyBtnText}>Browse Flavors</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Root container split into Scrollable Content + Fixed Sticky Bottom Bar */
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Cart Items */}
            <View style={styles.itemsWrap}>
              {itemsList.map((item, index) => {
                const imageUrl = item.image?.trim();
                const hasValidImage =
                  imageUrl &&
                  (imageUrl.startsWith("http") ||
                    imageUrl.startsWith("file") ||
                    imageUrl.startsWith("data"));

                return (
                  <View
                    key={item.productId || item.id || index}
                    style={styles.itemCard}
                  >
                    <View
                      style={[
                        styles.itemImage,
                        { backgroundColor: "#FFF3D6", overflow: "hidden" },
                      ]}
                    >
                      {hasValidImage ? (
                        <Image
                          source={{ uri: imageUrl }}
                          style={{ width: "100%", height: "100%", borderRadius: 12 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={{ fontSize: scale(30) }}>🍦</Text>
                      )}
                    </View>

                    <View style={styles.itemInfo}>
                      <Text
                        style={[styles.itemName, { fontSize: scale(14) }]}
                        numberOfLines={1}
                      >
                        {item.productName || "Flavor"}
                      </Text>
                      <Text style={[styles.itemPrice, { fontSize: scale(14) }]}>
                        ${Number(item.price ?? 0).toFixed(2)}
                      </Text>

                      <View style={styles.qtyRow}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => updateQty(item.productId, -1)}
                        >
                          <Ionicons name="remove" size={14} color={COLORS.ink} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => updateQty(item.productId, 1)}
                        >
                          <Ionicons name="add" size={14} color={COLORS.ink} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeItem(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#E4574A" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* Promo code */}
            <View style={styles.promoWrap}>
              <View style={styles.promoInputWrap}>
                <Ionicons name="pricetag-outline" size={16} color={COLORS.lavender} />
                <TextInput
                  style={styles.promoInput}
                  placeholder="Promo code"
                  placeholderTextColor={COLORS.inkLight}
                  value={promo}
                  onChangeText={setPromo}
                  autoCapitalize="characters"
                />
              </View>
              <TouchableOpacity style={styles.promoBtn} onPress={applyPromo}>
                <Text style={styles.promoBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
            {!!promoError && <Text style={styles.promoError}>{promoError}</Text>}
            {!!appliedPromo && (
              <Text style={styles.promoSuccess}>🎉 "{appliedPromo}" applied — 10% off!</Text>
            )}

            {/* Order summary */}
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryTitle, { fontSize: scale(15) }]}>Order Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text style={styles.summaryValue}>${DELIVERY_FEE.toFixed(2)}</Text>
              </View>
              {appliedPromo && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: COLORS.mint }]}>Discount</Text>
                  <Text style={[styles.summaryValue, { color: "#2E9E5B" }]}>
                    -${discount.toFixed(2)}
                  </Text>
                </View>
              )}
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.totalLabel]}>Total</Text>
                <Text style={[styles.summaryValue, styles.totalValue]}>
                  ${total.toFixed(2)}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Sticky Sticky Bottom Checkout Bar (Outside ScrollView) */}
          <View style={styles.checkoutBar}>
            <View>
              <Text style={styles.checkoutLabel}>Total</Text>
              <Text style={[styles.checkoutTotal, { fontSize: scale(18) }]}>
                ${total.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity style={styles.checkoutBtn} activeOpacity={0.85}>
              <Text style={[styles.checkoutBtnText, { fontSize: scale(15) }]}>
                Checkout
              </Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}