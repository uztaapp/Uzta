import { currentLanguage } from "./language";
export function pickupDate(value: string) {
  const locale = currentLanguage() === "en" ? "en-GB" : currentLanguage();
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "Europe/Madrid",
  }).format(new Date(value + "T12:00:00Z"));
}
