"use client";
import { zedSans, zedMono } from "./fonts";
import "@/styles/globals.css";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${zedSans.className} ${zedMono.className} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
