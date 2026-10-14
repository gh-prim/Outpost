import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outpost",
  description: "Self-hosted, open source API platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
