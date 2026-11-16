/**
 * Countries for customer research ("Where"): ISO 3166-1 alpha-2 codes, names,
 * regions for quick picks, and other names an address may use. Import-free so
 * the app and the edge functions share it.
 */

export type ResearchRegion = 'Europe' | 'North America' | 'Latin America' | 'Middle East & North Africa' | 'Sub-Saharan Africa' | 'Asia' | 'Oceania';

export interface ResearchCountry { code: string; name: string; region: ResearchRegion; aliases: string[] }

// code|name|region key|other names (comma separated)
const RAW = `
AL|Albania|EU|Shqipëri
AD|Andorra|EU|
AT|Austria|EU|Österreich
BY|Belarus|EU|
BE|Belgium|EU|Belgique,België
BA|Bosnia and Herzegovina|EU|Bosnia
BG|Bulgaria|EU|
HR|Croatia|EU|Hrvatska
CY|Cyprus|EU|
CZ|Czechia|EU|Czech Republic
DK|Denmark|EU|Danmark
EE|Estonia|EU|Eesti
FI|Finland|EU|Suomi
FR|France|EU|
DE|Germany|EU|Deutschland
GR|Greece|EU|Hellas
HU|Hungary|EU|Magyarország
IS|Iceland|EU|Ísland
IE|Ireland|EU|Éire
IT|Italy|EU|Italia
XK|Kosovo|EU|
LV|Latvia|EU|Latvija
LI|Liechtenstein|EU|
LT|Lithuania|EU|Lietuva
LU|Luxembourg|EU|
MT|Malta|EU|
MD|Moldova|EU|
MC|Monaco|EU|
ME|Montenegro|EU|
NL|Netherlands|EU|Nederland,Holland,The Netherlands
MK|North Macedonia|EU|Macedonia
NO|Norway|EU|Norge
PL|Poland|EU|Polska
PT|Portugal|EU|
RO|Romania|EU|România
RU|Russia|EU|Russian Federation
SM|San Marino|EU|
RS|Serbia|EU|Srbija
SK|Slovakia|EU|Slovensko
SI|Slovenia|EU|Slovenija
ES|Spain|EU|España,Espana
SE|Sweden|EU|Sverige
CH|Switzerland|EU|Schweiz,Suisse,Svizzera
UA|Ukraine|EU|Україна
GB|United Kingdom|EU|UK,U.K.,Great Britain,Britain,England,Scotland,Wales,Northern Ireland
US|United States|NA|USA,U.S.A.,U.S.,United States of America
CA|Canada|NA|
AR|Argentina|LA|
BS|Bahamas|LA|
BB|Barbados|LA|
BZ|Belize|LA|
BO|Bolivia|LA|
BR|Brazil|LA|Brasil
CL|Chile|LA|
CO|Colombia|LA|
CR|Costa Rica|LA|
CU|Cuba|LA|
DO|Dominican Republic|LA|República Dominicana
EC|Ecuador|LA|
SV|El Salvador|LA|
GT|Guatemala|LA|
GY|Guyana|LA|
HT|Haiti|LA|Haïti
HN|Honduras|LA|
JM|Jamaica|LA|
MX|Mexico|LA|México
NI|Nicaragua|LA|
PA|Panama|LA|Panamá
PY|Paraguay|LA|
PE|Peru|LA|Perú
PR|Puerto Rico|LA|
SR|Suriname|LA|
TT|Trinidad and Tobago|LA|
UY|Uruguay|LA|
VE|Venezuela|LA|
DZ|Algeria|MENA|Algérie
BH|Bahrain|MENA|
EG|Egypt|MENA|
IR|Iran|MENA|
IQ|Iraq|MENA|
IL|Israel|MENA|
JO|Jordan|MENA|
KW|Kuwait|MENA|
LB|Lebanon|MENA|Liban
LY|Libya|MENA|
MA|Morocco|MENA|Maroc
OM|Oman|MENA|
PS|Palestine|MENA|
QA|Qatar|MENA|
SA|Saudi Arabia|MENA|KSA
SY|Syria|MENA|
TN|Tunisia|MENA|Tunisie
TR|Türkiye|MENA|Turkey
AE|United Arab Emirates|MENA|UAE,U.A.E.,Dubai,Abu Dhabi
YE|Yemen|MENA|
AO|Angola|SSA|
BJ|Benin|SSA|Bénin
BW|Botswana|SSA|
BF|Burkina Faso|SSA|
BI|Burundi|SSA|
CV|Cabo Verde|SSA|Cape Verde
CM|Cameroon|SSA|Cameroun
CF|Central African Republic|SSA|
TD|Chad|SSA|Tchad
KM|Comoros|SSA|
CG|Congo|SSA|Republic of the Congo
CD|DR Congo|SSA|Democratic Republic of the Congo
CI|Côte d'Ivoire|SSA|Ivory Coast,Cote d'Ivoire
DJ|Djibouti|SSA|
GQ|Equatorial Guinea|SSA|
ER|Eritrea|SSA|
SZ|Eswatini|SSA|Swaziland
ET|Ethiopia|SSA|
GA|Gabon|SSA|
GM|Gambia|SSA|
GH|Ghana|SSA|
GN|Guinea|SSA|
GW|Guinea-Bissau|SSA|
KE|Kenya|SSA|
LS|Lesotho|SSA|
LR|Liberia|SSA|
MG|Madagascar|SSA|
MW|Malawi|SSA|
ML|Mali|SSA|
MR|Mauritania|SSA|
MU|Mauritius|SSA|
MZ|Mozambique|SSA|
NA|Namibia|SSA|
NE|Niger|SSA|
NG|Nigeria|SSA|
RW|Rwanda|SSA|
SN|Senegal|SSA|Sénégal
SC|Seychelles|SSA|
SL|Sierra Leone|SSA|
SO|Somalia|SSA|
ZA|South Africa|SSA|
SS|South Sudan|SSA|
SD|Sudan|SSA|
TZ|Tanzania|SSA|
TG|Togo|SSA|
UG|Uganda|SSA|
ZM|Zambia|SSA|
ZW|Zimbabwe|SSA|
AF|Afghanistan|AS|
AM|Armenia|AS|
AZ|Azerbaijan|AS|
BD|Bangladesh|AS|
BT|Bhutan|AS|
BN|Brunei|AS|
KH|Cambodia|AS|
CN|China|AS|PRC
GE|Georgia|AS|
HK|Hong Kong|AS|
IN|India|AS|Bharat
ID|Indonesia|AS|
JP|Japan|AS|
KZ|Kazakhstan|AS|
KG|Kyrgyzstan|AS|
LA|Laos|AS|
MO|Macao|AS|Macau
MY|Malaysia|AS|
MV|Maldives|AS|
MN|Mongolia|AS|
MM|Myanmar|AS|Burma
NP|Nepal|AS|
KP|North Korea|AS|
PK|Pakistan|AS|
PH|Philippines|AS|
SG|Singapore|AS|
KR|South Korea|AS|Korea,Republic of Korea
LK|Sri Lanka|AS|
TW|Taiwan|AS|
TJ|Tajikistan|AS|
TH|Thailand|AS|
TL|Timor-Leste|AS|East Timor
TM|Turkmenistan|AS|
UZ|Uzbekistan|AS|
VN|Vietnam|AS|Viet Nam
AU|Australia|OC|
FJ|Fiji|OC|
NZ|New Zealand|OC|Aotearoa
PG|Papua New Guinea|OC|
WS|Samoa|OC|
`;

