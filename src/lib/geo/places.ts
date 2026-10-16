// Where a visitor can say they're from, for the globe: one point per country (its capital or main business
// city) and the main cities of India, with each city's IANA time zone so offsets follow daylight saving.
// Hyderabad, the studio's own city, opens a second list: its areas (HYDERABAD_AREAS). Coordinates are each
// place's centre, to about a kilometre — enough to frame it, not to navigate by.

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
  P("India", "Hyderabad", 17.385, 78.487, "Asia/Kolkata"),
  P("India", "Bengaluru", 12.97, 77.59, "Asia/Kolkata"),
  P("India", "Mumbai", 19.08, 72.88, "Asia/Kolkata"),
  P("India", "Delhi", 28.61, 77.21, "Asia/Kolkata"),
  P("India", "Chennai", 13.08, 80.27, "Asia/Kolkata"),
  P("India", "Pune", 18.52, 73.86, "Asia/Kolkata"),
  P("India", "Kolkata", 22.57, 88.36, "Asia/Kolkata"),
  P("India", "Ahmedabad", 23.02, 72.57, "Asia/Kolkata"),
  P("India", "Gurugram", 28.46, 77.03, "Asia/Kolkata"),
  P("India", "Noida", 28.54, 77.39, "Asia/Kolkata"),
  P("India", "Jaipur", 26.91, 75.79, "Asia/Kolkata"),
  P("India", "Lucknow", 26.85, 80.95, "Asia/Kolkata"),
  P("India", "Chandigarh", 30.73, 76.78, "Asia/Kolkata"),
  P("India", "Kochi", 9.93, 76.27, "Asia/Kolkata"),
  P("India", "Thiruvananthapuram", 8.52, 76.94, "Asia/Kolkata"),
  P("India", "Coimbatore", 11.02, 76.96, "Asia/Kolkata"),
  P("India", "Mysuru", 12.3, 76.64, "Asia/Kolkata"),
  P("India", "Goa", 15.49, 73.83, "Asia/Kolkata"),
  P("India", "Surat", 21.17, 72.83, "Asia/Kolkata"),
  P("India", "Nagpur", 21.15, 79.09, "Asia/Kolkata"),
  P("India", "Indore", 22.72, 75.86, "Asia/Kolkata"),
  P("India", "Bhubaneswar", 20.3, 85.82, "Asia/Kolkata"),
  P("India", "Guwahati", 26.14, 91.74, "Asia/Kolkata"),
  P("India", "Visakhapatnam", 17.69, 83.22, "Asia/Kolkata"),
  P("India", "Vijayawada", 16.51, 80.65, "Asia/Kolkata"),
  P("India", "Guntur", 16.31, 80.44, "Asia/Kolkata"),
  P("India", "Nellore", 14.44, 79.99, "Asia/Kolkata"),
  P("India", "Tirupati", 13.63, 79.42, "Asia/Kolkata"),
  P("India", "Warangal", 17.97, 79.59, "Asia/Kolkata"),
  P("India", "Karimnagar", 18.44, 79.13, "Asia/Kolkata"),
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

export const isHyderabad = (p: Place | null) => p?.name === "India" && p.city === "Hyderabad";

const A = (area: string, lat: number, lon: number): Place => ({
  id: `hyd-${area.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  name: area,
  city: "Hyderabad",
  lat,
  lon,
  tz: "Asia/Kolkata",
});

/** the areas of Hyderabad (and the districts around it), for the second question */
export const HYDERABAD_AREAS: Place[] = [
  A("Abids", 17.393, 78.477),
  A("Alwal", 17.502, 78.513),
  A("Ameerpet", 17.4375, 78.448),
  A("AS Rao Nagar", 17.481, 78.559),
  A("Attapur", 17.37, 78.43),
  A("Bachupally", 17.546, 78.365),
  A("Banjara Hills", 17.413, 78.436),
  A("Begumpet", 17.445, 78.466),
  A("Boduppal", 17.414, 78.579),
  A("Chandanagar", 17.495, 78.329),
  A("Charminar", 17.3616, 78.4747),
  A("Dilsukhnagar", 17.369, 78.525),
  A("ECIL", 17.471, 78.575),
  A("Financial District", 17.415, 78.342),
  A("Gachibowli", 17.44, 78.349),
  A("Ghatkesar", 17.45, 78.687),
  A("Habsiguda", 17.421, 78.544),
  A("Hayathnagar", 17.328, 78.606),
  A("Himayatnagar", 17.4, 78.486),
  A("HITEC City", 17.4474, 78.3762),
  A("Jubilee Hills", 17.4325, 78.4071),
  A("Khairatabad", 17.412, 78.461),
  A("Kokapet", 17.397, 78.332),
  A("Kompally", 17.535, 78.484),
  A("Kondapur", 17.47, 78.357),
  A("Kothapet", 17.368, 78.543),
  A("Kukatpally", 17.4948, 78.3996),
  A("LB Nagar", 17.3457, 78.5522),
  A("Lingampally", 17.487, 78.318),
  A("Madhapur", 17.4483, 78.3915),
  A("Malakpet", 17.372, 78.4995),
  A("Manikonda", 17.401, 78.387),
  A("Medchal", 17.63, 78.481),
  A("Mehdipatnam", 17.3916, 78.4398),
  A("Miyapur", 17.4968, 78.3614),
  A("Moosapet", 17.4675, 78.426),
  A("Nagole", 17.377, 78.56),
  A("Narsingi", 17.388, 78.356),
  A("Nizampet", 17.517, 78.386),
  A("Panjagutta", 17.4265, 78.451),
  A("Patancheru", 17.533, 78.265),
  A("Rajendranagar", 17.32, 78.402),
  A("Rangareddy district", 17.32, 78.402), // its built-up heart, Rajendranagar
  A("Sainikpuri", 17.492, 78.556),
  A("Sanathnagar", 17.456, 78.444),
  A("Secunderabad", 17.4399, 78.4983),
  A("Shamshabad", 17.2403, 78.4294),
  A("Shamirpet", 17.595, 78.577),
  A("Somajiguda", 17.422, 78.458),
  A("Tarnaka", 17.428, 78.539),
  A("Tolichowki", 17.398, 78.414),
  A("Uppal", 17.4058, 78.5591),
  A("Vanasthalipuram", 17.34, 78.569),
];

/** "9 km E": how far an area is from the city centre, and which way */
export function fromCentre(p: Place) {
  const km = distanceKm(HOME, p);
  if (km < 1.5) return "Centre";
  const bearing = (Math.atan2(p.lon - HOME.lon, p.lat - HOME.lat) * 180) / Math.PI;
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return `${Math.round(km)} km ${dirs[Math.round(((bearing + 360) % 360) / 45) % 8]}`;
}

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
