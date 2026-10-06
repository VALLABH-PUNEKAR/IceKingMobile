import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  useWindowDimensions,
  StatusBar,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../../App";
import styles from "@/components/LoginPage/style";
import COLORS from "@/components/LoginPage/colors";
import { saveToken } from "@/utils/tokenStorage";
import api from "@/api/api";
/* ============================================================
   IceKing — Login Screen (React Native / Expo, TypeScript)
   Matches the IceKing web landing page theme:
   candy gradient background, rounded cards, playful copy.

   Dependencies (install in your Expo project):
     npx expo install expo-linear-gradient @expo/vector-icons
     npm install @react-navigation/native-stack   // for navigation typing only
   ============================================================ */


type LoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Login">;
};

type FocusedField = "email" | "password" | null;

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { width, height } = useWindowDimensions();

  // Responsive helpers — scale off a 375pt-wide reference (iPhone baseline)
  const isSmall = width < 360;
  const isTablet = width >= 768;
  const scale = (size: number): number => (width / 375) * size;
  const cardMaxWidth = isTablet ? 460 : width - 40;

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [focused, setFocused] = useState<FocusedField>(null);

  const handleLogin = async()=> {
    if (!email || !password) {
    Alert.alert("Error", "Please enter both email and password.");
    return;
    }
    try {
    
    const response = await api.post("/auth/login",{email,password});
    const { token } = response.data; 
    if (token) {
      await saveToken(token);
      // 4. Navigate to Child1 after successful storage
      if (navigation && typeof navigation.replace === "function") {
        navigation.replace("Main");
      }
    }
  } catch (error: any) {
    console.error("Login Error:", error);
    const message = error.response?.data?.message || "Failed to log in. Please check your credentials.";
    Alert.alert("Login Failed", message);
  }
    
  };

  return (
    <LinearGradient
      colors={[COLORS.pink, COLORS.lavender, COLORS.skyBlue]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.flex}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { minHeight: height * 0.95, paddingHorizontal: isTablet ? 0 : 20 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Decorative floating emoji */}
            <Text style={[styles.floatEmoji, { top: height * 0.05, left: 20, fontSize: scale(30) }]}>🍦</Text>
            <Text style={[styles.floatEmoji, { top: height * 0.1, right: 24, fontSize: scale(26) }]}>🍭</Text>
            <Text style={[styles.floatEmoji, { top: height * 0.22, left: 30, fontSize: scale(20) }]}>✨</Text>
            <Text style={[styles.floatEmoji, { top: height * 0.03, right: width * 0.3, fontSize: scale(18) }]}>⭐</Text>

            {/* Logo */}
            <View style={[styles.logoWrap, { marginTop: height * 0.06 }]}>
              <Text style={[styles.logoEmoji, { fontSize: scale(56) }]}>🍦</Text>
              <Text style={[styles.logoText, { fontSize: scale(30) }]}>IceKing</Text>
              <Text style={[styles.tagline, { fontSize: scale(14) }]}>Fresh. Creamy. Colorful.</Text>
            </View>

            {/* Card */}
            <View
              style={[
                styles.card,
                {
                  maxWidth: cardMaxWidth,
                  width: "100%",
                  alignSelf: "center",
                  padding: isSmall ? 20 : 26,
                  marginTop: height * 0.05,
                },
              ]}
            >
              <Text style={[styles.welcome, { fontSize: scale(22) }]}>Welcome Back! 👋</Text>
              <Text style={[styles.subWelcome, { fontSize: scale(13) }]}>
                Log in to order your favorite scoops
              </Text>

              {/* Email input */}
              <View
                style={[
                  styles.inputWrap,
                  focused === "email" && styles.inputWrapFocused,
                  { marginTop: 22 },
                ]}
              >
                <Ionicons name="mail-outline" size={20} color={COLORS.lavender} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={COLORS.inkLight}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              {/* Password input */}
              <View
                style={[
                  styles.inputWrap,
                  focused === "password" && styles.inputWrapFocused,
                  { marginTop: 14 },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.lavender} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={COLORS.inkLight}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={COLORS.inkLight}
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot password */}
              <TouchableOpacity style={styles.forgotWrap} onPress={() => {}}>
                <Text style={[styles.forgotText, { fontSize: scale(12.5) }]}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Login button */}
              <TouchableOpacity activeOpacity={0.85} onPress={handleLogin} style={{ marginTop: 8 }}>
                <LinearGradient
                  colors={[COLORS.pink, COLORS.lavender]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginBtn}
                >
                  <Text style={[styles.loginBtnText, { fontSize: scale(16) }]}>Log In 🍨</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social buttons */}
              <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
                  <Ionicons name="logo-google" size={20} color="#EA4335" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
                  <Ionicons name="logo-apple" size={22} color="#111" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
                  <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign up link */}
            <View style={styles.signupRow}>
              <Text style={[styles.signupText, { fontSize: scale(13.5) }]}>New to IceKing? </Text>
              <TouchableOpacity onPress={() => navigation?.navigate?.("SignUp")}>
                <Text style={[styles.signupLink, { fontSize: scale(13.5) }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}


