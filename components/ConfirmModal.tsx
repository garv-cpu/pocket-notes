// components/ConfirmModal.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { Modal, Portal, Text, Button, useTheme } from "react-native-paper";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  const theme = useTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onCancel}
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text variant="titleMedium" style={[styles.title, { color: theme.colors.primary }]}>
          {title}
        </Text>
        <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurface }]}>
          {message}
        </Text>
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={onCancel}
            style={styles.button}
            labelStyle={{ color: theme.colors.primary }}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={onConfirm}
            style={styles.button}
            labelStyle={{ color: "#000" }}
          >
            Confirm
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
  },
  title: {
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    marginBottom: 20,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
});

export default ConfirmModal;
