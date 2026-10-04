import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luma: The Sunseed",
  description: "A joyful forest Metroidvania. Explore the wilds, discover new abilities, and bring the light home.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
