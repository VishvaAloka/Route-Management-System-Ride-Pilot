// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ride Management System',
  description: 'Real-time ride and route management system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning> {/* Add suppressHydrationWarning */}
      <body className={inter.className} suppressHydrationWarning> {/* Add here too */}
        {children} 
        <Toaster position='bottom-right' richColors/>
      </body>
    </html>
  );
}