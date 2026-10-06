import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  useWindowDimensions,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import styles from "@/components/RegisterPage/Style";
import type RegisterForm from "@/components/RegisterPage/RegisterForm";
import { handleUpload } from "@/components/RegisterPage/handleUpload";
import api from "@/api/api";
import axios from "axios";

/* ============================================================
   IceKing — Register Screen (React Native / Expo, TypeScript)
   Fields map directly to the `users` table columns, plus
   standard auth fields (email + password) for account creation:

     first_name    varchar   NULL
     last_name     varchar   NULL
     email         varchar   (used for login; hash password server-side)
     password      varchar   (never store in plaintext — hash on the backend)
     phone_number  varchar   NULL
     avatar_url    varchar   NULL   <- stores an uploaded image URL,
                                       not the image itself
     date_of_birth date      NULL

   Dependencies (install in your Expo project):
     npx expo install expo-linear-gradient @expo/vector-icons
     npx expo install expo-image-picker
     npx expo install @react-native-community/datetimepicker
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
} as const;


type FocusedField = "firstName" | "lastName" | "email" | "password" | "phone" | null;

type RegisterScreenProps = {
  navigation?: {
    navigate: (screen: string) => void;
  };
};

/* ------------------------------------------------------------
   Uploads the picked image to your storage/backend and returns
   the public URL that gets saved in `avatar_url`. Swap the body
   of this function for a real call (S3 presigned URL, Supabase
   Storage, Firebase Storage, your own /upload endpoint, etc).
   The picker never writes raw image bytes into the database —
   only this resulting URL string does.
------------------------------------------------------------ */
function formatDate(date: Date | null): string {
  if (!date) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const scale = (size: number): number => (width / 375) * size;
  const cardMaxWidth = isTablet ? 460 : width - 40;

  const [form, setForm] = useState<RegisterForm>({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone_number: "",
    avatar_url: null,
    date_of_birth: null,
  });

  const [showPassword, setShowPassword] = useState(false);

  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [focused, setFocused] = useState<FocusedField>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /* ---------------- Avatar picking + upload ---------------- */
  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to set a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const selectedAsset = result.assets[0];
    const localUri = selectedAsset.uri;
    setLocalAvatarUri(localUri); // instant preview, before upload finishes
    setSelectedAvatar(selectedAsset);
  };

  const saveAvatar = async () => {
    if (!selectedAvatar) return;

    setUploadingAvatar(true);
    try {
      const imagePath = await handleUpload(selectedAvatar);
      update("avatar_url", imagePath);
      setSelectedAvatar(null);
      Alert.alert("Photo saved", "Your profile photo has been uploaded.");
    } catch {
      Alert.alert("Upload failed", "The profile photo could not be uploaded. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onChangeDate = (event: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(Platform.OS === "ios"); // iOS keeps the picker open inline; Android closes it
    if (event.type === "set" && selected) {
      update("date_of_birth", selected);
    }
  };

  const handleRegister = async()=> {
    setSubmitting(true);
    
    try{
      let finalAvatarUrl = form.avatar_url;

      // Auto-upload selected avatar if it hasn't been uploaded yet
      if (selectedAvatar && !finalAvatarUrl) {
        setUploadingAvatar(true);
        finalAvatarUrl = await handleUpload(selectedAvatar);
        update("avatar_url", finalAvatarUrl);
        setUploadingAvatar(false);
      }
      
      const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      password: form.password,
      phone_number: form.phone_number.trim(),
      avatar_url: finalAvatarUrl,
      date_of_birth: form.date_of_birth ? form.date_of_birth.toISOString().slice(0, 10) : null,
    };
    // Hook this up to your POST /register (or /users) endpoint.
    await api.post("/auth/register",payload)
    Alert.alert(
      "Account Created! 🍦",
      "Your registration was successful. Please log in.",
      [
        {
          text: "Log In",
          onPress: () => navigation?.navigate("Home"),
        },
      ]
    );
    }
    catch(error: any){
      console.error("Registration error:", error);
      const message =error.response?.data?.message || "Could not register account. Please check your network and try again.";
      Alert.alert("Registration Failed", message);
    }
    setTimeout(() => setSubmitting(false), 900);
  };

  const isValid =
    form.first_name.trim().length > 0 &&
    form.last_name.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(form.email) &&
    form.password.length >= 8;

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
            {/* Header */}
            <View style={[styles.headerWrap, { marginTop: height * 0.04 }]}>
              <Text style={[styles.logoEmoji, { fontSize: scale(40) }]}>🍦</Text>
              <Text style={[styles.title, { fontSize: scale(24) }]}>Create Your Account</Text>
              <Text style={[styles.subtitle, { fontSize: scale(13) }]}>Join IceKing in a few sweet steps</Text>
            </View>

            {/* Card */}
            <View
              style={[
                styles.card,
                { maxWidth: cardMaxWidth, width: "100%", alignSelf: "center", marginTop: height * 0.03 },
              ]}
            >
              {/* Avatar picker */}
              <View style={styles.avatarWrap}>
                <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85} style={styles.avatarTouchable}>
                  {localAvatarUri ? (
                    <Image source={{ uri: localAvatarUri }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={36} color={COLORS.lavender} />
                    </View>
                  )}

                  {uploadingAvatar ? (
                    <View style={styles.avatarOverlay}>
                      <ActivityIndicator color={COLORS.white} />
                    </View>
                  ) : (
                    <View style={styles.avatarBadge}>
                      <Ionicons name="camera" size={14} color={COLORS.white} />
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.avatarLabel}>
                  {form.avatar_url ? "Photo saved ✓" : localAvatarUri ? "Photo selected" : "Add a profile photo"}
                </Text>
                {selectedAvatar && !uploadingAvatar && (
                  <TouchableOpacity onPress={saveAvatar} style={{ marginTop: 8 }}>
                    <Text style={styles.loginLink}>Save photo</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* First + last name */}
              <View style={styles.row}>
                <View style={[styles.inputWrap, styles.rowInput, focused === "firstName" && styles.inputWrapFocused]}>
                  <TextInput
                    style={styles.input}
                    placeholder="First name"
                    placeholderTextColor={COLORS.inkLight}
                    value={form.first_name}
                    onChangeText={(v) => update("first_name", v)}
                    onFocus={() => setFocused("firstName")}
                    onBlur={() => setFocused(null)}
                    returnKeyType="next"
                  />
                </View>
                <View style={[styles.inputWrap, styles.rowInput, focused === "lastName" && styles.inputWrapFocused]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Last name"
                    placeholderTextColor={COLORS.inkLight}
                    value={form.last_name}
                    onChangeText={(v) => update("last_name", v)}
                    onFocus={() => setFocused("lastName")}
                    onBlur={() => setFocused(null)}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Email */}
              <View style={[styles.inputWrap, focused === "email" && styles.inputWrapFocused, { marginTop: 12 }]}>
                <Ionicons name="mail-outline" size={20} color={COLORS.lavender} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={COLORS.inkLight}
                  value={form.email}
                  onChangeText={(v) => update("email", v)}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                />
              </View>

              {/* Password */}
              <View style={[styles.inputWrap, focused === "password" && styles.inputWrapFocused, { marginTop: 12 }]}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.lavender} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={COLORS.inkLight}
                  value={form.password}
                  onChangeText={(v) => update("password", v)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="next"
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
              <Text style={styles.passwordHint}>Use at least 8 characters.</Text>

              {/* Phone number */}
              <View style={[styles.inputWrap, focused === "phone" && styles.inputWrapFocused, { marginTop: 12 }]}>
                <Ionicons name="call-outline" size={20} color={COLORS.lavender} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone number"
                  placeholderTextColor={COLORS.inkLight}
                  value={form.phone_number}
                  onChangeText={(v) => update("phone_number", v)}
                  onFocus={() => setFocused("phone")}
                  onBlur={() => setFocused(null)}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
              </View>

              {/* Date of birth */}
              <TouchableOpacity
                style={[styles.inputWrap, { marginTop: 12 }]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.lavender} />
                <Text style={[styles.input, !form.date_of_birth && styles.placeholderText]}>
                  {form.date_of_birth ? formatDate(form.date_of_birth) : "Date of birth"}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={form.date_of_birth ?? new Date(2010, 0, 1)}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  onChange={onChangeDate}
                />
              )}

              {/* Register button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleRegister}
                disabled={!isValid || submitting}
                style={{ marginTop: 20, opacity: !isValid || submitting ? 0.6 : 1 }}
              >
                <LinearGradient
                  colors={[COLORS.pink, COLORS.lavender]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.registerBtn}
                >
                  <Text style={[styles.registerBtnText, { fontSize: scale(16) }]}>
                    {submitting ? "Creating account..." : "Create Account 🍨"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.terms}>
                By continuing, you agree to IceKing's Terms of Service and Privacy Policy.
              </Text>
            </View>

            {/* Login link */}
            <View style={styles.loginRow}>
              <Text style={[styles.loginText, { fontSize: scale(13.5) }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation?.navigate?.("Login")}>
                <Text style={[styles.loginLink, { fontSize: scale(13.5) }]}>Log In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}


