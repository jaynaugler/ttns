import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
export const instant =false;
export const metadata: Metadata = {
  // Each page sets its own title ("Current Pathways | Take The Next Step");
  // pages without one keep the plain name.
  title: { default: "Take The Next Step", template: "%s | Take The Next Step" },
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
        {/* Skip link: the first Tab stop on every page, shown only when
            focused, so keyboard users can jump past the header and sidebar. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-brand-yellow focus:px-4 focus:py-3 focus:font-bold focus:text-black focus:outline-3 focus:outline-offset-2 focus:outline-brand-red"
        >
          Skip to main content
        </a>
        <Header />
      <div className="flex flex-1">
  <Sidebar />
  <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 flex flex-col px-4 py-6 md:px-8 focus:outline-none">
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
