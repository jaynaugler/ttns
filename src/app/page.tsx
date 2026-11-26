import Image from "next/image";
import Link from "next/link";

import type { Metadata } from "next";

import { Button } from "@/components/ui/button";

// "absolute" so the title stays as written whether or not the root layout
// adds a title template.
export const metadata: Metadata = { title: { absolute: "Home | Take The Next Step" } };

// Landing page: introduce the journey and hand off to the wizard. Step
// content lives on the step pages, not here.
export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center text-center">
      <Image
        src="/hero_image.webp"
        alt=""
        width={4896}
        height={3084}
        preload
        sizes="(max-width: 640px) calc(100vw - 2rem), 656px"
        className="mb-8 h-auto w-full rounded-xl"
      />
      <h1 className="text-3xl font-bold">Take The Next Step</h1>
      <p className="text-muted-foreground mt-3">
        Share your skills and we&apos;ll map the pathways — from the careers
        you match today to the steps that take you further.
      </p>
      <Button size="lg" className="mt-6" nativeButton={false} render={<Link href="/profile" />}>
        Get Started
      </Button>
    </div>
  );
}
