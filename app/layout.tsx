import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sakeena - سَكِينَة",
  description:
    "A tranquil platform for accurate prayer times worldwide.",
  keywords: [
    "prayer times",
    "sakeena",
    "islamic prayer",
    "adhan",
    "muslim",
    "ramadan",
    "islamic calendar",
    "مواقيت الصلاة",
    "سكينة",
    "سَكِينَة",
    "أذان",
    "صلاة",
    "مسلم",
    "رمضان",
    "تقويم إسلامي",
  ],
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
