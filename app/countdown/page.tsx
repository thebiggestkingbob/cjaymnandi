import { connection } from 'next/server';
import Countdown from '../../components/countdown';
import { getContactConfig } from '../../lib/contact/config';
export const metadata = {
  title: 'C.JayMnandi — The world opens Wednesday the 18th',
  description: 'The LAX! experience opens Wednesday, 18 November 2026 at 00:00 SAST.',
  robots: { index: false, follow: true },
};
export default async function CountdownPage() { await connection(); return <Countdown serverNow={Date.now()} contactFormsEnabled={getContactConfig().ready}/>; }
