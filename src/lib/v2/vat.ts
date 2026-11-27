// Country list and VAT (or local equivalent) rules for the invoice step.
// Shared by the browser form and the server, so it must stay free of
// server-only imports.

export interface VatCountry {
  /** Display name in the dropdown. */
  name: string;
  /** What the form calls the tax number in this country. */
  taxName: string;
  /** Prefix the number should start with, added for them if missing. */
  prefix: string;
  /** Example shown in the box. */
  example: string;
  /** Pattern the normalised number must match. null = free text. */
  pattern: RegExp | null;
  /** false = the country has no VAT, so the question is not asked. */
  asks: boolean;
}

export const VAT_COUNTRIES: VatCountry[] = [
  { name: "United Kingdom", taxName: "VAT number", prefix: "GB", example: "GB123456789", pattern: /^GB(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/, asks: true },
  { name: "Netherlands", taxName: "BTW-nummer (btw-id)", prefix: "NL", example: "NL123456789B01", pattern: /^NL\d{9}B\d{2}$/, asks: true },
  { name: "Belgium", taxName: "BTW-nummer / numéro de TVA", prefix: "BE", example: "BE0123456789", pattern: /^BE[01]\d{9}$/, asks: true },
  { name: "Germany", taxName: "USt-IdNr.", prefix: "DE", example: "DE123456789", pattern: /^DE\d{9}$/, asks: true },
  { name: "Austria", taxName: "UID-Nummer", prefix: "AT", example: "ATU12345678", pattern: /^ATU\d{8}$/, asks: true },
  { name: "France", taxName: "Numéro de TVA intracommunautaire", prefix: "FR", example: "FR12345678901", pattern: /^FR[0-9A-Z]{2}\d{9}$/, asks: true },
  { name: "Spain", taxName: "NIF-IVA", prefix: "ES", example: "ESB12345678", pattern: /^ES[0-9A-Z]\d{7}[0-9A-Z]$/, asks: true },
  { name: "Italy", taxName: "Partita IVA", prefix: "IT", example: "IT12345678901", pattern: /^IT\d{11}$/, asks: true },
  { name: "Portugal", taxName: "NIF (IVA)", prefix: "PT", example: "PT123456789", pattern: /^PT\d{9}$/, asks: true },
  { name: "Ireland", taxName: "VAT number", prefix: "IE", example: "IE1234567T", pattern: /^IE(\d{7}[A-Z]{1,2}|\d[A-Z+*]\d{5}[A-Z])$/, asks: true },
  { name: "Luxembourg", taxName: "Numéro de TVA", prefix: "LU", example: "LU12345678", pattern: /^LU\d{8}$/, asks: true },
  { name: "Denmark", taxName: "Momsnummer (CVR)", prefix: "DK", example: "DK12345678", pattern: /^DK\d{8}$/, asks: true },
  { name: "Sweden", taxName: "Momsregistreringsnummer", prefix: "SE", example: "SE123456789001", pattern: /^SE\d{12}$/, asks: true },
  { name: "Finland", taxName: "ALV-numero", prefix: "FI", example: "FI12345678", pattern: /^FI\d{8}$/, asks: true },
  { name: "Poland", taxName: "NIP (VAT UE)", prefix: "PL", example: "PL1234567890", pattern: /^PL\d{10}$/, asks: true },
  { name: "Czech Republic", taxName: "DIČ", prefix: "CZ", example: "CZ12345678", pattern: /^CZ\d{8,10}$/, asks: true },
  { name: "Slovakia", taxName: "IČ DPH", prefix: "SK", example: "SK1234567890", pattern: /^SK\d{10}$/, asks: true },
  { name: "Hungary", taxName: "Közösségi adószám", prefix: "HU", example: "HU12345678", pattern: /^HU\d{8}$/, asks: true },
  { name: "Slovenia", taxName: "ID za DDV", prefix: "SI", example: "SI12345678", pattern: /^SI\d{8}$/, asks: true },
  { name: "Croatia", taxName: "PDV ID (OIB)", prefix: "HR", example: "HR12345678901", pattern: /^HR\d{11}$/, asks: true },
  { name: "Romania", taxName: "Cod de TVA", prefix: "RO", example: "RO1234567", pattern: /^RO\d{2,10}$/, asks: true },
  { name: "Bulgaria", taxName: "ДДС номер (VAT)", prefix: "BG", example: "BG123456789", pattern: /^BG\d{9,10}$/, asks: true },
  { name: "Greece", taxName: "ΑΦΜ (VAT number)", prefix: "EL", example: "EL123456789", pattern: /^EL\d{9}$/, asks: true },
  { name: "Cyprus", taxName: "VAT number (ΦΠΑ)", prefix: "CY", example: "CY12345678X", pattern: /^CY\d{8}[A-Z]$/, asks: true },
  { name: "Malta", taxName: "VAT number", prefix: "MT", example: "MT12345678", pattern: /^MT\d{8}$/, asks: true },
  { name: "Estonia", taxName: "KMKR number", prefix: "EE", example: "EE123456789", pattern: /^EE\d{9}$/, asks: true },
  { name: "Latvia", taxName: "PVN numurs", prefix: "LV", example: "LV12345678901", pattern: /^LV\d{11}$/, asks: true },
  { name: "Lithuania", taxName: "PVM mokėtojo kodas", prefix: "LT", example: "LT123456789", pattern: /^LT(\d{9}|\d{12})$/, asks: true },
  { name: "Norway", taxName: "MVA-nummer", prefix: "NO", example: "NO123456789MVA", pattern: /^NO\d{9}MVA$/, asks: true },
  { name: "Switzerland", taxName: "MWST-Nummer / UID", prefix: "CHE", example: "CHE-123.456.789 MWST", pattern: /^CHE\d{9}(MWST|TVA|IVA)?$/, asks: true },
  { name: "Australia", taxName: "ABN (GST registered)", prefix: "", example: "51 824 753 556", pattern: /^\d{11}$/, asks: true },
  { name: "Canada", taxName: "GST/HST number", prefix: "", example: "123456789 RT0001", pattern: /^\d{9}RT\d{4}$/, asks: true },
  { name: "New Zealand", taxName: "GST number", prefix: "", example: "123-456-789", pattern: /^\d{8,9}$/, asks: true },
  { name: "United States", taxName: "", prefix: "", example: "", pattern: null, asks: false },
  { name: "Other", taxName: "Tax number (VAT, GST or similar)", prefix: "", example: "", pattern: null, asks: true },
];

export const VAT_COUNTRY_NAMES = VAT_COUNTRIES.map((c) => c.name);

export function findVatCountry(name: string): VatCountry | undefined {
  return VAT_COUNTRIES.find((c) => c.name === name);
}

/** Uppercase, strip spaces, dots and dashes, and add the country prefix if it is missing. */
export function normaliseVat(country: VatCountry, raw: string): string {
  let v = raw.toUpperCase().replace(/[\s.\-]/g, "");
  if (!country.pattern) return raw.trim();
  if (country.prefix && !v.startsWith(country.prefix)) {
    // Greece's VAT prefix is EL; people often type GR.
    if (country.prefix === "EL" && v.startsWith("GR")) v = v.slice(2);
    v = country.prefix + v;
  }
  return v;
}

/** Returns an error message, or null when the number is acceptable. */
export function vatError(countryName: string, raw: string): string | null {
  const country = findVatCountry(countryName);
  if (!country || !country.asks) return null;
  if (!raw.trim()) return `Please enter your ${country.taxName}`;
  if (!country.pattern) return raw.trim().length > 100 ? "That looks too long" : null;
  const v = normaliseVat(country, raw);
  return country.pattern.test(v)
    ? null
    : `That doesn't look like a ${country.taxName}. It should look like ${country.example}`;
}
