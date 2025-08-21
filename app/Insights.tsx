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
  const insights = {
    totalPockets: notes.length,
  };

  return insights;
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
      ) : insights ? (
        <View>
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardContent}>
                You have a total of {insights.totalPockets} pockets.
              </Text>
            </Card.Content>
          </Card>
        </View>
      ) : (
        <Text style={styles.emptyText}>No pockets to analyze yet. Start writing!</Text>
      )}

      {/* More Insights Coming Soon Section */}
      <View style={styles.bottomSection}>
        <Text style={styles.bottomText}>More insights coming soon!</Text>
      </View>
      {/* End of More Insights Coming Soon Section */}
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