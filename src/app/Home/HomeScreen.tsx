import React, { useEffect, useState } from "react";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  FlatList,
  useWindowDimensions,
  StatusBar,
  ListRenderItem,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/components/HomePage/Colors";
import { styles } from "@/components/HomePage/Styles";
import api from "@/api/api";
import Header from "@/components/HomePage/Header";
import type { Flavor } from "@/components/Flavor";

/* ============================================================
   IceKing — Customer Home Screen (React Native / Expo, TypeScript)
   Same theme as the web landing page + Login screen:
   candy gradients, rounded cards, playful copy.

   Fixes applied in this version:
     1. price (BigDecimal on the backend) can arrive as null or,
        in edge cases, a string — every numeric field is coerced
        with Number(x ?? 0) BEFORE it's stored in state, so
        renderFlavor never calls .toFixed() on a non-number.
        That crash was happening during render, outside the
        fetch try/catch, which is why nothing showed and no
        error/alert ever appeared.
     2. fetchProducts/fetchCategory now defend against the API
        returning a wrapper object (e.g. { content: [...] } from
        a paginated Spring endpoint) instead of a raw array.
     3. Category filtering compared cat.id against
        item.categoryName (an id never equals a name, so every
        non-"All" tap emptied the list). Filtering now compares
        category NAME to category NAME consistently.

   Dependencies (install in your Expo project):
     npx expo install expo-linear-gradient @expo/vector-icons
   ============================================================ */

/* ---------------- Types ---------------- */
type Category = {
  id: string;
  name: string;
  avatar: string;
};
const AllCategory: Category = {
  id: "0",
  name: "All",
  avatar: "🍨",
};
interface HomeScreenProps {
  name: string;
}

/* ----------------------------------------------------------
   Helpers: make the API response safe to render no matter
   what shape it comes back as, or what's null inside it.
---------------------------------------------------------- */
function extractArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    // Common Spring Data wrapper shapes.
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.content)) return obj.content as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
  }
  return [];
}

function sanitizeProduct(p: Partial<Flavor>): Flavor {
  return {
    id: p.id ?? "",
    name: p.name ?? "",
    slug: p.slug ?? "",
    categoryName: p.categoryName ?? "",
    description: p.description ?? "",
    image: p.image ?? "",
    price: Number(p.price ?? 0),
    discountPrice: Number(p.discountPrice ?? 0),
    qty: Number(p.qty ?? 0),
    isActive: p.isActive ?? true,
  };
}

export default function HomeScreen({ name }: HomeScreenProps) {
  const navigation = useNavigation<
    NavigationProp<{ Product: { product: Flavor } }>
  >();
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;
  const numColumns = isTablet ? 3 : 2;
  const scale = (size: number): number => (width / 375) * size;
  const gridPadding = 20;
  const gridGap = 16;
  const cardWidth = (width - gridPadding * 2 - gridGap * (numColumns - 1)) / numColumns;

  const [category, setCategory] = useState<Category[]>([AllCategory]);
  // Tracks the category NAME now ("All", "Cones", ...), not the id —
  // this is what actually gets compared against item.categoryName below.
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch] = useState<string>("");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [products, setProducts] = useState<Flavor[]>([]);

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const response = await api.get("/category/info");
        const list = extractArray<Category>(response.data);
        setCategory([AllCategory, ...list]);
      } catch (error: any) {
        alert("Server Error");
      }
    };

    const fetchProducts = async () => {
      try {
        const response = await api.get("/products/all");
        const list = extractArray<Flavor>(response.data).map(sanitizeProduct);
        setProducts(list);
      } catch (error: any) {
        alert("Server Error");
      }
    };

    fetchProducts();
    fetchCategory();
  }, []);

  const toggleFavorite = (id: string | number) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const openProduct = (item: Flavor) => {
    // Pass the whole sanitized Flavor object — ViewProductScreen
    // reads it directly, no refetch needed.
    navigation?.navigate("Product", { product: item });
  };
  const filteredProducts = products.filter((item) => {
    const itemName = item?.name ? String(item.name).toLowerCase() : "";
    const searchTerm = search ? String(search).toLowerCase() : "";
    const matchesSearch = itemName.includes(searchTerm);

    const itemCategory = item?.categoryName ? String(item.categoryName).toLowerCase() : "";
    const activeCatLower = activeCategory ? String(activeCategory).toLowerCase() : "";

    const matchesCategory = activeCatLower === "all" ? true : itemCategory === activeCatLower;

    return matchesSearch && matchesCategory;
  });

  const renderFlavor: ListRenderItem<Flavor> = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => openProduct(item)}
      style={[styles.flavorCard, { width: cardWidth }]}
    >
      <View style={[styles.flavorImageWrap, { backgroundColor: "#FFF3D6" }]}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={{ width: "100%", height: "100%" }} />
        ) : (
          <Text style={{ fontSize: scale(36) }}>🍦</Text>
        )}
        <TouchableOpacity
          style={styles.favBtn}
          onPress={() => toggleFavorite(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={favorites[item.id] ? "heart" : "heart-outline"}
            size={16}
            color={COLORS.pink}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.flavorInfo}>
        <Text style={[styles.flavorName, { fontSize: scale(13.5) }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.ratingRow}>
          <Text style={styles.ratingText}>{item.categoryName}</Text>
        </View>
        <View style={styles.priceRow}>
          {/* price is already coerced to a number by sanitizeProduct,
              but Number(... ?? 0) here is a last line of defense in
              case a future API change bypasses the fetch sanitizer. */}
          <Text style={[styles.priceText, { fontSize: scale(15) }]}>
            ₹{Number(item.price ?? 0).toFixed(2)}
          </Text>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ---------- Header ---------- */}
        <Header name={name} scale={scale} />

        {/* ---------- Search ---------- */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={COLORS.inkLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your favorite flavor..."
            placeholderTextColor={COLORS.inkLight}
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="options-outline" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* ---------- Promo banner ---------- */}
        <LinearGradient
          colors={[COLORS.pink, COLORS.lavender]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { fontSize: scale(17) }]}>Buy 2 Get 1 FREE! 🎉</Text>
            <Text style={[styles.bannerSubtitle, { fontSize: scale(12) }]}>
              On all cups & cones, today only
            </Text>
            <TouchableOpacity style={styles.bannerBtn}>
              <Text style={styles.bannerBtnText}>Order Now</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: scale(56) }}>🍦</Text>
        </LinearGradient>

        {/* ---------- Categories ---------- */}
        <Text style={[styles.sectionTitle, { fontSize: scale(16) }]}>Categories</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {category.map((cat) => {
            // Compare by NAME now — activeCategory stores a name, not an id.
            const active = cat.name.toLowerCase() === activeCategory.toLowerCase();
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setActiveCategory(cat.name)}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
              >
                <Text style={{ fontSize: 16 }}>{cat.avatar}</Text>
                <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ---------- Popular flavors ---------- */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { fontSize: scale(16) }]}>Popular Flavors</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredProducts}
          key={numColumns}
          numColumns={numColumns}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderFlavor}
          scrollEnabled={false}
          columnWrapperStyle={{ justifyContent: "flex-start", gap: gridGap, paddingHorizontal: gridPadding }}
          contentContainerStyle={{ gap: gridGap, marginTop: 4 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No flavors match "{search}" 🍦</Text>
          }
        />
      </ScrollView>

      {/* ---------- Bottom tab bar ---------- */}
    </SafeAreaView>
  );
}
