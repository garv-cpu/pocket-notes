import React, { useState, useEffect, useRef, useCallback } from "react";
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
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Sender = "user" | "ai";

interface Message {
  id: string;
  text: string;
  sender: Sender;
}

const CHAT_HISTORY_KEY = "pocketbuddy_chat_history";

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

// 👇 Typing dots component
const TypingDots = () => {
  const dots = [useSharedValue(1), useSharedValue(1), useSharedValue(1)];

  useEffect(() => {
    dots.forEach((dot, i) => {
      dot.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 150 }),
          withTiming(1, { duration: 150 })
        ),
        -1,
        false
      );
    });
  }, []);
  return (
    <View style={{ flexDirection: "row", padding: 6 }}>
      {dots.map((dot, i) => {
        const animatedStyle = useAnimatedStyle(() => ({
          opacity: dot.value,
        }));
        return (
          <Animated.View
            key={i}
            style={[
              {
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#FFD60A",
                marginHorizontal: 2,
              },
              animatedStyle,
            ]}
          />
        );
      })}
    </View>
  );
};

const PocketBuddyChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [placeholder, setPlaceholder] = useState<string>("Talk to Pocket Buddy...");

  // Ref to hold the index of the current placeholder
  const placeholderIndex = useRef(0);
  const placeholderInterval = useRef<NodeJS.Timeout | null>(null);

  const insets = useSafeAreaInsets();
  const offset = useSharedValue(0);

  const sendScale = useSharedValue(1);
  const sendRotate = useSharedValue(0);
  
  // List of placeholder phrases
  const placeholderPhrases = [
    "Ask me about your notes...",
    "Analyze my thoughts...",
    "What's the theme of my latest notes?",
    "Summarize my notes for the past week...",
    "Find notes about 'ideas'...",
    "Tell me a fun fact about writing...",
  ];

  // Function to change placeholder with a fade animation
  const updatePlaceholder = useCallback(() => {
    placeholderIndex.current = (placeholderIndex.current + 1) % placeholderPhrases.length;
    setPlaceholder(placeholderPhrases[placeholderIndex.current]);
  }, [placeholderPhrases]);

  // Load chat history from storage when the component mounts
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const storedHistory = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
        if (storedHistory) {
          setMessages(JSON.parse(storedHistory));
        }
      } catch (e) {
        console.error("Failed to load chat history:", e);
      }
    };

    loadChatHistory();
  }, []); // Run only once on mount

  // Save chat history to storage whenever messages change
  useEffect(() => {
    const saveChatHistory = async () => {
      try {
        await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
      } catch (e) {
        console.error("Failed to save chat history:", e);
      }
    };
    
    // Only save when messages are not empty and not the initial state
    if (messages.length > 0) {
      saveChatHistory();
    }
  }, [messages]);

  // Set up the interval for placeholder change with animation
  useEffect(() => {
    placeholderInterval.current = setInterval(() => {
      updatePlaceholder();
    }, 3000); // Change placeholder every 3 seconds

    return () => {
      if (placeholderInterval.current) {
        clearInterval(placeholderInterval.current);
      }
    };
  }, [updatePlaceholder]);

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
    bottom: offset.value > 0 ? offset.value : insets.bottom,
  }));

  const sendButtonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: sendScale.value },
      { rotate: `${sendRotate.value}deg` },
    ],
  }));

  const sendMessage = async (): Promise<void> => {
    if (!input.trim()) return;

    // animate press (scale + rotation)
    sendScale.value = withSequence(
      withTiming(0.8, { duration: 120 }),
      withTiming(1, { duration: 120 })
    );
    sendRotate.value = withSequence(
      withTiming(20, { duration: 120 }),
      withTiming(0, { duration: 120 })
    );

    const newMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setLoading(true);

    // Add typing indicator
    const typingMsg: Message = { id: "typing", text: "", sender: "ai" };
    setMessages((prev) => [...prev, typingMsg]);

    const replyText = await askPocketBuddy(newMsg.text);

    // remove typing placeholder
    setMessages((prev) => prev.filter((m) => m.id !== "typing"));

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
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
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
              {item.id === "typing" ? (
                <TypingDots />
              ) : (
                <Text
                  style={
                    item.sender === "user" ? styles.userText : styles.aiText
                  }
                >
                  {item.text}
                </Text>
              )}
            </View>
          )}
          contentContainerStyle={[
            styles.chatArea,
            { paddingBottom: insets.bottom + 70 },
          ]}
        />

        {/* Input bar */}
        <Animated.View style={[styles.inputContainer, animatedStyle]}>
          <TextInput
            style={styles.input}
            placeholder={placeholder} // Use the state variable here
            placeholderTextColor="#888"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={sendMessage} disabled={loading}>
            <Animated.View style={sendButtonStyle}>
              <Ionicons
                name={loading ? "checkmark-circle" : "send"}
                size={28}
                color="#FFD60A"
              />
            </Animated.View>
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
  userText: {
    color: "#000",
  },
  aiText: {
    color: "#fff",
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