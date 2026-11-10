import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'C.JayMnandi — LAX!', description: 'Enter the world of C.JayMnandi. LAX! — music, Jupiter Vibez, and what comes next.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
