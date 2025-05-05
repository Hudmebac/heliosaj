import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground mt-auto shadow-inner">
      <nav className="container mx-auto px-4 py-3 flex flex-col sm:flex-row justify-center items-center text-sm">
        {/* Navigation Links Removed */}
        <div className="text-xs text-muted-foreground">
          © 2025 Craig Heggie. All rights reserved.
        </div>
      </nav>
    </footer>
  );
}
