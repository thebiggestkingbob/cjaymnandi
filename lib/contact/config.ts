import 'server-only';

export function getContactConfig() {
  const supportEmail = process.env.CONTACT_SUPPORT_EMAIL?.trim() || '';
  const operatorName = process.env.CONTACT_OPERATOR_NAME?.trim() || '';
  const privacyApproved = process.env.CONTACT_PRIVACY_APPROVED === 'true';
  const ready = process.env.CONTACT_FORMS_ENABLED === 'true' && privacyApproved &&
    Boolean(operatorName && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail) &&
      process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
  return { ready, supportEmail, operatorName, privacyApproved };
}
