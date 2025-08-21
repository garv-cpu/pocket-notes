// components/ShareButton.tsx
import { IconButton } from "react-native-paper";
import * as Sharing from "expo-sharing";
import { useRef, useState } from "react";
import { ShareableNote } from "./ShareableNote";
import { View } from "react-native";
import { useToast } from "./ToastManager";

export function ShareButton() {
  const viewShotRef = useRef(null);
  const { showToast } = useToast();

  const handleShare = async () => {
    try {
      // Add a null check for the ref and the capture function
      if (viewShotRef.current && typeof (viewShotRef.current as any).capture === 'function') {
        const uri = await (viewShotRef.current as any).capture();

        if (uri && (await Sharing.isAvailableAsync())) {
          await Sharing.shareAsync(uri, {
            dialogTitle: "Share Pocket",
            mimeType: "image/jpeg",
          });
        } else {
            showToast("Image sharing not available on this device.");
        }
      } else {
        showToast("Error preparing share image.");
      }
    } catch (err) {
      console.warn("Error capturing or sharing", err);
      showToast("Failed to create and share the note.");
    }
  };

  return (
    <>
      {/* This wraps the ShareableNote in an off-screen container */}
      <View style={{ position: "absolute", top: -9999, left: -9999 }}>
        <ShareableNote ref={viewShotRef} />
      </View>

      <IconButton
        icon="share-variant"
        size={28}
        iconColor="#FFD700"
        onPress={handleShare}
      />
    </>
  );
}