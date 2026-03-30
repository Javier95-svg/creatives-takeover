/**
 * Gets the flag emoji for a country name or country code.
 * Supports common country names and ISO 3166-1 alpha-2 codes.
 * 
 * @param country - Country name (e.g., "USA", "United States") or country code (e.g., "US")
 * @returns Flag emoji string or empty string if not found
 */
export function getCountryFlag(country: string | null | undefined): string {
  if (!country) return '';
  
  const normalizedCountry = country.trim().toUpperCase();
  
  // Common country mappings to flag emojis
  const countryFlags: Record<string, string> = {
    // Country codes (ISO 3166-1 alpha-2)
    'US': '🇺🇸',
    'USA': '🇺🇸',
    'UNITED STATES': '🇺🇸',
    'UNITED STATES OF AMERICA': '🇺🇸',
    'GB': '🇬🇧',
    'UK': '🇬🇧',
    'UNITED KINGDOM': '🇬🇧',
    'CA': '🇨🇦',
    'CANADA': '🇨🇦',
    'AU': '🇦🇺',
    'AUSTRALIA': '🇦🇺',
    'DE': '🇩🇪',
    'GERMANY': '🇩🇪',
    'FR': '🇫🇷',
    'FRANCE': '🇫🇷',
    'IT': '🇮🇹',
    'ITALY': '🇮🇹',
    'ES': '🇪🇸',
    'SPAIN': '🇪🇸',
    'NL': '🇳🇱',
    'NETHERLANDS': '🇳🇱',
    'SE': '🇸🇪',
    'SWEDEN': '🇸🇪',
    'NO': '🇳🇴',
    'NORWAY': '🇳🇴',
    'DK': '🇩🇰',
    'DENMARK': '🇩🇰',
    'FI': '🇫🇮',
    'FINLAND': '🇫🇮',
    'LT': '🇱🇹',
    'LITHUANIA': '🇱🇹',
    'PL': '🇵🇱',
    'POLAND': '🇵🇱',
    'IE': '🇮🇪',
    'IRELAND': '🇮🇪',
    'BE': '🇧🇪',
    'BELGIUM': '🇧🇪',
    'CH': '🇨🇭',
    'SWITZERLAND': '🇨🇭',
    'AT': '🇦🇹',
    'AUSTRIA': '🇦🇹',
    'PT': '🇵🇹',
    'PORTUGAL': '🇵🇹',
    'GR': '🇬🇷',
    'GREECE': '🇬🇷',
    'CZ': '🇨🇿',
    'CZECH REPUBLIC': '🇨🇿',
    'BR': '🇧🇷',
    'BRAZIL': '🇧🇷',
    'CR': '🇨🇷',
    'COSTA RICA': '🇨🇷',
    'MX': '🇲🇽',
    'MEXICO': '🇲🇽',
    'AR': '🇦🇷',
    'ARGENTINA': '🇦🇷',
    'CL': '🇨🇱',
    'CHILE': '🇨🇱',
    'CO': '🇨🇴',
    'COLOMBIA': '🇨🇴',
    'IN': '🇮🇳',
    'INDIA': '🇮🇳',
    'CN': '🇨🇳',
    'CHINA': '🇨🇳',
    'JP': '🇯🇵',
    'JAPAN': '🇯🇵',
    'KR': '🇰🇷',
    'SOUTH KOREA': '🇰🇷',
    'SG': '🇸🇬',
    'SINGAPORE': '🇸🇬',
    'HK': '🇭🇰',
    'HONG KONG': '🇭🇰',
    'TW': '🇹🇼',
    'TAIWAN': '🇹🇼',
    'NZ': '🇳🇿',
    'NEW ZEALAND': '🇳🇿',
    'ZA': '🇿🇦',
    'SOUTH AFRICA': '🇿🇦',
    'NG': '🇳🇬',
    'NGA': '🇳🇬',
    'NIGERIA': '🇳🇬',
    'NIGERIAN': '🇳🇬',
    'IL': '🇮🇱',
    'ISRAEL': '🇮🇱',
    'AE': '🇦🇪',
    'UNITED ARAB EMIRATES': '🇦🇪',
    'UAE': '🇦🇪',
    'TR': '🇹🇷',
    'TURKEY': '🇹🇷',
    'RU': '🇷🇺',
    'RUSSIA': '🇷🇺',
    'KZ': '🇰🇿',
    'KAZAKHSTAN': '🇰🇿',
    'UA': '🇺🇦',
    'UKRAINE': '🇺🇦',
    'PK': '🇵🇰',
    'PAKISTAN': '🇵🇰',
    'RO': '🇷🇴',
    'ROMANIA': '🇷🇴',
    'AM': '🇦🇲',
    'ARMENIA': '🇦🇲',
    'LB': '🇱🇧',
    'LEBANON': '🇱🇧',
    'BA': '🇧🇦',
    'BOSNIA': '🇧🇦',
    'BOSNIA AND HERZEGOVINA': '🇧🇦',
    'BOSNIA & HERZEGOVINA': '🇧🇦',
  };
  
  // Check direct match
  if (countryFlags[normalizedCountry]) {
    return countryFlags[normalizedCountry];
  }
  
  // Try to generate flag from country code if it's a valid 2-letter code
  if (normalizedCountry.length === 2) {
    return getFlagEmojiFromCode(normalizedCountry);
  }
  
  return '';
}

/**
 * Generates a flag emoji from ISO 3166-1 alpha-2 country code.
 * Uses regional indicator symbols to construct the flag emoji.
 * 
 * @param code - Two-letter country code (e.g., "US")
 * @returns Flag emoji string
 */
function getFlagEmojiFromCode(code: string): string {
  if (code.length !== 2) return '';
  
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  
  return String.fromCodePoint(...codePoints);
}

