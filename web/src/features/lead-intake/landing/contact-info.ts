// Business contact details for the landing page, from optional server env vars
// (CONTACT_PHONE, CONTACT_EMAIL, CONTACT_ADDRESS, CONTACT_HOURS). Empty -> not shown.
// businessContact() fills phone + email from DEFAULT_CONTACT when the env leaves them unset.

export type ContactInfo = {
  phone: string | null;
  phoneHref: string | null;
  /** zalo.me link derived from a Vietnamese phone number (+84 / 84 / 0), else null. */
  zaloHref: string | null;
  email: string | null;
  address: string | null;
  hours: string | null;
};

type Env = Record<string, string | undefined>;

const clean = (v: string | undefined, max = 200): string | null => {
  const s = v?.trim();
  return s ? s.slice(0, max) : null;
};

export function contactInfoFromEnv(env: Env): ContactInfo {
  const phone = clean(env.CONTACT_PHONE, 30);
  const digits = phone?.replace(/[^\d+]/g, "") ?? "";
  const email = clean(env.CONTACT_EMAIL, 254);
  const local = digits.replace(/^\+?84/, "0");
  return {
    phone,
    phoneHref: /^\+?\d{6,15}$/.test(digits) ? `tel:${digits}` : null,
    zaloHref: /^0\d{8,10}$/.test(local) ? `https://zalo.me/${local}` : null,
    email: email && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email) ? email : null,
    address: clean(env.CONTACT_ADDRESS),
    hours: clean(env.CONTACT_HOURS),
  };
}

/** Quote channels shown on the site: email, Zalo and calls (the phone serves both). */
export const DEFAULT_CONTACT = { CONTACT_PHONE: "0903 003 882", CONTACT_EMAIL: "tque36@gmail.com" } as const;

/** Site contact: CONTACT_* env, with DEFAULT_CONTACT for an unset phone / email. */
export function businessContact(env: Env = process.env): ContactInfo {
  return contactInfoFromEnv({
    ...env,
    CONTACT_PHONE: env.CONTACT_PHONE?.trim() || DEFAULT_CONTACT.CONTACT_PHONE,
    CONTACT_EMAIL: env.CONTACT_EMAIL?.trim() || DEFAULT_CONTACT.CONTACT_EMAIL,
  });
}

export function hasContactInfo(c: ContactInfo): boolean {
  return Boolean(c.phone || c.email || c.address || c.hours);
}
