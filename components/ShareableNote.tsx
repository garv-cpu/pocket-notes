// components/ShareableNote.tsx
import React, { useRef } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import ViewShot from "react-native-view-shot";
import { useShare } from "../components/ShareContext";
import RenderHtml from 'react-native-render-html'; // Import the new library
import { useWindowDimensions } from 'react-native';

export const ShareableNote = React.forwardRef((props, ref) => {
  const { shareData } = useShare();
  const { noteText, noteImage } = shareData;
  const { width } = useWindowDimensions();

  // Define custom styles for HTML elements to match your app's theme
  const renderersProps = {
    p: {
      style: styles.text,
    },
    h1: {
      style: { ...styles.text, fontWeight: 'bold', fontSize: 24 },
    },
    // You can add more styles for other tags like ul, li, etc.
  };

  // The source for RenderHtml must be an object with the html property
  const source = {
    html: `<div>${noteText}</div>`
  };

  return (
    <ViewShot
      ref={ref}
      style={styles.card}
      options={{ format: "jpg", quality: 0.9 }}
    >
      <View style={styles.cardContent}>
        {noteImage ? (
          <Image source={{ uri: noteImage }} style={styles.image} />
        ) : null}
        
        {/* Render the HTML content here */}
        <RenderHtml
          contentWidth={width} // Pass the content width
          source={source}
          renderersProps={renderersProps}
          tagsStyles={{
            body: styles.text, // Default style for all text
            a: { color: '#FFD700' }, // Link color
          }}
        />
        
        <Text style={styles.footer}>✨ My Pocket</Text>
      </View>
    </ViewShot>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
    padding: 16,
    margin: 12,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 5,
  },
  cardContent: {
    alignItems: "center",
  },
  image: {
    width: 220,
    height: 160,
    borderRadius: 12,
    marginBottom: 12,
  },
  text: { // This will now be used as the default style for HTML text
    fontSize: 16,
    color: "#fff",
    textAlign: "left", // Change to left for better reading
    marginBottom: 8,
  },
  footer: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 4,
  },
});