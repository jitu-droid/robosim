'use client';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const navLinks = [
  { href: '#service', label: 'Service', icon: '☁️' },
  { href: '#robots', label: 'Robot Apps', icon: '🤖' },
  { href: '#worlds', label: 'WorldForge', icon: '🌍' },
  { href: '#jobs', label: 'Jobs', icon: '🚀' },
  { href: '#simulation', label: 'Viewer', icon: '📺' },
  { href: '#analytics', label: 'Analytics', icon: '📊' },
];

export default function AppNav() {
  const [activeLink, setActiveLink] = useState('');
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Handle sticky nav
      setIsSticky(window.scrollY > 100);
      
      // Handle active link
      const sections = navLinks.map(link => document.querySelector(link.href));
      const scrollPosition = window.scrollY + 150;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && (section as HTMLElement).offsetTop <= scrollPosition) {
          setActiveLink(navLinks[i].href);
          return;
        }
      }
      setActiveLink('');
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={cn(
      "flex gap-x-6 gap-y-3 md:gap-x-10 py-4 md:py-6 border-b border-border mb-8 overflow-x-auto whitespace-nowrap md:flex-wrap transition-all duration-300",
      isSticky && "sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b-primary/30 shadow-lg shadow-primary/5"
    )}>
      {navLinks.map(({ href, label, icon }) => (
        <a
          key={href}
          href={href}
          className={cn(
            'shrink-0 text-xs md:text-sm uppercase tracking-[1.5px] pb-2 border-b-2 transition-all duration-300 flex items-center gap-2 group',
            activeLink === href
              ? 'text-foreground border-primary scale-105'
              : 'text-muted-foreground border-transparent hover:text-foreground hover:border-primary/50'
          )}
        >
          <span className="group-hover:scale-110 transition-transform">{icon}</span>
          {label}
        </a>
      ))}
    </nav>
  );
}
