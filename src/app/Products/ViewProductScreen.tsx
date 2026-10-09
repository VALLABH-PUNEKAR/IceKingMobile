import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  useWindowDimensions,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "@/components/ViewProductsPage/ProductStyle";
import { COLORS } from "@/components/ViewProductsPage/ProductColors";
import api from "@/api/api";
import { formatSLMError, useNotificationGenerator } from "@/middleware/notification";

/* ============================================================
   Opens when a product card on Home is tapped. Shows the full
   detail for a single Flavor — same type as HomeScreen.tsx, so
   the whole object can be passed straight through, no refetch
   needed (though a refetch-by-id path is noted below too).

   The action at the bottom adds the selected quantity to the cart.

   Wiring into HomeScreen.tsx:
     1. Wrap the card's outer <View> in renderFlavor with a
        TouchableOpacity that navigates on press:

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate("ViewProduct", { product: item })}
          >
            <View style={[styles.flavorCard, { width: cardWidth }]}>
              ...unchanged...
            </View>
          </TouchableOpacity>

        Keep the existing favorite TouchableOpacity inside it —
        nested touchables work fine in RN, the inner one just
        needs its own onPress (already does) so the tap doesn't
        also trigger the outer card's navigation... actually it
        WILL bubble unless you stop it. Add this to the favorite
        button's onPress to stop the outer navigation from firing:

          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(item.id);
          }}

     2. Register the screen (React Navigation stack example):
          <Stack.Screen name="ViewProduct" component={ViewProductScreen} />

     3. Read the param in ViewProductScreen via your navigator's
        route typing, e.g.:
          const { product } = route.params;
        This file accepts `product` as a direct prop instead, so
        it also works with simple state-based navigation (see
        the AddProduct/VendorProducts pattern used earlier).
   ============================================================ */



/* ---------------- Type — identical to HomeScreen's Flavor ---------------- */
type Flavor = {
  id: string | number;
  name: string;
  slug: string;
  categoryName: string;
  description: string;
  image: string;
  price: number;
  discountPrice: number;
  qty: number;
  isActive: boolean;
};

type ViewProductScreenProps = {
  product: Flavor;
  navigation?: { goBack?: () => void; navigate?: (screen: string, params?: any) => void };
  isFavorite?: boolean;
  onToggleFavorite?: (id: string | number) => void;
};