const REGIONS: Record<string, ResearchRegion> = {
  EU: 'Europe', NA: 'North America', LA: 'Latin America', MENA: 'Middle East & North Africa', SSA: 'Sub-Saharan Africa', AS: 'Asia', OC: 'Oceania',
};

export const RESEARCH_COUNTRIES: readonly ResearchCountry[] = RAW.trim().split('\n').map((line) => {
  const [code, name, region, aliases] = line.split('|');
  return { code, name, region: REGIONS[region], aliases: aliases ? aliases.split(',').map((alias) => alias.trim()).filter(Boolean) : [] };
}).sort((a, b) => a.name.localeCompare(b.name));

export const RESEARCH_REGIONS: readonly ResearchRegion[] = ['Europe', 'North America', 'Latin America', 'Middle East & North Africa', 'Sub-Saharan Africa', 'Asia', 'Oceania'];

const BY_CODE = new Map(RESEARCH_COUNTRIES.map((country) => [country.code, country]));

export const countryByCode = (code: string) => BY_CODE.get(code.toUpperCase()) ?? null;
export const countryNames = (codes: readonly string[]) => codes.map((code) => countryByCode(code)?.name ?? code);

/** Valid, unique codes in the order given. */
export function cleanCountryCodes(codes: unknown): string[] {
  if (!Array.isArray(codes)) return [];
  const seen = new Set<string>();
  return codes.flatMap((code) => {
    const upper = typeof code === 'string' ? code.trim().toUpperCase() : '';
    if (!BY_CODE.has(upper) || seen.has(upper)) return [];
    seen.add(upper);
    return [upper];
  }).slice(0, 60);
}

const fold = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const PATTERNS = RESEARCH_COUNTRIES.map((country) => ({
  code: country.code,
  pattern: new RegExp(`(?<![\\p{L}])(${[country.name, ...country.aliases].map((name) => fold(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}])`, 'u'),
}));

/** Countries named in free text ("Spain and Peru", "Leeds, UK"), in the order found. */
export function countriesInText(text: string | null | undefined): string[] {
  const folded = fold(text ?? '');
  if (!folded.trim()) return [];
  return PATTERNS.filter(({ pattern }) => pattern.test(folded)).map(({ code }) => code);
}

// Country web endings that are widely sold as generic names, so they say
// nothing about where an organisation is.
const GENERIC_CCTLDS = new Set(['io', 'co', 'ai', 'me', 'tv', 'fm', 'ly', 'so', 'gg', 'am', 'to', 'cc', 'ws', 'la', 'is', 'it', 'sh', 'ac', 'vc', 'gl', 'im', 'xyz']);

/** The country a domain's ending names (".es" -> ES, ".co.uk" -> GB), when it is a real country signal. */
export function countryFromDomain(domain: string): string | null {
  const tld = domain.toLowerCase().split('.').pop() ?? '';
  if (tld.length !== 2 || GENERIC_CCTLDS.has(tld)) return null;
  const code = tld === 'uk' ? 'GB' : tld.toUpperCase();
  return BY_CODE.has(code) ? code : null;
}

/** "Spain", "Spain and Peru", "Spain, Peru and 3 more", or "Any country". */
export function describeCountries(codes: readonly string[]): string {
  const names = countryNames(codes);
  if (!names.length) return 'Any country';
  if (names.length <= 3) return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}
