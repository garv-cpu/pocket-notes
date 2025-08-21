import { createContext, ReactNode, useContext, useState } from "react";

interface ShareData {
  noteText: string;
  noteImage?: string;
}

const ShareContext = createContext<{
  shareData: ShareData;
  setShareData: (data: ShareData) => void;
} | null>(null);

export const ShareProvider = ({ children }: { children: ReactNode }) => {
  const [shareData, setShareData] = useState<ShareData>({
    noteText: "",
    noteImage: "",
  });

  return (
    <ShareContext.Provider value={{ shareData, setShareData }}>
      {children}
    </ShareContext.Provider>
  );
};

export const useShare = () => {
  const context = useContext(ShareContext);
  if (!context) throw new Error("useShare must be used inside ShareProvider");
  return context;
};
