// Where a visitor can say they're from, for the globe on /about: one point per country (its capital or
// main business city), with that city's IANA time zone so offsets follow daylight saving.

export type Place = { id: string; name: string; city: string; lat: number; lon: number; tz: string };

export const HOME: Place = {
  id: "home",
  name: "India",
  city: "Hyderabad",
  lat: 17.385,
  lon: 78.487,
  tz: "Asia/Kolkata",
};

const P = (name: string, city: string, lat: number, lon: number, tz: string): Place => ({
  id: `${name}-${city}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  name,
  city,
  lat,
  lon,
  tz,
});

export const PLACES: Place[] = [
  P("Argentina", "Buenos Aires", -34.6, -58.38, "America/Argentina/Buenos_Aires"),
  P("Australia", "Sydney", -33.87, 151.21, "Australia/Sydney"),
  P("Australia", "Perth", -31.95, 115.86, "Australia/Perth"),
  P("Austria", "Vienna", 48.21, 16.37, "Europe/Vienna"),
  P("Bahrain", "Manama", 26.23, 50.59, "Asia/Bahrain"),
  P("Bangladesh", "Dhaka", 23.81, 90.41, "Asia/Dhaka"),
  P("Belgium", "Brussels", 50.85, 4.35, "Europe/Brussels"),
  P("Brazil", "São Paulo", -23.55, -46.63, "America/Sao_Paulo"),
  P("Canada", "Toronto", 43.65, -79.38, "America/Toronto"),
  P("Canada", "Vancouver", 49.28, -123.12, "America/Vancouver"),
  P("Chile", "Santiago", -33.45, -70.67, "America/Santiago"),
  P("China", "Beijing", 39.9, 116.41, "Asia/Shanghai"),
  P("Colombia", "Bogotá", 4.71, -74.07, "America/Bogota"),
  P("Czechia", "Prague", 50.08, 14.44, "Europe/Prague"),
  P("Denmark", "Copenhagen", 55.68, 12.57, "Europe/Copenhagen"),
  P("Egypt", "Cairo", 30.04, 31.24, "Africa/Cairo"),
  P("Ethiopia", "Addis Ababa", 9.03, 38.74, "Africa/Addis_Ababa"),
  P("Finland", "Helsinki", 60.17, 24.94, "Europe/Helsinki"),
  P("France", "Paris", 48.86, 2.35, "Europe/Paris"),
  P("Germany", "Berlin", 52.52, 13.4, "Europe/Berlin"),
  P("Ghana", "Accra", 5.6, -0.19, "Africa/Accra"),
  P("Greece", "Athens", 37.98, 23.73, "Europe/Athens"),
  P("Hong Kong", "Hong Kong", 22.32, 114.17, "Asia/Hong_Kong"),
  P("Hungary", "Budapest", 47.5, 19.04, "Europe/Budapest"),
  P("India", "Delhi", 28.61, 77.21, "Asia/Kolkata"),
  P("India", "Mumbai", 19.08, 72.88, "Asia/Kolkata"),
  P("India", "Bengaluru", 12.97, 77.59, "Asia/Kolkata"),
  P("India", "Hyderabad", 17.385, 78.487, "Asia/Kolkata"),
  P("Indonesia", "Jakarta", -6.21, 106.85, "Asia/Jakarta"),
  P("Ireland", "Dublin", 53.35, -6.26, "Europe/Dublin"),
  P("Israel", "Tel Aviv", 32.09, 34.78, "Asia/Jerusalem"),
  P("Italy", "Milan", 45.46, 9.19, "Europe/Rome"),
  P("Japan", "Tokyo", 35.68, 139.69, "Asia/Tokyo"),
  P("Jordan", "Amman", 31.95, 35.93, "Asia/Amman"),
  P("Kenya", "Nairobi", -1.29, 36.82, "Africa/Nairobi"),
  P("Kuwait", "Kuwait City", 29.38, 47.99, "Asia/Kuwait"),
  P("Malaysia", "Kuala Lumpur", 3.14, 101.69, "Asia/Kuala_Lumpur"),
  P("Maldives", "Malé", 4.18, 73.51, "Indian/Maldives"),
  P("Mexico", "Mexico City", 19.43, -99.13, "America/Mexico_City"),
  P("Morocco", "Casablanca", 33.57, -7.59, "Africa/Casablanca"),
  P("Nepal", "Kathmandu", 27.72, 85.32, "Asia/Kathmandu"),
  P("Netherlands", "Amsterdam", 52.37, 4.9, "Europe/Amsterdam"),
  P("New Zealand", "Auckland", -36.85, 174.76, "Pacific/Auckland"),
  P("Nigeria", "Lagos", 6.52, 3.38, "Africa/Lagos"),
  P("Norway", "Oslo", 59.91, 10.75, "Europe/Oslo"),
  P("Oman", "Muscat", 23.59, 58.41, "Asia/Muscat"),
  P("Pakistan", "Karachi", 24.86, 67.01, "Asia/Karachi"),
  P("Peru", "Lima", -12.05, -77.04, "America/Lima"),
  P("Philippines", "Manila", 14.6, 120.98, "Asia/Manila"),
  P("Poland", "Warsaw", 52.23, 21.01, "Europe/Warsaw"),
  P("Portugal", "Lisbon", 38.72, -9.14, "Europe/Lisbon"),
  P("Qatar", "Doha", 25.29, 51.53, "Asia/Qatar"),
  P("Romania", "Bucharest", 44.43, 26.1, "Europe/Bucharest"),
  P("Saudi Arabia", "Riyadh", 24.71, 46.68, "Asia/Riyadh"),
  P("Singapore", "Singapore", 1.35, 103.82, "Asia/Singapore"),
  P("South Africa", "Johannesburg", -26.2, 28.05, "Africa/Johannesburg"),
  P("South Korea", "Seoul", 37.57, 126.98, "Asia/Seoul"),
  P("Spain", "Madrid", 40.42, -3.7, "Europe/Madrid"),
  P("Sri Lanka", "Colombo", 6.93, 79.86, "Asia/Colombo"),
  P("Sweden", "Stockholm", 59.33, 18.07, "Europe/Stockholm"),
  P("Switzerland", "Zürich", 47.38, 8.54, "Europe/Zurich"),
  P("Taiwan", "Taipei", 25.03, 121.57, "Asia/Taipei"),
  P("Tanzania", "Dar es Salaam", -6.79, 39.21, "Africa/Dar_es_Salaam"),
  P("Thailand", "Bangkok", 13.76, 100.5, "Asia/Bangkok"),
  P("Türkiye", "Istanbul", 41.01, 28.98, "Europe/Istanbul"),
  P("Uganda", "Kampala", 0.35, 32.58, "Africa/Kampala"),
  P("Ukraine", "Kyiv", 50.45, 30.52, "Europe/Kyiv"),
  P("United Arab Emirates", "Dubai", 25.2, 55.27, "Asia/Dubai"),
  P("United Kingdom", "London", 51.51, -0.13, "Europe/London"),
  P("United States", "New York", 40.71, -74.01, "America/New_York"),
  P("United States", "Chicago", 41.88, -87.63, "America/Chicago"),
  P("United States", "Denver", 39.74, -104.99, "America/Denver"),
  P("United States", "San Francisco", 37.77, -122.42, "America/Los_Angeles"),
  P("Vietnam", "Ho Chi Minh City", 10.82, 106.63, "Asia/Ho_Chi_Minh"),
];

/** great-circle distance, km */
export function distanceKm(a: Place, b: Place) {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** a time zone's offset from UTC right now, in minutes (daylight saving included) */
export function offsetMinutes(tz: string, at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUTC - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

/** the place the visitor's own time zone points at, if it is one of ours */
export function guessPlace(): Place | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return PLACES.find((p) => p.tz === tz) ?? null;
  } catch {
    return null;
  }
}
