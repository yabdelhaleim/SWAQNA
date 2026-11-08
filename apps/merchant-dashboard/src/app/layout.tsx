import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "حواديت - لوحة تحكم التاجر",
  description: "لوحة تحكم أصحاب المطاعم والمحلات والمطابخ المنزلية في منصة حواديت",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased min-h-screen bg-[#fffbf2]">
        {children}
      </body>
    </html>
  );
}
