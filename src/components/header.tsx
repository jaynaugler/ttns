import React from 'react';

export function Header() {
  return (
    <header className="border-b px-4 md:px-8 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="font-bold text-xl">
          <a href="/" className="hover:no-underline">TTNS Project</a>
        </div>
        <nav aria-label="Primary">
          <ul className="flex gap-6 text-sm font-medium">
            <li><a href="/">Home</a></li>
            <li><a href="/about">About</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
