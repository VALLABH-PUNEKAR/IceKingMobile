import { StyleSheet } from "react-native";
import COLORS from "./colors";
const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    paddingBottom: 30,
  },
  floatEmoji: {
    position: "absolute",
    opacity: 0.85,
  },
  logoWrap: {
    alignItems: "center",
  },
  logoEmoji: {
    marginBottom: 4,
  },
  logoText: {
    fontWeight: "900",
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  tagline: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "700",
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  welcome: {
    fontWeight: "900",
    color: COLORS.ink,
  },
  subWelcome: {
    color: COLORS.inkLight,
    fontWeight: "600",
    marginTop: 4,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F5FF",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 10,
  },
  inputWrapFocused: {
    borderColor: COLORS.lavender,
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    color: COLORS.ink,
    fontWeight: "600",
    fontSize: 14,
    paddingVertical: 0,
  },
  forgotWrap: {
    alignSelf: "flex-end",
    marginTop: 12,
  },
  forgotText: {
    color: COLORS.pink,
    fontWeight: "700",
  },
  loginBtn: {
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.pink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  loginBtnText: {
    color: COLORS.white,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#EDE7FA",
  },
  dividerText: {
    color: COLORS.inkLight,
    fontSize: 12,
    fontWeight: "600",
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 18,
  },
  socialBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F7F5FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EDE7FA",
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },
  signupText: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },
  signupLink: {
    color: COLORS.white,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
});
export default styles