export default function ViewProductScreen({
  product,
  navigation,
  isFavorite = false,
  onToggleFavorite,
}: ViewProductScreenProps) {
  const { generateAndNotify, isReady, isGenerating } = useNotificationGenerator()
  const { width } = useWindowDimensions();
  const scale = (size: number): number => (width / 375) * size;

  const [quantity, setQuantity] = useState(1);
  const [favorite, setFavorite] = useState(isFavorite);
  const [loading, setLoading] = useState(false);
  const saveToCartApi = async (qtyToSave: number) => {
    try {
      setLoading(true);
      await api.post("/cart/add", {
        productId: product.id,
        quantity: qtyToSave,
      });
      return true;
    } catch (error: any) {
      console.error("Cart save error:", error?.response?.data || error);
      Alert.alert("Error", error?.response?.data?.message || "Failed to add item to cart");
      return false;
    } finally {
      setLoading(false);
    }
  };
  // price / discountPrice are already guaranteed numeric by HomeScreen's
  // sanitizeProduct step, but these guards protect this screen even if
  // it's ever opened with raw/unsanitized data from elsewhere.
  const price = Number(product?.price ?? 0);
  const discountPrice = Number(product?.discountPrice ?? 0);
  const hasDiscount = discountPrice > 0 && discountPrice < price;
  const displayPrice = hasDiscount ? discountPrice : price;

  const inStock = Number(product?.qty ?? 0) > 0 && product?.isActive !== false;
  const maxQty = Math.max(1, Number(product?.qty ?? 1));

  const toggleFavorite = () => {
    setFavorite((v) => !v);
    onToggleFavorite?.(product.id);
  };

  const handleAddToCart = async () => {
    
    const success = await saveToCartApi(quantity);
    if (success) {
      if (isReady) {
          generateAndNotify(
            {
          scenario: "Cart & Purchase Intent",
          product: product?.name || "Ice Cream",
          category: product?.categoryName || "Dessert",
          customer_type: "New",
          user_activity: "Adding to Cart",
          time_of_day: "Afternoon",
          day_type: "Weekday",
          season: "Winter",
          weather: "Cold",
          discount: hasDiscount ? `${Math.round(((price - discountPrice) / price) * 100)}%` : "0%",
          urgency: "Medium",
          tone: "Exciting",
          emoji: "🍦",
        },
          
          
          `Added ${product?.name} to your cart!`
          )
          .then(({ notification }) => {
          console.log("SLM Notification Output:", notification);
        })
        .catch((err) => {
          const reason = formatSLMError(err);
          console.warn("Notification generation failed:", reason);
          Alert.alert("Notification generation failed", reason);
        });
      } else {
      console.warn("SLM not ready yet — skipping notification");
      }
      
      Alert.alert("Success 🍦", `${product.name} added to your cart!`, [
        { text: "View Cart", onPress: () => navigation?.navigate?.("Main", { screen: "Cart" }) },
        { text: "Keep Browsing", style: "cancel" },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* ---------- Image header ---------- */}
        <View style={styles.imageWrap}>
          {product?.image ? (
            <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={{ fontSize: scale(72) }}>🍦</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation?.goBack?.()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.favBtn}
            onPress={toggleFavorite}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={favorite ? "heart" : "heart-outline"}
              size={20}
              color={COLORS.pink}
            />
          </TouchableOpacity>

          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>
                {Math.round(((price - discountPrice) / price) * 100)}% OFF
              </Text>
            </View>
          )}
        </View>

        {/* ---------- Details card ---------- */}
        <View style={styles.detailsCard}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{product?.categoryName || "Flavor"}</Text>
              </View>
              <Text style={[styles.name, { fontSize: scale(22) }]}>{product?.name}</Text>
            </View>

            <View style={[styles.stockBadge, inStock ? styles.stockBadgeIn : styles.stockBadgeOut]}>
              <Text style={[styles.stockText, inStock ? styles.stockTextIn : styles.stockTextOut]}>
                {inStock ? "In Stock" : "Out of Stock"}
              </Text>
            </View>
          </View>

          {/* Price row */}
          <View style={styles.priceRow}>
            <Text style={[styles.price, { fontSize: scale(24) }]}>₹{displayPrice.toFixed(2)}</Text>
            {hasDiscount && (
              <Text style={[styles.originalPrice, { fontSize: scale(15) }]}>₹{price.toFixed(2)}</Text>
            )}
          </View>

          {/* Description */}
          {!!product?.description && (
            <>
              <Text style={[styles.sectionLabel, { fontSize: scale(13) }]}>About this flavor</Text>
              <Text style={[styles.description, { fontSize: scale(13.5) }]}>{product.description}</Text>
            </>
          )}

          {/* Quantity selector */}
          <Text style={[styles.sectionLabel, { fontSize: scale(13) }]}>Quantity</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              disabled={quantity <= 1}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Ionicons name="remove" size={16} color={COLORS.ink} />
            </TouchableOpacity>
            <Text style={[styles.qtyValue, { fontSize: scale(16) }]}>{quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              disabled={quantity >= maxQty}
              onPress={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            >
              <Ionicons name="add" size={16} color={COLORS.ink} />
            </TouchableOpacity>

            {inStock && (
              <Text style={[styles.stockHint, { fontSize: scale(11.5) }]}>
                {product.qty} available
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ---------- Sticky action bar ---------- */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomTotalWrap}>
          <Text style={styles.bottomLabel}>Total</Text>
          <Text style={[styles.bottomTotal, { fontSize: scale(17) }]}>
            ₹{(displayPrice * quantity).toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addToCartBtn, !inStock && styles.btnDisabled]}
          activeOpacity={0.85}
          disabled={!inStock}
          onPress={handleAddToCart}
        >
          <Ionicons name="cart-outline" size={17} color={COLORS.pink} />
          <Text style={[styles.addToCartText, { fontSize: scale(13.5) }]}>Add to Cart</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}
