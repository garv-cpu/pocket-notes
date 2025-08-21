import React, { useEffect } from "react";
import { Pressable, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { PanGestureHandler } from "react-native-gesture-handler";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function PocketBuddy() {
  const router = useRouter();

  // Position (start bottom-right)
  const x = useSharedValue(width - 80);
  const y = useSharedValue(height - 270);

  // Scale for intro animation
  const scale = useSharedValue(0);

  // Intro animation (peek out then hide)
  useEffect(() => {
    scale.value = withDelay(
      1200, // wait until logo finishes
      withSpring(1, { damping: 10, stiffness: 90 }, () => {
        scale.value = withDelay(
          2500, // stay visible for a bit
          withTiming(0.6, { duration: 600 }) // shrink back like hiding
        );
      })
    );
  }, []);

  // Handle dragging
  const onGestureEvent = (event: any) => {
    x.value = event.nativeEvent.translationX + (width - 80);
    y.value = event.nativeEvent.translationY + (height - 180);
  };

  const style = useAnimatedStyle(() => ({
    position: "absolute",
    left: x.value,
    top: y.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <PanGestureHandler onGestureEvent={onGestureEvent}>
      <Animated.View style={[style]}>
        <Pressable
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: "#FFD700",
            justifyContent: "center",
            alignItems: "center",
            elevation: 5,
          }}
          onPress={() => router.push("/chat")}
        >
          <Icon name="robot-happy-outline" size={28} color="black" />
        </Pressable>
      </Animated.View>
    </PanGestureHandler>
  );
}
