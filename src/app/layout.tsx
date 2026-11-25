import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
export const instant =false;
export const metadata: Metadata = {
  title: "Take The Next Step",
  description:
    "Share your skills and map the pathways from the careers you match today to a concrete plan for your next step.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <Header />
      <div className="flex flex-1">
  <Sidebar />
  <main className="min-w-0 flex-1 flex flex-col px-4 py-6 md:px-8">
    <div className="mx-auto w-full max-w-5xl flex-1">
      {children}
    </div>
  </main>
</div>
        <Footer />
      </body>
    </html>
  );
}
