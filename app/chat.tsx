import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // ✅

type Sender = "user" | "ai";

interface Message {
  id: string;
  text: string;
  sender: Sender;
}

const askPocketBuddy = async (userMessage: string): Promise<string> => {
  try {
    const storedNotes = await AsyncStorage.getItem("notes");
    const notes: unknown = storedNotes ? JSON.parse(storedNotes) : [];

    const res = await axios.post<{ reply: string }>(
      "https://donate-backend-vcb8.onrender.com/chat",
      {
        message: userMessage,
        notes,
      }
    );

    return res.data.reply;
  } catch (err) {
    console.error("Pocket Buddy error:", err);
    return "Sorry for that, but we couldn't reach Pocket Buddy.";
  }
};

const PocketBuddyChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const insets = useSafeAreaInsets(); // ✅ get safe-area padding
  const offset = useSharedValue(0);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      offset.value = withTiming(e.endCoordinates.height, { duration: 250 });
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      offset.value = withTiming(0, { duration: 250 });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    bottom: offset.value > 0 ? offset.value : insets.bottom, // ✅ attach to keyboard or safe-area
  }));

  const sendMessage = async (): Promise<void> => {
    if (!input.trim()) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setLoading(true);

    const replyText = await askPocketBuddy(newMsg.text);

    const reply: Message = {
      id: Date.now().toString() + "_ai",
      text: replyText,
      sender: "ai",
    };

    setMessages((prev) => [...prev, reply]);
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined} // only iOS
      keyboardVerticalOffset={0} // no extra offset
    >
      <View style={styles.container}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.message,
                item.sender === "user" ? styles.userMsg : styles.aiMsg,
              ]}
            >
              <Text
                style={item.sender === "user" ? styles.userText : styles.aiText}
              >
                {item.text}
              </Text>
            </View>
          )}
          contentContainerStyle={[
            styles.chatArea,
            { paddingBottom: insets.bottom + 70 }, // ✅ prevent overlap
          ]}
        />

        {/* Animated input bar */}
        <Animated.View style={[styles.inputContainer, animatedStyle]}>
          <TextInput
            style={styles.input}
            placeholder="Talk to Pocket Buddy..."
            placeholderTextColor="#888"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={sendMessage} disabled={loading}>
            <Ionicons
              name={loading ? "time-outline" : "send"}
              size={28}
              color="#FFD60A"
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  chatArea: {
    padding: 10,
    paddingBottom: 80,
  },
  message: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 6,
    maxWidth: "80%",
  },
  userMsg: {
    backgroundColor: "#FFD60A",
    alignSelf: "flex-end",
  },
  aiMsg: {
    backgroundColor: "#222",
    alignSelf: "flex-start",
  },
  // 👇 separate text colors
  userText: {
    color: "#000", // black
  },
  aiText: {
    color: "#fff", // white
  },
  inputContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#333",
    backgroundColor: "#111",
  },
  input: {
    flex: 1,
    backgroundColor: "#222",
    color: "#fff",
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
  },
});

export default PocketBuddyChat;
