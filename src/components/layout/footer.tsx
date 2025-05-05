import Link from 'next/link';
import { Home, Settings, Info, BarChart2, Zap } from 'lucide-react'; // Example icons

export default function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground mt-auto shadow-inner">
      <nav className="container mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center text-sm">
        <div className="flex gap-4 mb-2 sm:mb-0">
          <Link href="/" className="flex items-center gap-1 hover:text-primary">
            <Home className="h-4 w-4" /> Dashboard
          </Link>
          <Link href="/settings" className="flex items-center gap-1 hover:text-primary">
            <Settings className="h-4 w-4" /> Settings
          </Link>
          <Link href="/info" className="flex items-center gap-1 hover:text-primary">
            <Info className="h-4 w-4" /> Info
          </Link>
          <Link href="/tariffs" className="flex items-center gap-1 hover:text-primary">
            <BarChart2 className="h-4 w-4" /> Tariffs
          </Link>
          <Link href="/advisory" className="flex items-center gap-1 hover:text-primary">
            <Zap className="h-4 w-4" /> Advisory
          </Link>
        </div>
        <div className="text-xs text-muted-foreground">
          © 2025 Craig Heggie. All rights reserved.
        </div>
      </nav>
    </footer>
  );
}
