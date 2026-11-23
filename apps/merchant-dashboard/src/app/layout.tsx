import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "سـوقـنا | بوابة الشركاء والتجار",
  description: "لوحة تحكم التجار والشركاء والمطاعم في منصة سوقنا - لقطة في كل حاجة ..",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased min-h-screen bg-souqna-base text-souqna-text-primary">
        {children}
      </body>
    </html>
  );
}
