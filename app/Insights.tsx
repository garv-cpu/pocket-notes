// Insights.tsx
import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, ActivityIndicator, Card } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Note {
  id: string;
  title: string;
  content?: string;
  category: string;
  createdAt?: number;
  updatedAt?: number;
}

const getPocketInsights = (notes: Note[]) => {
  if (notes.length === 0) {
    return {
      totalPockets: 0,
    };
  }

  // Calculate notes created per month
  const firstNoteDate = notes.reduce((minDate, note) =>
    note.createdAt && note.createdAt < minDate ? note.createdAt : minDate,
    notes[0].createdAt || Date.now()
  );
  const now = Date.now();
  const monthsElapsed = (now - (firstNoteDate || now)) / (1000 * 60 * 60 * 24 * 30.44);
  const avgNotesPerMonth = monthsElapsed > 1 ? (notes.length / monthsElapsed).toFixed(1) : notes.length;

  // Calculate average word count
  const totalWords = notes.reduce((sum, note) => sum + (note.content?.split(/\s+/).filter(Boolean).length || 0), 0);
  const avgWordsPerNote = totalWords > 0 ? Math.round(totalWords / notes.length) : 0;

  // Analyze categories
  const categories: { [key: string]: number } = {};
  notes.forEach((note) => {
    categories[note.category] = (categories[note.category] || 0) + 1;
  });
  
  const sortedCategories = Object.keys(categories).sort((a, b) => categories[b] - categories[a]);
  const mostCommonCategory = sortedCategories.length > 0 ? sortedCategories[0] : "N/A";
  const uniqueCategories = Object.keys(categories).length;

  // Get most recent note date
  const mostRecentNoteDate = notes.reduce((maxDate, note) =>
    note.updatedAt && note.updatedAt > maxDate ? note.updatedAt : maxDate,
    0
  );
  const timeSinceLastNote = (Date.now() - mostRecentNoteDate) / (1000 * 60 * 60 * 24);

  return {
    totalPockets: notes.length,
    avgNotesPerMonth: parseFloat(avgNotesPerMonth),
    avgWordsPerNote,
    mostCommonCategory,
    uniqueCategories,
    timeSinceLastNote: timeSinceLastNote.toFixed(0),
  };
};

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const storedNotes = await AsyncStorage.getItem("notes");
      const notes: Note[] = storedNotes ? JSON.parse(storedNotes) : [];
      const analysis = getPocketInsights(notes);
      setInsights(analysis);
    } catch (e) {
      console.error("Failed to load notes for insights:", e);
      setInsights(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      {loading ? (
        <ActivityIndicator animating={true} color="#FFD700" size="large" />
      ) : insights && insights.totalPockets > 0 ? (
        <View>
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardContent}>
                You have a total of {insights.totalPockets} pockets.
              </Text>
            </Card.Content>
          </Card>
          
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardContent}>
                You've created an average of {insights.avgNotesPerMonth} pockets per month.
              </Text>
            </Card.Content>
          </Card>
          
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardContent}>
                Your average pocket length is {insights.avgWordsPerNote} words.
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardContent}>
                Your most common pocket category is {insights.mostCommonCategory ? insights.mostCommonCategory : "not available"}.
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardContent}>
                You have used {insights.uniqueCategories} unique categories.
              </Text>
            </Card.Content>
          </Card>

        </View>
      ) : (
        <Text style={styles.emptyText}>No pockets to analyze yet. Start writing!</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "black",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 20,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#1a1a1a",
    marginBottom: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#FFD700",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  cardContent: {
    fontSize: 16,
    color: "#fff",
  },
  emptyText: {
    fontSize: 16,
    color: "#aaa",
    textAlign: "center",
    marginTop: 50,
  },
  bottomSection: {
    marginTop: 40,
    alignItems: "center",
  },
  bottomText: {
    fontSize: 18,
    color: "#FFD700",
    fontWeight: "bold",
  },
});