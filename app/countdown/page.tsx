import { connection } from 'next/server';
import Countdown from '../../components/countdown';
export const metadata = {
  title: 'C.JayMnandi — The world opens Friday the 13th',
  description: 'The LAX! experience opens Friday, 13 November 2026 at 12:00 SAST.',
  robots: { index: false, follow: true },
};
export default async function CountdownPage() { await connection(); return <Countdown serverNow={Date.now()}/>; }
