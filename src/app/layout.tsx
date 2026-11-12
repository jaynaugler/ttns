import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "Take The Next Step",
  description:
    "Share your skills and map the pathways from the careers you match today to a concrete plan for your next step.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="min-w-0 flex-1 p-6">
            {children}
          </main>
        </div>
        <Footer />
      </body>
    </html>
  );
}
