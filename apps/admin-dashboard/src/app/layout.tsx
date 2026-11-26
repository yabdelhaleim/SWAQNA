import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "سـوقـنا | لوحة الإدارة العامة والتحكم",
  description: "المركز الرئيسي لإدارة العمليات، المتاجر، المناديب، والطلبات — سـوقـنا",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛒</text></svg>" />
      </head>
      <body className="antialiased min-h-screen bg-souqna-base text-souqna-text-primary">
        {children}
      </body>
    </html>
  );
}
