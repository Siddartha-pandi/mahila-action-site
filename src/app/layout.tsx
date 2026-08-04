import React from "react";
import "@/styles/globals.css";
import type { Metadata } from "next";
import { TooltipProvider } from "@/app/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Mahila Action — Empowering Women & Community",
  description: "Mahila Action works towards empowering women through leadership, education, livelihood skills, and community action.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="h-full">
        <TooltipProvider>
          <div id="root" className="h-full">{children}</div>
        </TooltipProvider>
      </body>
    </html>
  );
}
