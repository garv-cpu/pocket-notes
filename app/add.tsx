import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput as RNTextInput,
  TextStyle,
  Alert,
} from "react-native";
import { TextInput, Button, Chip, IconButton, Text } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import uuid from "react-native-uuid";
import {
  RichEditor,
  RichToolbar,
  actions,
} from "react-native-pell-rich-editor";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useToast } from "../components/ToastManager";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useShare } from "../components/ShareContext";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AppStackParamList } from "./types";
import { StackScreenProps } from "@react-navigation/stack";

interface Note {
  id: string;
  title: string;
  content?: string;
  category: string;
  textStyle?: TextStyleOptions;
  imageUri?: string | null;
  timestamp: number;
  isLocked: boolean;
  isPinned: boolean;
}

interface TextStyleOptions {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontSize: number;
  color: string;
  border: boolean;
}

type ImportedNoteFormat =
  | Note
  | { title: string; content?: string; category?: string };

type AddScreenNavigationProp = NativeStackNavigationProp<
  AppStackParamList,
  "add"
>;
type AddNoteScreenProps = StackScreenProps<
  {
    add: AddNoteRouteParams;
  },
  "add"
>;
type AddNoteRouteParams = {
  noteText?: string;
  noteId?: string;
  noteImage?: string;
};

