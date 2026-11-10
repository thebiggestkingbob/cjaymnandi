import Link from 'next/link';
import { getContactConfig } from '../../lib/contact/config';
export const metadata = { title: 'Privacy — C.JayMnandi' };
export default function PrivacyPage() {
  const {privacyApproved, operatorName, supportEmail} = getContactConfig();
  return <main className="privacy-page"><Link href="/">C.JayMnandi / Return to the experience</Link><h1>Privacy.</h1>
    {!privacyApproved || !operatorName || !supportEmail ? <><p>Our privacy notice is being prepared. Mailing-list signup and online booking enquiries are not open yet.</p><p>Music players are provided by Spotify and YouTube. Those services may receive technical information such as your IP address when your browser connects to them, and apply their own privacy and cookie policies.</p></> : <>
      <p>{operatorName} operates this website. Contact <a href={`mailto:${supportEmail}`}>{supportEmail}</a> about your personal information or to withdraw mailing-list consent.</p>
      <h2>Mailing-list requests</h2><p>We store your email address, signup time and the consent you provide so we can manage music and release updates. Signup is optional and separate from booking or purchase enquiries.</p>
      <h2>Booking enquiries</h2><p>We store your name, email, message and any event date or location you choose to provide, so we can consider and respond to your enquiry. An enquiry does not confirm a booking.</p>
      <h2>Storage and access</h2><p>Requests are stored using Supabase and processed by our website hosting provider, Vercel. Only authorised people may access them. Processing may take place outside your country. Basic request limits use a hashed network identifier to reduce spam; old request-limit entries are cleared when new requests are processed.</p>
      <h2>Your choices</h2><p>Contact us to request access, correction or deletion, or to stop release updates. We keep enquiry details only while needed to respond and manage the request, and mailing details while you consent to updates, subject to any applicable legal requirements.</p>
    </>}
    <h2>Embedded music and videos</h2><p>Spotify and YouTube operate their own players. Their availability, playback limits and cookies are controlled by those providers. Read the <a href="https://www.spotify.com/legal/privacy-policy/" target="_blank" rel="noreferrer">Spotify privacy policy</a> and <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google privacy policy</a>.</p>
  </main>;
}
