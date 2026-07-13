export interface CountryCode {
  name: string;
  dialCode: string;
  iso: string;
}

// Sri Lanka first since every OKI International School branch (Wattala,
// Kandana, Kiribathgoda, Kaduwela, Biyagama, Negombo) is local — most
// parent phone numbers will use it. Followed by a broader list covering
// expat/international families and common travel destinations.
export const COUNTRY_CODES: CountryCode[] = [
  { name: "Sri Lanka", dialCode: "+94", iso: "LK" },
  { name: "India", dialCode: "+91", iso: "IN" },
  { name: "United Kingdom", dialCode: "+44", iso: "GB" },
  { name: "United States / Canada", dialCode: "+1", iso: "US" },
  { name: "Australia", dialCode: "+61", iso: "AU" },
  { name: "United Arab Emirates", dialCode: "+971", iso: "AE" },
  { name: "Saudi Arabia", dialCode: "+966", iso: "SA" },
  { name: "Qatar", dialCode: "+974", iso: "QA" },
  { name: "Kuwait", dialCode: "+965", iso: "KW" },
  { name: "Singapore", dialCode: "+65", iso: "SG" },
  { name: "Maldives", dialCode: "+960", iso: "MV" },
  { name: "New Zealand", dialCode: "+64", iso: "NZ" },
  { name: "Germany", dialCode: "+49", iso: "DE" },
  { name: "France", dialCode: "+33", iso: "FR" },
  { name: "Italy", dialCode: "+39", iso: "IT" },
  { name: "Japan", dialCode: "+81", iso: "JP" },
  { name: "China", dialCode: "+86", iso: "CN" },
  { name: "South Korea", dialCode: "+82", iso: "KR" },
  { name: "Malaysia", dialCode: "+60", iso: "MY" },
  { name: "Thailand", dialCode: "+66", iso: "TH" },
  { name: "Pakistan", dialCode: "+92", iso: "PK" },
  { name: "Bangladesh", dialCode: "+880", iso: "BD" },
  { name: "Nepal", dialCode: "+977", iso: "NP" },
  { name: "South Africa", dialCode: "+27", iso: "ZA" },
];

export const DEFAULT_COUNTRY_DIAL_CODE = "+94";
