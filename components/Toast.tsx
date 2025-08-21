// app/components/Toast.tsx
import React, { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

interface ToastProps {
  message: string;
  duration?: number; // in ms
  onHide?: () => void;
}

export default function Toast({ message, duration = 2000, onHide }: ToastProps) {
  const [visible, setVisible] = useState(true);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    // fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // fade out after duration
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        onHide && onHide();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    bottom: 80,
    left: width * 0.05,
    width: width * 0.9,
    backgroundColor: "#FFD700",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999,
  },
  toastText: {
    color: "#000",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 16,
  },
});