export default function AddNote({ navigation }: AddNoteScreenProps) {
  const router = useRouter();
  const { noteId } = useLocalSearchParams<{ noteId?: string }>();
  const richText = useRef<RichEditor>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [textSelected, setTextSelected] = useState(false);
  const [textStyle, setTextStyle] = useState<TextStyleOptions>({
    bold: false,
    italic: false,
    underline: false,
    fontSize: 16,
    color: "#FFFFFF",
    border: false,
  });
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const { setShareData } = useShare();

  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [currentNoteId, setCurrentNoteId] = useState<string>(
    noteId || uuid.v4().toString()
  );

  useEffect(() => {
    setShareData({
      noteText: `${title}\n${content}`,
      noteImage: imageUri || "",
    });
  }, [title, content, imageUri, setShareData]);

  // --- Consolidated Load Data Logic ---
  useFocusEffect(
    useCallback(() => {
      const loadNoteData = async () => {
        try {
          // --- Load Categories (with fallback) ---
          const storedCategories = await AsyncStorage.getItem("categories");
          const loadedCategories: string[] = storedCategories
            ? JSON.parse(storedCategories)
            : ["Personal", "Work", "Other"];
          setCategories(Array.from(new Set(loadedCategories)));

          // --- Load Existing Note Data for Editing ---
          if (noteId) {
            const storedNotes = await AsyncStorage.getItem("notes");
            if (storedNotes) {
              const notes: Note[] = JSON.parse(storedNotes);
              const existingNote = notes.find((n) => n.id === noteId);

              if (existingNote) {
                setTitle(existingNote.title);
                setContent(existingNote.content || "");
                setCategory(existingNote.category || "");
                setImageUri(existingNote.imageUri || null);
                // ✅ New: Set the isLocked state from the existing note
                setIsLocked(existingNote.isLocked || false);
                setIsPinned(existingNote.isPinned || false);

                if (richText.current) {
                  richText.current.setContentHTML(existingNote.content || "");
                }
                if (existingNote.textStyle) {
                  setTextStyle(existingNote.textStyle);
                }
              }
            }
          }
        } catch (e) {
          console.error("Failed to load data", e);
        }
      };
      loadNoteData();
      return () => {
        // You can add cleanup logic here if needed, like canceling API calls
      };
    }, [noteId])
  );

  // Add a new useEffect hook specifically for saving on unmount
  useEffect(() => {
    // Return a cleanup function that saves when the component is unmounted
    return () => {
      // Check if there is anything to save before performing the operation
      if (title.trim() || content.trim() || imageUri) {
        saveOnExit();
      }
    };
  }, [title, content, imageUri, category, textStyle]);

  // Create a new async function to handle the save process
  const saveOnExit = async () => {
    try {
      const stored = await AsyncStorage.getItem("notes");
      let notes: Note[] = stored ? JSON.parse(stored) : [];

      const noteToSave: Note = {
        id: currentNoteId,
        title,
        content,
        category,
        imageUri,
        textStyle,
        timestamp: Date.now(),
        isLocked,
        isPinned,
      };

      const noteIndex = notes.findIndex((n) => n.id === currentNoteId);

      if (noteIndex !== -1) {
        notes[noteIndex] = noteToSave;
      } else {
        notes.push(noteToSave);
      }
      // Sort notes by timestamp, newest first
      notes.sort((a, b) => b.timestamp - a.timestamp);
      await AsyncStorage.setItem("notes", JSON.stringify(notes));
    } catch (error) {
      console.error("Failed to save note on exit:", error);
    }
  };
  // ✅ Updated Autosave logic
  useEffect(() => {
    const saveTimeout = setTimeout(async () => {
      if (title.trim() || content.trim() || imageUri) {
        const stored = await AsyncStorage.getItem("notes");
        let notes: Note[] = stored ? JSON.parse(stored) : [];

        const noteToSave: Note = {
          id: currentNoteId,
          title,
          content,
          category,
          imageUri,
          textStyle,
          timestamp: Date.now(),
          isLocked,
          isPinned,
        };

        const noteIndex = notes.findIndex((n) => n.id === currentNoteId);

        if (noteIndex !== -1) {
          notes[noteIndex] = noteToSave;
        } else {
          notes.push(noteToSave);
        }
        // Sort notes by timestamp, newest first
        notes.sort((a, b) => b.timestamp - a.timestamp);
        await AsyncStorage.setItem("notes", JSON.stringify(notes));

        if (!noteId) {
          router.setParams({ noteId: currentNoteId });
        }
      }
    }, 500);

    return () => clearTimeout(saveTimeout);
  }, [title, content, category, imageUri, textStyle, noteId, router]);

  const pickImage = async (fromCamera: boolean = false) => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission required", "Camera access is needed.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.7,
          allowsEditing: true,
        });
      } else {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission required", "Gallery access is needed.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.7,
          allowsEditing: true,
        });
      }

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error("Error picking image:", err);
    }
  };

  const importNoteFromFile = async (): Promise<void> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fileUri = result.assets[0]?.uri;
      if (!fileUri) throw new Error("File not found.");

      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const importedData: ImportedNoteFormat[] = JSON.parse(fileContent);

      if (!Array.isArray(importedData)) {
        showToast("The JSON file must contain an array of notes.");
        return;
      }

      showToast(`Found ${importedData.length} notes. Importing all...`);
      importAll(importedData);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to import notes"
      );
    }
  };

  const importAll = async (notesArray: ImportedNoteFormat[]) => {
    try {
      const stored = await AsyncStorage.getItem("notes");
      let notes: Note[] = stored ? JSON.parse(stored) : [];
      let updatedCategories = [...categories];

      notesArray.forEach((n) => {
        const note: Note = {
          id: uuid.v4().toString(),
          title: n.title || "Untitled",
          content: n.content ?? "",
          category: n.category ?? "Imported",
          textStyle: {
            bold: false,
            italic: false,
            underline: false,
            fontSize: 16,
            color: "#FFFFFF",
            border: false,
          },
          timestamp: Date.now(),
          isLocked,
          isPinned,
        };

        notes.push(note);

        if (note.category && !updatedCategories.includes(note.category)) {
          updatedCategories.push(note.category);
        }
      });
      // Sort notes by timestamp, newest first
      notes.sort((a, b) => b.timestamp - a.timestamp);

      await AsyncStorage.setItem("notes", JSON.stringify(notes));
      await AsyncStorage.setItem(
        "categories",
        JSON.stringify(updatedCategories)
      );

      setCategories(updatedCategories);
      showToast(`${notesArray.length} note(s) imported successfully.`);
    } catch {
      showToast("Failed to import notes.");
    }
  };

  // --- Updated Save Note Function ---
  const saveNote = async () => {
    if (!title.trim()) {
      showToast("Please enter a title before saving.");
      return;
    }

    const stored = await AsyncStorage.getItem("notes");
    let notes: Note[] = stored ? JSON.parse(stored) : [];

    const noteToSave: Note = {
      id: currentNoteId,
      title,
      content,
      category,
      imageUri,
      textStyle,
      timestamp: Date.now(),
      // ✅ New: Include the isLocked property in the saved note
      isLocked,
      isPinned,
    };

    if (noteId) {
      // If it's an existing note, update it while preserving the existing 'isLocked' status
      notes = notes.map((n: Note) =>
        n.id === noteId ? { ...n, ...noteToSave } : n
      );
    } else {
      // If it's a new note, push it to the array
      notes.push(noteToSave);
    }
    // Sort notes by timestamp, newest first
    notes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    await AsyncStorage.setItem("notes", JSON.stringify(notes));
    showToast("Pocket saved successfully!");
    router.back();
  };

  const addCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) {
      showToast("Category name cannot be empty.");
      return;
    }
    if (!categories.includes(trimmed)) {
      const updated = [...categories, trimmed];
      setCategories(updated);
      await AsyncStorage.setItem("categories", JSON.stringify(updated));
      setNewCategory("");
      showToast(`Pocket Book "${trimmed}" added.`);
    } else {
      showToast(`Pocket Book "${trimmed}" already exists.`);
    }
  };

  const toggleTextStyle = (key: keyof TextStyleOptions) => {
    setTextStyle((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const changeFontSize = (delta: number) => {
    setTextStyle((prev) => ({
      ...prev,
      fontSize: Math.max(8, prev.fontSize + delta),
    }));
  };

  const loadCategories = async () => {
    try {
      const stored = await AsyncStorage.getItem("categories");
      if (stored) setCategories(Array.from(new Set(JSON.parse(stored))));
      else setCategories(["Personal", "Work", "Other"]);
    } catch {}
  };

  const loadNote = async () => {
    try {
      const stored = await AsyncStorage.getItem("notes");
      if (stored) {
        const notes: Note[] = JSON.parse(stored);
        const existing = notes.find((n) => n.id === noteId);
        if (existing) {
          setTitle(existing.title);
          setContent(existing.content || "");
          setCategory(existing.category || "");
          if (existing.textStyle) setTextStyle(existing.textStyle);
          if (existing.imageUri) setImageUri(existing.imageUri);
        }
      }
    } catch {}
  };

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <TextInput
        label="Title"
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={styles.titleInput}
        outlineColor="#FFD700"
        textColor="#fff"
        theme={{ colors: { primary: "#FFD700" } }}
      />

      <RichEditor
        ref={richText}
        placeholder="Note Content"
        initialContentHTML={content}
        onChange={(html) => setContent(html)}
        editorStyle={{
          backgroundColor: "#1a1a1a",
          color: "#fff",
          placeholderColor: "#666",
          cssText: `
          pre, code {
            background-color: #1e1e1e !important;
            color: #d4d4d4 !important;
            font-family: monospace !important;
            padding: 8px !important;
            border-radius: 6px !important;
            display: block;
            white-space: pre-wrap !important;
            line-height: 1.4;
          }
          code {
            display: inline-block !important;
            padding: 2px 4px !important;
            background-color: #2d2d2d !important;
            color: #c5c8c6 !important;
            border-radius: 4px !important;
          }
        `,
        }}
        style={styles.noteInput}
      />

      <RichToolbar
        editor={richText}
        selectedIconTint="#FFD700"
        iconTint="#fff"
        actions={[
          actions.setBold,
          actions.setItalic,
          actions.setUnderline,
          actions.setStrikethrough,
          actions.checkboxList,
          actions.insertBulletsList,
          actions.insertOrderedList,
          actions.blockquote,
          actions.code,
        ]}
        iconMap={{
          [actions.code]: ({ tintColor }: { tintColor?: string }) => (
            <Text
              style={{
                color: tintColor,
                fontFamily: "monospace",
                fontSize: 16,
              }}
            >
              {"</>"}
            </Text>
          ),
        }}
        style={styles.toolbar}
        onPressAddLink={() => setShowLinkModal(true)}
      />

      {textSelected && (
        <View style={styles.toolbar}>
          <IconButton
            icon="format-bold"
            iconColor={textStyle.bold ? "#FFD700" : "#fff"}
            onPress={() => toggleTextStyle("bold")}
          />
          <IconButton
            icon="format-italic"
            iconColor={textStyle.italic ? "#FFD700" : "#fff"}
            onPress={() => toggleTextStyle("italic")}
          />
          <IconButton
            icon="format-underline"
            iconColor={textStyle.underline ? "#FFD700" : "#fff"}
            onPress={() => toggleTextStyle("underline")}
          />
          <IconButton
            icon="format-color-text"
            iconColor={textStyle.color === "#FFD700" ? "#FFD700" : "#fff"}
            onPress={() =>
              setTextStyle((prev) => ({
                ...prev,
                color: prev.color === "#FFD700" ? "#FFFFFF" : "#FFD700",
              }))
            }
          />
          <IconButton
            icon="border-all"
            iconColor={textStyle.border ? "#FFD700" : "#fff"}
            onPress={() => toggleTextStyle("border")}
          />
          <IconButton
            icon="format-font-size-increase"
            onPress={() => changeFontSize(2)}
          />
          <IconButton
            icon="format-font-size-decrease"
            onPress={() => changeFontSize(-2)}
          />
        </View>
      )}

      <View style={styles.categories}>
        {categories.map((cat) => (
          <Chip
            key={cat}
            mode={category === cat ? "flat" : "outlined"}
            selected={category === cat}
            onPress={() => setCategory(cat)}
            style={[
              styles.chip,
              { backgroundColor: category === cat ? "#FFD700" : "transparent" },
            ]}
            textStyle={{ color: category === cat ? "black" : "#FFD700" }}
          >
            {cat}
          </Chip>
        ))}
      </View>

      {/* Image Section */}
      <View style={{ marginVertical: 12, alignItems: "center" }}>
        {imageUri ? (
          <View style={{ alignItems: "center" }}>
            <Image
              source={{ uri: imageUri }}
              style={{
                width: 200,
                height: 200,
                borderRadius: 12,
                marginBottom: 8,
              }}
            />
            <Button
              mode="outlined"
              textColor="#FFD700"
              onPress={() => setImageUri(null)}
              style={{ borderColor: "#FFD700", borderWidth: 1 }}
            >
              Remove Image
            </Button>
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              mode="outlined"
              textColor="#FFD700"
              style={{ borderColor: "#FFD700", borderWidth: 1, flex: 1 }}
              onPress={() => pickImage(false)}
            >
              Pick from Gallery
            </Button>
            <Button
              mode="outlined"
              textColor="#FFD700"
              style={{ borderColor: "#FFD700", borderWidth: 1, flex: 1 }}
              onPress={() => pickImage(true)}
            >
              Use Camera
            </Button>
          </View>
        )}
      </View>

      {!showCategoryInput ? (
        <Button
          mode="outlined"
          onPress={() => setShowCategoryInput(true)}
          textColor="#FFD700"
          style={styles.outlinedButton}
        >
          Add Pocket Book
        </Button>
      ) : (
        <>
          <TextInput
            label="New Book"
            value={newCategory}
            onChangeText={setNewCategory}
            mode="outlined"
            style={styles.titleInput}
            outlineColor="#FFD700"
            textColor="#fff"
            theme={{ colors: { primary: "#FFD700" } }}
          />
          <Button
            mode="outlined"
            onPress={async () => {
              await addCategory();
              setShowCategoryInput(false);
            }}
            textColor="#FFD700"
            style={styles.outlinedButton}
          >
            Save Pocket Book
          </Button>
        </>
      )}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 10,
          marginBottom: insets.bottom,
        }}
      >
        <Button
          mode="outlined"
          onPress={importNoteFromFile}
          textColor="#FFD700"
          style={[
            styles.outlinedButton,
            { flex: 1, marginRight: 5, borderColor: "#FFD700", borderWidth: 1 },
          ]}
          labelStyle={{ fontWeight: "bold" }}
        >
          Import from File
        </Button>

        {/* The commented out Save & Exit button has been left as is */}
        {/* <Button
          mode="contained"
          onPress={saveNote}
          buttonColor="#FFD700"
          textColor="black"
          style={[styles.outlinedButton, { flex: 1, marginLeft: 5 }]}
          labelStyle={{ fontWeight: "bold" }}
        >
          Save & Exit
        </Button> */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 2, padding: 12, backgroundColor: "black" },
  titleInput: {
    marginBottom: 10,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
  },
  noteInput: {
    marginBottom: 10,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 10,
    textAlignVertical: "top",
    minHeight: 150,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#1a1a1a",
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  categories: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  chip: {
    marginRight: 8,
    marginBottom: 8,
    borderColor: "#FFD700",
    borderWidth: 1,
  },
  outlinedButton: {
    borderColor: "#FFD700",
    borderWidth: 1,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    padding: 20,
    width: "80%",
  },
  modalTitle: {
    color: "#FFD700",
    fontSize: 18,
    marginBottom: 10,
    fontWeight: "bold",
  },
  modalInput: {
    borderColor: "#FFD700",
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
    color: "#fff",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalCancel: { color: "#aaa", fontSize: 16 },
  modalConfirm: { color: "#FFD700", fontSize: 16, fontWeight: "bold" },
});
