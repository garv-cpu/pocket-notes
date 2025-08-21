import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
} from "react-native";
import {
  Text,
  Divider,
  Switch,
  Button,
  List,
  useTheme,
} from "react-native-paper";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { useToast } from "../components/ToastManager";
import ConfirmModal from "../components/ConfirmModal";
import * as WebBrowser from "expo-web-browser";
import axios from "axios";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { showToast } = useToast();

  const [biometric, setBiometric] = useState(false);
  const [showPreferences, setShowPreferences] = useState(true);
  const [showSecurity, setShowSecurity] = useState(true);
  const [showStorage, setShowStorage] = useState(true);
  const [showAbout, setShowAbout] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [storageUsed, setStorageUsed] = useState<string>("Calculating...");
  const [fontSize, setFontSize] = useState<number>(16);
  const [amount, setAmount] = useState("50");
  const [loading, setLoading] = useState(false);

  // ✅ Confirm modal state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmProps, setConfirmProps] = useState<{
    title: string;
    message: string;
    onConfirm: (value?: any) => void;
    numericInput?: boolean;
    defaultValue?: number;
  }>({
    title: "",
    message: "",
    onConfirm: () => {},
    numericInput: false,
    defaultValue: 0,
  });

  // Load stored settings
  useEffect(() => {
    const loadSettings = async () => {
      const storedBiometric = await AsyncStorage.getItem("biometricEnabled");
      if (storedBiometric) setBiometric(JSON.parse(storedBiometric));
    };
    loadSettings();
  }, []);

  // Load storage info on mount
  useEffect(() => {
    calculateStorage();
  }, []);

  useEffect(() => {
    const loadFontSize = async () => {
      const stored = await AsyncStorage.getItem("fontSize");
      if (stored) setFontSize(parseInt(stored, 10));
    };
    loadFontSize();
  }, []);

  const toggleSection = (setter: (val: boolean) => void) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter((prev) => !prev);
  };

  const handleDonate = async () => {
    try {
      setLoading(true);

      // Fixed Cashfree payment link
      const paymentLink =
        "https://payments.cashfree.com/links?code=F920t898cs5g";

      // Open the payment link in the browser
      await WebBrowser.openBrowserAsync(paymentLink);
    } catch (err) {
      console.error("Donate error:", err.message);
      showToast("Something went wrong with donation");
    } finally {
      setLoading(false);
    }
  };

  const calculateStorage = async () => {
    try {
      // 1️⃣ Calculate AsyncStorage usage
      const keys = await AsyncStorage.getAllKeys();
      const stores = await AsyncStorage.multiGet(keys);
      let asyncStorageSize = 0;
      stores.forEach(([key, value]) => {
        asyncStorageSize += (key?.length || 0) + (value?.length || 0);
      });

      // 2️⃣ Calculate cache directory size
      const cacheDir = FileSystem.cacheDirectory || "";
      const files = await FileSystem.readDirectoryAsync(cacheDir);
      let cacheSize = 0;
      for (const file of files) {
        const info = await FileSystem.getInfoAsync(cacheDir + file);
        cacheSize += info.size || 0;
      }

      const totalSizeMB = (
        (asyncStorageSize + cacheSize) /
        (1024 * 1024)
      ).toFixed(2);
      setStorageUsed(`${totalSizeMB} MB`);
    } catch (err) {
      console.error(err);
      setStorageUsed("Unknown");
    }
  };

  const handleBiometricToggle = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        showToast("Biometric authentication not supported on this device");
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        setConfirmProps({
          title: "No Biometrics",
          message:
            "You haven't set up fingerprint or face ID yet. Open device settings to enable it?",
          onConfirm: () => {
            if (Platform.OS === "ios") {
              Linking.openURL("App-Prefs:FaceID");
            } else {
              Linking.sendIntent("android.settings.SECURITY_SETTINGS");
            }
            setConfirmVisible(false);
          },
        });
        setConfirmVisible(true);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirm your identity",
        fallbackLabel: "Use device password",
        cancelLabel: "Cancel",
      });

      if (result.success) {
        const newValue = !biometric;
        setBiometric(newValue);
        showToast(`Biometric unlock ${newValue ? "enabled" : "disabled"}`);
        await AsyncStorage.setItem(
          "biometricEnabled",
          JSON.stringify(newValue)
        );
      } else {
        showToast("Authentication failed. Biometric unlock not changed.");
      }
    } catch (error) {
      console.error(error);
      showToast("An error occurred during biometric authentication");
    }
  };

  const sendFeedback = () => {
    const email = "hibon.technologies@gmail.com";
    const subject = encodeURIComponent("Feedback for Pocket Notes App");
    const body = encodeURIComponent(
      "Hi team,\n\nI would like to share the following feedback:\n"
    );

    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
    Linking.canOpenURL(mailtoUrl)
      .then((supported) => {
        if (!supported) showToast("Email client is not available");
        else Linking.openURL(mailtoUrl);
      })
      .catch((err) => console.error(err));
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Security & Privacy */}
      <List.Accordion
        title="Security & Privacy"
        expanded={showSecurity}
        onPress={() => toggleSection(setShowSecurity)}
      >
        <List.Item
          title="Enable Biometric Unlock"
          left={(props) => <List.Icon {...props} icon="fingerprint" />}
          right={() => (
            <Switch
              value={biometric}
              onValueChange={handleBiometricToggle}
              color={theme.colors.primary}
            />
          )}
        />

        <Button
          mode="contained"
          style={{
            marginVertical: 8,
            borderRadius: 8,
            backgroundColor: theme.colors.primary,
          }}
          labelStyle={{ color: "#000", fontWeight: "bold" }}
          onPress={() => {
            setConfirmProps({
              title: "Reset App",
              message:
                "Are you sure you want to delete all notes and reset the app?",
              onConfirm: async () => {
                try {
                  await AsyncStorage.clear();
                  const cacheDir = FileSystem.cacheDirectory || "";
                  const files = await FileSystem.readDirectoryAsync(cacheDir);
                  for (const file of files) {
                    await FileSystem.deleteAsync(cacheDir + file, {
                      idempotent: true,
                    });
                  }
                  setBiometric(false);
                  showToast("App reset successfully");
                  setConfirmVisible(false);
                } catch (err) {
                  console.error(err);
                  showToast("Failed to reset app completely");
                }
              },
            });
            setConfirmVisible(true);
          }}
        >
          Reset App / Delete All Notes
        </Button>
      </List.Accordion>

      <Divider />

      {/* Storage & Data */}
      <List.Accordion
        title="Storage & Data"
        expanded={showStorage}
        onPress={() => toggleSection(setShowStorage)}
      >
        <List.Item
          title="Storage Used"
          description={storageUsed}
          left={(props) => <List.Icon {...props} icon="database" />}
          onPress={() => {
            calculateStorage();
            showToast("Updated storage usage");
          }}
        />
        <List.Item
          title="Clear Local Cache"
          description="Clear temporary files and cached data"
          left={(props) => <List.Icon {...props} icon="folder" />}
          onPress={() => {
            setConfirmProps({
              title: "Clear Cache",
              message:
                "Are you sure you want to clear all cached files? This will not delete your notes.",
              onConfirm: async () => {
                try {
                  const cacheDir = FileSystem.cacheDirectory || "";
                  const files = await FileSystem.readDirectoryAsync(cacheDir);
                  for (const file of files) {
                    await FileSystem.deleteAsync(cacheDir + file, {
                      idempotent: true,
                    });
                  }
                  showToast("Local cache cleared");
                  calculateStorage();
                  setConfirmVisible(false);
                } catch (err) {
                  console.error(err);
                  showToast("Failed to clear cache");
                }
              },
            });
            setConfirmVisible(true);
          }}
        />
      </List.Accordion>

      <Divider />

      {/* About */}
      <List.Accordion
        title="About"
        expanded={showAbout}
        onPress={() => toggleSection(setShowAbout)}
      >
        <List.Item
          title="Donate ❤️"
          description="Support Pocket Notes development"
          left={(props) => <List.Icon {...props} icon="heart" />}
          onPress={handleDonate}
        />

        <List.Item
          title="App Version"
          description="1.0.0"
          left={(props) => <List.Icon {...props} icon="information" />}
          onPress={() => {
            showToast("You are using version 1.0.0");
          }}
        />
        <List.Item
          title="Contact Support"
          left={(props) => <List.Icon {...props} icon="headset" />}
          onPress={() => {
            const supportEmail = "hibon.technologies@gmail.com";
            const mailtoUrl = `mailto:${supportEmail}?subject=Support Request`;
            Linking.canOpenURL(mailtoUrl)
              .then((supported) => {
                if (!supported) showToast("Email client not available");
                else Linking.openURL(mailtoUrl);
              })
              .catch(() => showToast("Failed to open email client"));
          }}
        />
        <List.Item
          title="Send Feedback"
          left={(props) => <List.Icon {...props} icon="message" />}
          onPress={sendFeedback}
        />
        <List.Item
          title="Rate the App"
          left={(props) => <List.Icon {...props} icon="star" />}
          onPress={() => {
            const appStoreUrl =
              Platform.OS === "ios"
                ? "itms-apps://itunes.apple.com/app/idYOUR_APP_ID"
                : "market://details?id=YOUR_PACKAGE_NAME";
            Linking.canOpenURL(appStoreUrl)
              .then((supported) => {
                if (!supported) showToast("Cannot open store");
                else Linking.openURL(appStoreUrl);
              })
              .catch(() => showToast("Failed to open store"));
          }}
        />
      </List.Accordion>

      <Divider />

      {/* Advanced / Developer Options */}
      <List.Accordion
        title="Advanced / Developer Options"
        expanded={showAdvanced}
        onPress={() => toggleSection(setShowAdvanced)}
      >
        <List.Item
          title="Export Notes & Categories"
          description="Create a JSON file with all notes including export timestamp"
          left={(props) => <List.Icon {...props} icon="export" />}
          onPress={async () => {
            try {
              const keys = await AsyncStorage.getAllKeys();
              const stores = await AsyncStorage.multiGet(keys);
              const logsData: Record<string, any> = {};
              stores.forEach(([key, value]) => {
                try {
                  const parsed = JSON.parse(value ?? "");
                  if (Array.isArray(parsed)) {
                    logsData[key] = parsed.map((note) => ({
                      ...note,
                      exportedAt: new Date().toISOString(),
                    }));
                  } else logsData[key] = parsed;
                } catch {
                  logsData[key] = value ?? "";
                }
              });

              const fileUri =
                FileSystem.cacheDirectory + "pocket_notes_logs.json";
              await FileSystem.writeAsStringAsync(
                fileUri,
                JSON.stringify(logsData, null, 2),
                { encoding: FileSystem.EncodingType.UTF8 }
              );

              if (!(await Sharing.isAvailableAsync())) {
                showToast("Sharing is not available on this device");
                return;
              }

              await Sharing.shareAsync(fileUri);
            } catch (error) {
              console.error(error);
              showToast("Failed to export notes");
            }
          }}
        />
      </List.Accordion>

      {/* ✅ Confirm modal */}
      <ConfirmModal
        visible={confirmVisible}
        title={confirmProps.title}
        message={confirmProps.message}
        onConfirm={confirmProps.onConfirm}
        onCancel={() => setConfirmVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
