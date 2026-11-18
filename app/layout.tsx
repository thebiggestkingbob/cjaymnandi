import type { Metadata } from 'next';
import './globals.css';
import SiteMusic from '../components/site-music';
export const metadata: Metadata = { title: 'C.JayMnandi — LAX!', description: 'Enter the world of C.JayMnandi. LAX! — music, Jupiter Vibez, and what comes next.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><head><link rel="preconnect" href="https://open.spotify.com"/><link rel="preconnect" href="https://www.youtube.com"/><link rel="preconnect" href="https://i.ytimg.com"/></head><body><SiteMusic>{children}</SiteMusic></body></html>; }
