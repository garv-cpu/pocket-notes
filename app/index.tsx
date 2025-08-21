import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
  Linking,
} from "react-native";
import {
  Text,
  IconButton,
  Searchbar,
  Chip,
  Card,
  Portal,
  Dialog,
  Button,
  RadioButton,
} from "react-native-paper";
import { Swipeable } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { useToast } from "../components/ToastManager";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import InsightsScreen from "./Insights";
import ConfirmModal from "../components/ConfirmModal"; // Import your custom modal
import axios from "axios";
import * as WebBrowser from "expo-web-browser";
import PocketBuddy from "@/components/PocketBuddy";

interface Note {
  id: string;
  title: string;
  content?: string;
  category: string;
  createdAt?: number;
  updatedAt?: number;
  isLocked?: boolean;
  isPinned?: boolean;
}

const { width } = Dimensions.get("window");

// 🪄 SkeletonLoader Component
const SkeletonLoader = () => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmer.value, [0, 1], [-width, width]);
    return {
      transform: [{ translateX }],
    };
  });

  const generateSkeletons = () =>
    Array.from({ length: 5 }).map((_, index) => (
      <View key={index} style={styles.skeletonCard}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonChip} />
        </View>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: "60%" }]} />
        {/* Shimmer overlay */}
        <Animated.View style={[styles.shimmerOverlay, shimmerStyle]} />
      </View>
    ));

  return <View style={{ padding: 10 }}>{generateSkeletons()}</View>;
};

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSortVisible, setIsSortVisible] = useState(false);
  const [sortType, setSortType] = useState<
    "title" | "createdAt" | "updatedAt" | "category"
  >("title");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pin, setPin] = useState("");
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [currentNoteToAccess, setCurrentNoteToAccess] = useState<Note | null>(
    null
  );
  const hasLoadedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true); // New state for the custom confirmation modal

  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState("");
  const [amount, setAmount] = useState("50");
  const [loading, setLoading] = useState(false);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();

  const fabY = useSharedValue(150);
  const fabScale = useSharedValue(0);
  const fabRotateY = useSharedValue(90);
  const insightsScale = useSharedValue(1);
  const insightsRotation = useSharedValue(0);
  const insightsTranslateY = useSharedValue(0);

  const addPocketScale = useSharedValue(1);

  useEffect(() => {
    fabY.value = withSpring(0, { damping: 10, stiffness: 80 });
    fabRotateY.value = withSpring(0, { damping: 10, stiffness: 80 });
    fabScale.value = withSequence(
      withSpring(1.1, { damping: 12, stiffness: 90 }),
      withSpring(1, { damping: 12, stiffness: 90 })
    );

    insightsScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 300 }),
        withTiming(1, { duration: 300 }),
        withDelay(3000, withTiming(1))
      ),
      -1,
      false
    );
    insightsRotation.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 150, easing: Easing.inOut(Easing.ease) }),
        withTiming(5, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 150, easing: Easing.inOut(Easing.ease) }),
        withDelay(3000, withTiming(0))
      ),
      -1,
      false
    );
    insightsTranslateY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 250 }),
        withTiming(0, { duration: 250 }),
        withDelay(3000, withTiming(0))
      ),
      -1,
      false
    );

    addPocketScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 500 }),
        withTiming(1, { duration: 500 }),
        withDelay(2000, withTiming(1))
      ),
      -1,
      false
    );
  }, []);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: fabY.value },
      { scale: fabScale.value },
      { rotateY: `${fabRotateY.value}deg` },
    ],
  }));

  const addPocketButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: addPocketScale.value }],
    };
  });

  const insightsButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: insightsScale.value },
        { rotateZ: `${insightsRotation.value}deg` },
        { translateY: insightsTranslateY.value },
      ],
    };
  });

  const togglePin = async (note: Note) => {
    const updatedNotes = notes.map((n) =>
      n.id === note.id ? { ...n, isPinned: !n.isPinned } : n
    );
    await saveNotes(updatedNotes);
    showToast(`Pocket ${!note.isPinned ? "pinned" : "unpinned"}`);
  };

  const loadData = useCallback(async () => {
    if (!hasLoadedRef.current) {
      setIsLoading(true);
    }

    const start = Date.now();
    try {
      const storedNotes = await AsyncStorage.getItem("notes");
      if (storedNotes) {
        setNotes(JSON.parse(storedNotes));
      } else {
        setNotes([]);
      }

      const storedCategories = await AsyncStorage.getItem("categories");
      if (storedCategories) {
        const parsed: string[] = JSON.parse(storedCategories);
        const uniqueCategories = Array.from(new Set(parsed));
        setCategories(["All", ...uniqueCategories.filter((c) => c !== "All")]);
      } else {
        setCategories(["All", "Personal", "Work", "Other"]);
      }
    } catch (e) {
      console.error("Failed to load data from AsyncStorage:", e);
    } finally {
      const end = Date.now();
      const timeElapsed = end - start;
      const remainingTime = Math.max(0, 1000 - timeElapsed);

      if (!hasLoadedRef.current) {
        setTimeout(() => {
          setIsLoading(false);
          hasLoadedRef.current = true;
        }, remainingTime);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const saveNotes = async (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    await AsyncStorage.setItem("notes", JSON.stringify(updatedNotes));
  };

  const sortedNotes = useMemo(() => {
    const sorted = [...notes].sort((a, b) => {
      const pinA = a.isPinned ? 1 : 0;
      const pinB = b.isPinned ? 1 : 0;
      const pinCompare = pinB - pinA;

      if (pinCompare !== 0) {
        return pinCompare;
      }

      let compareValue = 0;
      switch (sortType) {
        case "title":
          compareValue = a.title.localeCompare(b.title);
          break;
        case "createdAt":
          compareValue = (a.createdAt ?? 0) - (b.createdAt ?? 0);
          break;
        case "updatedAt":
          compareValue = (a.updatedAt ?? 0) - (b.updatedAt ?? 0);
          break;
        case "category":
          compareValue = a.category.localeCompare(b.category);
          break;
        default:
          return 0;
      }
      return sortDirection === "asc" ? compareValue : -compareValue;
    });
    return sorted;
  }, [notes, sortType, sortDirection]);

  const deleteCategory = async (cat: string) => {
    const updatedCategories = categories.filter((c) => c !== cat);
    setCategories(updatedCategories);

    const updatedNotes = notes.map((n) =>
      n.category === cat ? { ...n, category: "All" } : n
    );
    await saveNotes(updatedNotes);

    await AsyncStorage.setItem("categories", JSON.stringify(updatedCategories));

    if (selectedCategory === cat) {
      setSelectedCategory("All");
    }
    showToast(`Pocket Book "${cat}" deleted`);
  };

  const filteredNotes = useMemo(
    () =>
      sortedNotes.filter((note) => {
        const matchesSearch = note.title
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesCategory =
          selectedCategory === "All" || note.category === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    [sortedNotes, searchQuery, selectedCategory]
  );

  const deleteNote = (id: string) => {
    saveNotes(notes.filter((n) => n.id !== id));
    showToast("Pocket deleted");
  };

  const authenticate = async (onSuccess: () => void) => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to access pocket",
        fallbackLabel: "Use PIN",
      });
      if (authResult.success) {
        onSuccess();
      } else {
        showToast("Authentication failed. Please try again.");
        setIsPinModalVisible(true);
      }
    } else {
      setIsPinModalVisible(true);
    }
  };

  const toggleLock = async (note: Note) => {
    const updatedNotes = notes.map((n) =>
      n.id === note.id ? { ...n, isLocked: !n.isLocked } : n
    );
    await saveNotes(updatedNotes);
    showToast(`Pocket ${!note.isLocked ? "locked" : "unlocked"}`);
  };

  const handlePinUnlock = async () => {
    const storedPin = await AsyncStorage.getItem("appPin");
    if (storedPin === pin) {
      setIsPinModalVisible(false);
      setPin("");
      if (currentNoteToAccess) {
        router.push({
          pathname: "/add",
          params: { noteId: currentNoteToAccess.id },
        });
      }
    } else {
      showToast("Incorrect PIN. Please try again.");
    }
  };

  const renderRightActions = (note: Note) => (
    <View style={styles.swipeActions}>
      <IconButton
        icon={note.isPinned ? "pin-off" : "pin"}
        iconColor="#FFD700"
        onPress={() => togglePin(note)}
        style={{ marginRight: 8 }}
      />
      <IconButton
        icon={note.isLocked ? "lock-open" : "lock"}
        iconColor="#FFD700"
        onPress={() => {
          if (note.isLocked) {
            authenticate(() => toggleLock(note));
          } else {
            toggleLock(note);
          }
        }}
        style={{ marginRight: 8 }}
      />
      <IconButton
        icon="delete"
        iconColor="#FFD700"
        onPress={() => deleteNote(note.id)}
      />
    </View>
  );

  const renderItem = ({ item }: { item: Note }) => (
    <Swipeable renderRightActions={() => renderRightActions(item)}>
      <Pressable
        onPress={() => {
          if (item.isLocked) {
            setCurrentNoteToAccess(item);
            authenticate(() => {
              router.push({
                pathname: "/add",
                params: { noteId: item.id },
              });
            });
          } else {
            router.push({
              pathname: "/add",
              params: { noteId: item.id },
            });
          }
        }}
      >
        <Card style={styles.card}>
          <View style={styles.cardContent}>
            {item.isPinned && (
              <Icon
                name="pin"
                size={24}
                color="#FFD700"
                style={styles.pinIcon}
              />
            )}
            <View
              style={{
                flex: 1,
                paddingLeft: item.isPinned ? 0 : 0,
              }}
            >
              <Card.Title
                title={item.title}
                subtitle={item.category}
                titleStyle={{ color: "white" }}
                subtitleStyle={{ color: "#FFD700" }}
              />
            </View>
            {item.isLocked && (
              <Icon
                name="lock"
                size={24}
                color="#FFD700"
                style={styles.lockIcon}
              />
            )}
          </View>
        </Card>
      </Pressable>
    </Swipeable>
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const getInsights = () => {
    return <InsightsScreen notes={notes} categories={categories} />;
  };

  const handleConfirmDeleteCategory = () => {
    deleteCategory(categoryToDelete);
    setIsConfirmModalVisible(false);
    setCategoryToDelete("");
  };

  const handleCancelDeleteCategory = () => {
    setIsConfirmModalVisible(false);
    setCategoryToDelete("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Searchbar
          placeholder="Search pockets..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchbar, { flex: 1 }]}
          inputStyle={{ color: "white" }}
          iconColor="#FFD700"
        />
        <IconButton
          icon="sort"
          iconColor="#FFD700"
          size={28}
          onPress={() => setIsSortVisible(true)}
        />
      </View>

      <View style={styles.categories}>
        {categories.map((cat) => (
          <Chip
            key={cat}
            mode={selectedCategory === cat ? "flat" : "outlined"}
            selected={selectedCategory === cat}
            onPress={() => setSelectedCategory(cat)}
            onLongPress={() => {
              if (cat === "All") {
                showToast("Default category cannot be deleted");
                return;
              }
              setCategoryToDelete(cat);
              setIsConfirmModalVisible(true);
            }}
            style={{
              marginRight: 8,
              backgroundColor:
                selectedCategory === cat ? "#FFD700" : "transparent",
            }}
            textStyle={{
              color: selectedCategory === cat ? "black" : "#FFD700",
            }}
          >
            {cat}
          </Chip>
        ))}
      </View>
      {isLoading && !hasLoadedRef.current ? (
        <SkeletonLoader />
      ) : (
        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon
                name="emoticon-sad-outline"
                size={80}
                color="#FFD700"
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.emptyTitle}>No Pockets Yet</Text>
              <Text style={styles.emptySubtitle}>
                Start writing by clicking the + icon
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#FFD700"
              colors={["#FFD700"]}
            />
          }
        />
      )}
      <Portal>
        <Dialog
          visible={isSortVisible}
          onDismiss={() => setIsSortVisible(false)}
          style={{ backgroundColor: "black" }}
        >
          <Dialog.Title style={{ color: "#FFD700" }}>Sort by</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={(value) => {
                if (sortType === value) {
                  setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                } else {
                  setSortType(value as any);
                  setSortDirection("desc");
                }
              }}
              value={sortType}
            >
              <RadioButton.Item
                label={`Title ${
                  sortType === "title"
                    ? sortDirection === "asc"
                      ? "(A-Z)"
                      : "(Z-A)"
                    : ""
                }`}
                value="title"
                labelStyle={{ color: "#FFD700" }}
                color="#FFD700"
              />
              <RadioButton.Item
                label={`Date Created ${
                  sortType === "createdAt"
                    ? sortDirection === "asc"
                      ? "(Oldest)"
                      : "(Newest)"
                    : ""
                }`}
                value="createdAt"
                labelStyle={{ color: "#FFD700" }}
                color="#FFD700"
              />
              <RadioButton.Item
                label={`Date Modified ${
                  sortType === "updatedAt"
                    ? sortDirection === "asc"
                      ? "(Oldest)"
                      : "(Newest)"
                    : ""
                }`}
                value="updatedAt"
                labelStyle={{ color: "#FFD700" }}
                color="#FFD700"
              />
              <RadioButton.Item
                label={`Category ${
                  sortType === "category"
                    ? sortDirection === "asc"
                      ? "(A-Z)"
                      : "(Z-A)"
                    : ""
                }`}
                value="category"
                labelStyle={{ color: "#FFD700" }}
                color="#FFD700"
              />
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor="#FFD700" onPress={() => setIsSortVisible(false)}>
              Close
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      {/* PIN Modal */}
      <Modal
        visible={isPinModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter PIN to Unlock</Text>
            <TextInput
              style={styles.pinInput}
              placeholder="Enter PIN"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              secureTextEntry
              value={pin}
              onChangeText={setPin}
              maxLength={4}
            />
            <View style={styles.modalButtons}>
              <Button
                onPress={() => {
                  setIsPinModalVisible(false);
                  setPin("");
                }}
                textColor="#FFD700"
              >
                Cancel
              </Button>
              <Button onPress={handlePinUnlock} textColor="#FFD700">
                Unlock
              </Button>
            </View>
          </View>
        </View>
      </Modal>
      {/* The custom modal for confirming category deletion */}
      <ConfirmModal
        visible={isConfirmModalVisible}
        title="Delete Pocket Book"
        message={`Are you sure you want to delete "${categoryToDelete}"? All Pockets under this Pocket book will be moved to "All".`}
        onConfirm={handleConfirmDeleteCategory}
        onCancel={handleCancelDeleteCategory}
      />
      {/* FAB and Buttons Container */}
      <Animated.View
        style={[styles.fabWrapper, { bottom: insets.bottom + 20 }, fabStyle]}
      >
        {/* Left Button (now has heartbeat animation) */}
        <Animated.View style={addPocketButtonStyle}>
          <Pressable
            style={styles.fabButton}
            android_ripple={{ color: "rgba(0,0,0,0.1)", borderless: false }}
            onPress={() => router.push("/add")}
          >
            <Icon
              name="plus"
              size={24}
              color="black"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.fabText}>Add Pocket</Text>
          </Pressable>
        </Animated.View>
        {/* Right Button (now has funky animation) */}
        <Animated.View style={insightsButtonStyle}>
          <Pressable
            style={styles.fabButton}
            android_ripple={{ color: "rgba(0,0,0,0.1)", borderless: false }}
            onPress={() => router.push("/Insights")}
          >
            <Icon
              name="chart-bar"
              size={24}
              color="black"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.fabText}>Insights</Text>
          </Pressable>
        </Animated.View>

      
      </Animated.View>
      <PocketBuddy />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black", padding: 10 },
  topRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  searchbar: { backgroundColor: "#1a1a1a" },
  categories: { flexDirection: "row", marginBottom: 10, flexWrap: "wrap" },
  card: {
    backgroundColor: "#1a1a1a",
    marginBottom: 10,
    borderRadius: 8,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 16,
  },
  cardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  pinIcon: {
    marginRight: -5,
    left: 6,
  },
  lockIcon: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: [{ translateY: -12 }],
  },
  swipeActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 16,
    marginBottom: 10,
    borderRadius: 8,
  },
  swipeActionsLeft: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 16,
    marginBottom: 10,
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#aaa",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 20,
    width: "80%",
  },
  modalTitle: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  pinInput: {
    borderColor: "#FFD700",
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
    color: "#fff",
    textAlign: "center",
    fontSize: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  fabWrapper: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
  },
  fabButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD700",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    flex: 1,
    marginHorizontal: 4,
  },
  fabText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
  },
  insightsButton: {},
  skeletonContainer: {
    padding: 10,
  },
  skeletonSubtitle: {
    width: "50%",
    height: 16,
    borderRadius: 40,
    opacity: 0.5,
  },
  skeletonCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    marginBottom: 14,
    padding: 16,
    overflow: "hidden",
  },
  skeletonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skeletonTitle: {
    width: "60%",
    height: 18,
    borderRadius: 6,
    backgroundColor: "#2a2a2a",
  },
  skeletonChip: {
    width: 70,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2a2a2a",
  },
  skeletonLine: {
    width: "90%",
    height: 14,
    borderRadius: 6,
    backgroundColor: "#2a2a2a",
    marginBottom: 8,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    width: "40%",
  },
});
