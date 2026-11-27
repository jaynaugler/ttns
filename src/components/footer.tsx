// Super sexy shared site-wide footer rendered from src/app/layout.tsx

export function Footer() {
  return (
    <footer className="border-t">
      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-6">
        <p className="text-sm text-center">
          © 2026 NSCC Class of 2027. All rights reserved.
        </p>
        <p className="mt-1 text-xs text-center text-foreground/70">
          Unless stated otherwise, images are sourced from{" "}
          <a
            href="https://unsplash.com/license"
            className="underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            Unsplash
          </a>
          .
        </p>
      </div>
    </footer>
  );
}