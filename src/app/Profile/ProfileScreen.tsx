import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  useWindowDimensions,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "@/components/ProfilePage/ProfileStyles";
import { COLORS } from "@/components/ProfilePage/ProfileColors";
import api from "@/api/api";
import { removeToken } from "@/utils/tokenStorage";

/* ============================================================
   IceKing — Profile Screen (React Native / Expo, TypeScript)
   Same theme/conventions as HomeScreen.tsx. "Profile" is one of
   the five bottom tabs, so this screen keeps the same tab bar
   (active on "profile") for a consistent navigation feel.

   Dependencies (already used elsewhere in the app):
     npx expo install @expo/vector-icons
   ============================================================ */

/* ---------------- Types ---------------- */

type MenuItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  danger?: boolean;
};

type ProfileUser = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string | null;
};

type ProfileScreenProps = {
 
  navigation?: { navigate: (screen: string) => void };
  
};

const ACCOUNT_ITEMS: MenuItem[] = [
  { key: "orders", label: "My Orders", icon: "receipt-outline", color: "#6EC6FF" },
  { key: "favorites", label: "Favorites", icon: "heart-outline", color: "#FF69B4" },
  { key: "addresses", label: "Delivery Addresses", icon: "location-outline", color: "#7EE8A6" },
  { key: "payments", label: "Payment Methods", icon: "card-outline", color: "#B388FF" },
];

const SUPPORT_ITEMS: MenuItem[] = [
  { key: "notifications", label: "Notifications", icon: "notifications-outline", color: "#FFD93D" },
  { key: "help", label: "Help & Support", icon: "help-circle-outline", color: "#6EC6FF" },
  { key: "settings", label: "Settings", icon: "settings-outline", color: "#8a7db0" },
  { key: "logout", label: "Log Out", icon: "log-out-outline", color: "#E4574A", danger: true },
];



export default function ProfileScreen({ navigation}: ProfileScreenProps) {
  const { width } = useWindowDimensions();
  const scale = (size: number): number => (width / 375) * size;
  const [profile,setProfile]=useState<ProfileUser>()

  const handleLogout=async()=>{
    await removeToken()
    navigation?.navigate?.("Login")

}
  const initials = `${profile?.firstName?.[0] ?? ""}`.toUpperCase();
  useEffect(()=>{
    const fetchProfile=async()=>{
      try{
        const response=await api.get("/cust/profile");
        if(response!=null){
          setProfile(response.data)
        }

      }
      catch(error:any){
         alert("Server Error")

      }
    }
    fetchProfile()

  },[])
  const fullName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() || " ";

  const handleMenuPress = (key: string) => {
    if (key === "logout") {
      Alert.alert("Log Out", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },

        { text: "Log Out", style: "destructive", onPress: () => handleLogout() },
      ]);
      return;
    }
    // Hook each item up to its own screen, e.g. navigation?.navigate(key)
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* ---------- Header ---------- */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { fontSize: scale(19) }]}>Profile</Text>
          <TouchableOpacity style={styles.editIconBtn}>
            <Ionicons name="create-outline" size={18} color={COLORS.ink} />
          </TouchableOpacity>
        </View>

        {/* ---------- Avatar + name card ---------- */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile?.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={[styles.avatarInitials, { fontSize: scale(22) }]}>{initials || "🍦"}</Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={12} color={COLORS.white} />
            </View>
          </View>

          <Text style={[styles.name, { fontSize: scale(18) }]}>{fullName || "IceKing Fan"}</Text>
          <Text style={[styles.email, { fontSize: scale(12.5) }]}>{profile?.email}</Text>
          {!!profile?.phoneNumber && (
            <Text style={[styles.phone, { fontSize: scale(12.5) }]}>{profile?.phoneNumber}</Text>
          )}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>6</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>240</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
          </View>
        </View>

        {/* ---------- Account section ---------- */}
        <Text style={[styles.sectionTitle, { fontSize: scale(13) }]}>Account</Text>
        <View style={styles.menuCard}>
          {ACCOUNT_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuRow, i < ACCOUNT_ITEMS.length - 1 && styles.menuRowBorder]}
              onPress={() => handleMenuPress(item.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: `${item.color}22` }]}>
                <Ionicons name={item.icon} size={17} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#C9C0E8" />
            </TouchableOpacity>
          ))}
        </View>

        {/* ---------- Support section ---------- */}
        <Text style={[styles.sectionTitle, { fontSize: scale(13) }]}>Support</Text>
        <View style={styles.menuCard}>
          {SUPPORT_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuRow, i < SUPPORT_ITEMS.length - 1 && styles.menuRowBorder]}
              onPress={() => handleMenuPress(item.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: `${item.color}22` }]}>
                <Ionicons name={item.icon} size={17} color={item.color} />
              </View>
              <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
                {item.label}
              </Text>
              {!item.danger && <Ionicons name="chevron-forward" size={16} color="#C9C0E8" />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.versionText}>IceKing v2.1.0</Text>
      </ScrollView>

      {/* ---------- Bottom tab bar ---------- */}
    </SafeAreaView>
  );
}


