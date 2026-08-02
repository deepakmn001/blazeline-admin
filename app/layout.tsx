import type { Metadata } from "next";
import "./globals.css";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "BlazeLine Admin",
  description:
    "Admin panel for BlazeLine — Building Materials & Interior Commerce Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <TooltipProvider delayDuration={200}>
          {children}
        </TooltipProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}