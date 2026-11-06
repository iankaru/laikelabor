export const services = {
  interior: { name: 'Sisepesu', min: 30, max: 30, starting: true },
  exterior: { name: 'Välispesu', min: 30, max: 30, starting: true },
  ceramic: { name: 'Keraamika', min: 70, max: 70, starting: true },
  leather: { name: 'Nahahooldus', min: 30, max: 30, starting: true },
  glass: { name: 'Klaaside keraamika', min: 40, max: 40, starting: true },
  tarIron: { name: 'Täispigi- ja rauaeemaldus', min: 15, max: 15, starting: false },
};
export const locations = {
  kakumae: { name: 'Kakumäe', address: 'Soolahe 54', fee: 0, description: 'Tule meie juurde Kakumäele aadressile Soolahe 54.' },
  mustamae: { name: 'Mustamäe', address: 'Kadaka tee 42b', fee: 0, description: 'Tule meie juurde Mustamäele aadressile Kadaka tee 42b.' },
  mobile: { name: 'Tuleme sinu juurde', address: 'Sinu valitud aadress', fee: 10, description: 'Tuleme sinu juurde. Kohaletuleku tasu +10 € lisatakse automaatselt kogusummale.' },
};
export function calculate(selected, location = 'kakumae') {
  const ids = new Set([...selected].filter(id => Object.hasOwn(services, id)));
  const combined = ids.has('interior') && ids.has('exterior');
  const items = [];
  if (combined) items.push({ id: 'combined', name: 'Sise- ja välispesu', min: 50, max: 50, starting: false });
  for (const id of ids) {
    if (combined && (id === 'interior' || id === 'exterior')) continue;
    items.push({ id, ...services[id] });
  }
  const selectedLocation = locations[location] ?? locations.kakumae;
  if (ids.size && selectedLocation.fee) {
    items.push({ id: 'travel', name: 'Kohaletulek', min: selectedLocation.fee, max: selectedLocation.fee, starting: false });
  }
  return {
    items, combined,
    min: items.reduce((sum, item) => sum + item.min, 0),
    max: items.reduce((sum, item) => sum + item.max, 0),
    starting: items.some(item => item.starting),
  };
}
export function priceLabel({ min, max, starting }) {
  if (starting) return `alates ${min} €`;
  return min === max ? `${min} €` : `${min}–${max} €`;
}
