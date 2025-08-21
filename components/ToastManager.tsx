// app/components/ToastManager.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";
import Toast from "./Toast";

interface ToastContextType {
  showToast: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string, duration?: number) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), duration || 2000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toastMessage && <Toast message={toastMessage} />}
    </ToastContext.Provider>
  );
};
