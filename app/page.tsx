import Experience from '../components/experience';
import { getContactConfig } from '../lib/contact/config';
export default function Home(){const config=getContactConfig();return <Experience contactFormsEnabled={config.ready} supportEmail={config.supportEmail}/>}
