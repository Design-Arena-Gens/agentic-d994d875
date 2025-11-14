import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Serene Cat by the Stream",
  description:
    "A tranquil animated scene of a cat strolling along a stream, relaxing under the gentle sounds of nature."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
