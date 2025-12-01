import type { Metadata } from "next";
import "./globals.css";
import styles from "./layout.module.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "일일 업무 관리 - ililcheck",
  description: "프로젝트와 작업을 관리하고 일일 보고서를 작성하세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${styles.body} font-sans`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
