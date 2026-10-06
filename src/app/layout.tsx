import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import CustomCursor from '@/components/app/custom-cursor';

export const metadata: Metadata = {
  title: 'RoboSim',
  description: 'A robot path planning and simulation system',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700&family=Inter:wght@400&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background px-6 sm:px-12 md:px-24">
        <CustomCursor />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
