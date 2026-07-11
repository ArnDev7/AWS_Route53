import type { Metadata } from "next";
import "./globals.css";
import { NotificationProvider } from "@/utils/NotificationContext";
import ConsoleLayout from "@/components/ConsoleLayout";

export const metadata: Metadata = {
  title: "AWS Route 53 Console",
  description: "Route 53 Management Console Clone with FastAPI and SQLite storage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <NotificationProvider>
          <ConsoleLayout>{children}</ConsoleLayout>
        </NotificationProvider>
      </body>
    </html>
  );
}
