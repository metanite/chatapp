import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat — a quieter place to talk",
  description: "A simple real-time chat application.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
