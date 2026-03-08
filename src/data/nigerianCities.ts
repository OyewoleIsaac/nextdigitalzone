export interface NigerianCity {
  name: string;
  state: string;
  lat: number;
  lng: number;
}

export const NIGERIAN_CITIES: NigerianCity[] = [
  { name: 'Lagos', state: 'Lagos', lat: 6.5244, lng: 3.3792 },
  { name: 'Abuja', state: 'FCT', lat: 9.0579, lng: 7.4951 },
  { name: 'Kano', state: 'Kano', lat: 12.0022, lng: 8.5920 },
  { name: 'Ibadan', state: 'Oyo', lat: 7.3775, lng: 3.9470 },
  { name: 'Port Harcourt', state: 'Rivers', lat: 4.8156, lng: 7.0498 },
  { name: 'Benin City', state: 'Edo', lat: 6.3350, lng: 5.6270 },
  { name: 'Maiduguri', state: 'Borno', lat: 11.8333, lng: 13.1500 },
  { name: 'Zaria', state: 'Kaduna', lat: 11.0855, lng: 7.7199 },
  { name: 'Aba', state: 'Abia', lat: 5.1066, lng: 7.3668 },
  { name: 'Jos', state: 'Plateau', lat: 9.8965, lng: 8.8583 },
  { name: 'Ilorin', state: 'Kwara', lat: 8.4966, lng: 4.5426 },
  { name: 'Oyo', state: 'Oyo', lat: 7.8527, lng: 3.9327 },
  { name: 'Enugu', state: 'Enugu', lat: 6.4584, lng: 7.5464 },
  { name: 'Abeokuta', state: 'Ogun', lat: 7.1475, lng: 3.3619 },
  { name: 'Onitsha', state: 'Anambra', lat: 6.1442, lng: 6.7861 },
  { name: 'Warri', state: 'Delta', lat: 5.5167, lng: 5.7500 },
  { name: 'Sokoto', state: 'Sokoto', lat: 13.0622, lng: 5.2339 },
  { name: 'Calabar', state: 'Cross River', lat: 4.9757, lng: 8.3417 },
  { name: 'Uyo', state: 'Akwa Ibom', lat: 5.0510, lng: 7.9339 },
  { name: 'Makurdi', state: 'Benue', lat: 7.7285, lng: 8.5370 },
  { name: 'Minna', state: 'Niger', lat: 9.6140, lng: 6.5568 },
  { name: 'Owerri', state: 'Imo', lat: 5.4836, lng: 7.0350 },
  { name: 'Yola', state: 'Adamawa', lat: 9.2035, lng: 12.4954 },
  { name: 'Akure', state: 'Ondo', lat: 7.2526, lng: 5.1935 },
  { name: 'Asaba', state: 'Delta', lat: 6.1857, lng: 6.7311 },
  { name: 'Bauchi', state: 'Bauchi', lat: 10.3158, lng: 9.8442 },
  { name: 'Gombe', state: 'Gombe', lat: 10.2791, lng: 11.1671 },
  { name: 'Katsina', state: 'Katsina', lat: 12.9889, lng: 7.6006 },
  { name: 'Lafia', state: 'Nasarawa', lat: 8.4934, lng: 8.5133 },
  { name: 'Lokoja', state: 'Kogi', lat: 7.7895, lng: 6.7399 },
  { name: 'Umuahia', state: 'Abia', lat: 5.5273, lng: 7.4893 },
  { name: 'Osogbo', state: 'Osun', lat: 7.7827, lng: 4.5418 },
  { name: 'Birnin Kebbi', state: 'Kebbi', lat: 12.4535, lng: 4.1975 },
  { name: 'Dutse', state: 'Jigawa', lat: 11.6612, lng: 9.3394 },
  { name: 'Damaturu', state: 'Yobe', lat: 11.7469, lng: 11.9661 },
  { name: 'Jalingo', state: 'Taraba', lat: 8.8901, lng: 11.3631 },
  { name: 'Abakaliki', state: 'Ebonyi', lat: 6.3249, lng: 8.1137 },
  { name: 'Awka', state: 'Anambra', lat: 6.2090, lng: 7.0710 },
  { name: 'Ado Ekiti', state: 'Ekiti', lat: 7.6219, lng: 5.2211 },
  { name: 'Ikeja', state: 'Lagos', lat: 6.6018, lng: 3.3515 },
  { name: 'Surulere', state: 'Lagos', lat: 6.5009, lng: 3.3585 },
  { name: 'Victoria Island', state: 'Lagos', lat: 6.4281, lng: 3.4219 },
  { name: 'Lekki', state: 'Lagos', lat: 6.4698, lng: 3.5852 },
  { name: 'Gwagwalada', state: 'FCT', lat: 8.9426, lng: 7.0836 },
  { name: 'Suleja', state: 'Niger', lat: 9.1804, lng: 7.1804 },
];

export function getCitiesByState() {
  const grouped: Record<string, NigerianCity[]> = {};
  NIGERIAN_CITIES.forEach((city) => {
    if (!grouped[city.state]) grouped[city.state] = [];
    grouped[city.state].push(city);
  });
  return grouped;
}
