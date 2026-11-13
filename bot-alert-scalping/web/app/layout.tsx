import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Bot Alert Scalping", template: "%s · Bot Alert Scalping" },
  description: "Alert scalping crypto 15m ke WhatsApp. Tanpa eksekusi order.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
