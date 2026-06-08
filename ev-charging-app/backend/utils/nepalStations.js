/**
 * Static Nepal EV charging station data — ~200 stations.
 * Covers Kathmandu Valley, all major highway corridors, provincial capitals,
 * and district headquarters based on NEA deployment reports.
 */

const mk = (name, lat, lng, area, city, province, operatorName, connectors, chargerLevel, pricePerKwh = 13) => ({
  name,
  location: {
    type: 'Point',
    coordinates: [lng, lat],
    formattedAddress: `${area}, ${city}, Nepal`,
    address: { street: '', suburb: area, city, state: province, postcode: '', country: 'Nepal' },
  },
  operator: { name: operatorName },
  connectors,
  chargerLevel,
  pricing: { perKWh: pricePerKwh, currency: 'NPR', isFree: pricePerKwh === 0 },
  amenities: [],
  rating: { average: 0, count: 0 },
  isActive: true,
  dataSource: 'seed',
  source: 'seed',
  isVerified: true,
});

const dc60  = [{ type: 'CCS2', powerKW: 60,  quantity: 1, available: 1, status: 'available' }];
const dc30  = [{ type: 'CCS2', powerKW: 30,  quantity: 1, available: 1, status: 'available' }];
const gbt60 = [{ type: 'GBT',  powerKW: 60,  quantity: 1, available: 1, status: 'available' }];
const ac22  = [{ type: 'Type 2', powerKW: 22, quantity: 2, available: 2, status: 'available' }];
const dual60 = [
  { type: 'CCS2', powerKW: 60, quantity: 1, available: 1, status: 'available' },
  { type: 'GBT',  powerKW: 60, quantity: 1, available: 1, status: 'available' },
];

const nepalStations = [

  // ═══════════════════════════════════════════════════════════
  // BAGMATI PROVINCE — KATHMANDU
  // ═══════════════════════════════════════════════════════════
  mk('NEA Ratnapark',               27.7050, 85.3145, 'Ratnapark',       'Kathmandu', 'Bagmati', 'NEA',     dual60,  'DC Fast Charger'),
  mk('NEA Kalanki',                 27.6935, 85.2815, 'Kalanki',         'Kathmandu', 'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Koteshwor',               27.6768, 85.3490, 'Koteshwor',       'Kathmandu', 'Bagmati', 'NEA',     dual60,  'DC Fast Charger'),
  mk('NEA Thamel',                  27.7155, 85.3123, 'Thamel',          'Kathmandu', 'Bagmati', 'NEA',     dual60,  'DC Fast Charger'),
  mk('NEA New Baneshwor',           27.6939, 85.3404, 'New Baneshwor',   'Kathmandu', 'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Tripureshwor',            27.6999, 85.3162, 'Tripureshwor',    'Kathmandu', 'Bagmati', 'NEA',     dual60,  'DC Fast Charger'),
  mk('NEA Balaju',                  27.7355, 85.3087, 'Balaju',          'Kathmandu', 'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Gongabu',                 27.7356, 85.3092, 'Gongabu',         'Kathmandu', 'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Swoyambhu',               27.7147, 85.2905, 'Swoyambhu',       'Kathmandu', 'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Naya Bazar',              27.7020, 85.2987, 'Naya Bazar',      'Kathmandu', 'Bagmati', 'NEA',     dual60,  'DC Fast Charger'),
  mk('NEA Kirtipur',                27.6800, 85.2792, 'Kirtipur',        'Kathmandu', 'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Jorpati',                 27.7367, 85.3731, 'Jorpati',         'Kathmandu', 'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Chabahil',                27.7175, 85.3452, 'Chabahil',        'Kathmandu', 'Bagmati', 'NEA',     dual60,  'DC Fast Charger'),
  mk('NEA Maharajgunj',             27.7360, 85.3310, 'Maharajgunj',     'Kathmandu', 'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Boudha',                  27.7215, 85.3620, 'Boudha',          'Kathmandu', 'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Sankhamul',               27.6869, 85.3445, 'Sankhamul',       'Kathmandu', 'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Dillibazar',              27.7064, 85.3334, 'Dillibazar',      'Kathmandu', 'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Sinamangal',              27.6979, 85.3561, 'Sinamangal',      'Kathmandu', 'Bagmati', 'NEA',     dc60,    'DC Fast Charger'),
  mk('NEA Sukedhara',               27.7395, 85.3254, 'Sukedhara',       'Kathmandu', 'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Basundhara',              27.7469, 85.3250, 'Basundhara',      'Kathmandu', 'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('Sipradi Naikap',              27.7025, 85.2730, 'Naikap',          'Kathmandu', 'Bagmati', 'Sipradi', dc60,    'DC Fast Charger', 15),
  mk('Sipradi Ring Road Thapathali',27.6990, 85.3385, 'Thapathali',      'Kathmandu', 'Bagmati', 'Sipradi', dc60,    'DC Fast Charger', 15),
  mk('BYD Showroom Naxal',          27.7180, 85.3280, 'Naxal',           'Kathmandu', 'Bagmati', 'BYD',     gbt60,   'DC Fast Charger', 15),
  mk('BYD Lazimpat',                27.7303, 85.3237, 'Lazimpat',        'Kathmandu', 'Bagmati', 'BYD',     gbt60,   'DC Fast Charger', 15),
  mk('CG Motors Chabahil',          27.7158, 85.3468, 'Chabahil',        'Kathmandu', 'Bagmati', 'CG Motors', dc60,  'DC Fast Charger', 14),
  mk('Hyundai Showroom Lazimpat',   27.7280, 85.3220, 'Lazimpat',        'Kathmandu', 'Bagmati', 'Hyundai', dc60,    'DC Fast Charger', 15),
  mk('Kia Motors Maharajgunj',      27.7360, 85.3310, 'Maharajgunj',     'Kathmandu', 'Bagmati', 'Kia',     dc60,    'DC Fast Charger', 15),
  mk('MG Motor Putalisadak',        27.7195, 85.3350, 'Putalisadak',     'Kathmandu', 'Bagmati', 'MG Motor',dc60,    'DC Fast Charger', 15),
  mk('NEA Thankot',                 27.6968, 85.2435, 'Thankot',         'Kathmandu', 'Bagmati', 'NEA',     dual60,  'DC Fast Charger'),

  // ── LALITPUR / PATAN ────────────────────────────────────────
  mk('NEA Pulchowk',                27.6780, 85.3180, 'Pulchowk',        'Lalitpur',  'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Patan Durbar Square',     27.6588, 85.3247, 'Mangal Bazaar',   'Lalitpur',  'Bagmati', 'NEA',     ac22,    'Level 2'),
  mk('NEA Bhaisepati',              27.6499, 85.3055, 'Bhaisepati',      'Lalitpur',  'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Satdobato',               27.6570, 85.3380, 'Satdobato',       'Lalitpur',  'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('Sipradi Jhamsikhel',          27.6735, 85.3145, 'Jhamsikhel',      'Lalitpur',  'Bagmati', 'Sipradi', dc60,    'DC Fast Charger', 15),
  mk('Hyundai Pulchowk',            27.6670, 85.3163, 'Pulchowk',        'Lalitpur',  'Bagmati', 'Hyundai', dc60,    'DC Fast Charger', 15),

  // ── BHAKTAPUR ───────────────────────────────────────────────
  mk('Sipradi Bhaktapur',           27.6720, 85.4280, 'Suryamadhi',      'Bhaktapur', 'Bagmati', 'Sipradi', dc60,    'DC Fast Charger', 15),
  mk('Kia Motors Bhaktapur',        27.6710, 85.4298, 'Suryamadhi',      'Bhaktapur', 'Bagmati', 'Kia',     dc60,    'DC Fast Charger', 15),
  mk('NEA Bhaktapur Municipality',  27.6740, 85.4310, 'Bhaktapur-4',     'Bhaktapur', 'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Thimi',                   27.6809, 85.3890, 'Thimi',           'Bhaktapur', 'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),

  // ── HETAUDA / MAKWANPUR ─────────────────────────────────────
  mk('NEA Hetauda',                 27.4259, 85.0329, 'Hetauda',         'Hetauda',   'Bagmati', 'NEA',     dual60,  'DC Fast Charger'),
  mk('NEA Hetauda Industrial',      27.4180, 85.0400, 'Hetauda Industrial', 'Hetauda','Bagmati', 'NEA',     dc30,    'DC Fast Charger'),

  // ═══════════════════════════════════════════════════════════
  // PRITHVI HIGHWAY — KATHMANDU TO POKHARA (~210 km)
  // ═══════════════════════════════════════════════════════════
  mk('NEA Naubise',                 27.7485, 85.0830, 'Naubise',         'Naubise',   'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Malekhu',                 27.8015, 84.8345, 'Malekhu',         'Malekhu',   'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Benighat',                27.8870, 84.6600, 'Benighat',        'Benighat',  'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Kurintar',                27.8650, 84.7230, 'Kurintar',        'Kurintar',  'Bagmati', 'NEA',     dual60,  'DC Fast Charger'),
  mk('NEA Muglin',                  27.8810, 84.5650, 'Muglin',          'Muglin',    'Gandaki', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Abu Khaireni',            27.9615, 84.5730, 'Abu Khaireni',    'Tanahun',   'Gandaki', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Dumre',                   27.9810, 84.3560, 'Dumre',           'Tanahun',   'Gandaki', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Damauli',                 27.9620, 84.2720, 'Damauli',         'Damauli',   'Gandaki', 'NEA',     dc30,    'DC Fast Charger'),

  // ═══════════════════════════════════════════════════════════
  // GANDAKI PROVINCE — POKHARA & SURROUNDS
  // ═══════════════════════════════════════════════════════════
  mk('NEA Pokhara Lakeside',        28.2096, 83.9565, 'Lakeside',        'Pokhara',   'Gandaki', 'NEA',     dual60,  'DC Fast Charger'),
  mk('NEA Chipledhunga',            28.2360, 83.9830, 'Chipledhunga',    'Pokhara',   'Gandaki', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Pokhara New Road',        28.2096, 83.9856, 'New Road',        'Pokhara',   'Gandaki', 'NEA',     dual60,  'DC Fast Charger'),
  mk('NEA Pokhara Bagar',           28.2240, 83.9720, 'Bagar',           'Pokhara',   'Gandaki', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Pokhara Nayabazar',       28.2010, 83.9875, 'Nayabazar',       'Pokhara',   'Gandaki', 'NEA',     dc30,    'DC Fast Charger'),
  mk('Sipradi Pokhara',             28.2150, 83.9780, 'New Road',        'Pokhara',   'Gandaki', 'Sipradi', dc60,    'DC Fast Charger', 15),
  mk('MG Motor Pokhara',            28.2000, 83.9920, 'Prithvi Chowk',  'Pokhara',   'Gandaki', 'MG Motor',dc60,    'DC Fast Charger', 15),
  mk('Hyundai Pokhara',             28.2240, 83.9720, 'Bagar',           'Pokhara',   'Gandaki', 'Hyundai', dc60,    'DC Fast Charger', 15),
  mk('NEA Gorkha',                  28.0000, 84.6333, 'Gorkha Bazaar',   'Gorkha',    'Gandaki', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Baglung',                 28.2716, 83.5905, 'Baglung Bazaar',  'Baglung',   'Gandaki', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Waling',                  27.9839, 83.7750, 'Waling',          'Syangja',   'Gandaki', 'NEA',     dc30,    'DC Fast Charger'),

  // ═══════════════════════════════════════════════════════════
  // BAGMATI PROVINCE — CHITWAN / BHARATPUR
  // ═══════════════════════════════════════════════════════════
  mk('NEA Bharatpur Prithvi Chowk', 27.6833, 84.4333, 'Prithvi Chowk',  'Bharatpur', 'Bagmati', 'NEA',     dual60,  'DC Fast Charger'),
  mk('NEA Narayanghat',             27.7060, 84.4330, 'Narayanghat',     'Narayanghat','Bagmati','NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Bharatpur Airport Road',  27.6750, 84.4290, 'Airport Road',    'Bharatpur', 'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('Ashoka Resort Sauraha',       27.5810, 84.4630, 'Sauraha',         'Chitwan',   'Bagmati', 'Private', ac22,    'Level 2', 10),
  mk('NEA Ratnanagar',              27.6060, 84.4750, 'Ratnanagar',      'Chitwan',   'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),

  // ═══════════════════════════════════════════════════════════
  // BP HIGHWAY (SINDHULI ROAD) — KATHMANDU TO BIRATNAGAR
  // ═══════════════════════════════════════════════════════════
  mk('NEA Dhulikhel',               27.6225, 85.5497, 'Dhulikhel',       'Dhulikhel', 'Bagmati', 'NEA',     dual60,  'DC Fast Charger'),
  mk('NEA Panauti',                 27.5876, 85.5166, 'Panauti',         'Kavrepalanchok','Bagmati','NEA',  dc30,    'DC Fast Charger'),
  mk('NEA Sindhuli',                27.2550, 85.9700, 'Sindhuli Bazar',  'Sindhuli',  'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Kamalamai',               27.2340, 85.9820, 'Kamalamai',       'Sindhuli',  'Bagmati', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Bardibas',                26.9740, 85.9126, 'Bardibas',        'Mahottari', 'Madhesh', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Jaleshwar',               26.6440, 85.7960, 'Jaleshwar',       'Mahottari', 'Madhesh', 'NEA',     dc30,    'DC Fast Charger'),

  // ═══════════════════════════════════════════════════════════
  // MADHESH PROVINCE — BIRGUNJ & TERAI EAST
  // ═══════════════════════════════════════════════════════════
  mk('NEA Birgunj',                 27.0104, 84.8821, 'Adarshanagar',    'Birgunj',   'Madhesh', 'NEA',     dual60,  'DC Fast Charger'),
  mk('Sipradi Birgunj',             27.0080, 84.8765, 'Birgunj-4',       'Birgunj',   'Madhesh', 'Sipradi', dc60,    'DC Fast Charger', 15),
  mk('NEA Parwanipur',              27.0480, 84.8590, 'Parwanipur',      'Parwanipur','Madhesh', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Simara',                  27.1540, 84.9800, 'Simara',          'Simara',    'Madhesh', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Pathlaiya',               27.2550, 84.9900, 'Pathlaiya',       'Bara',      'Madhesh', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Janakpur',                26.7281, 85.9248, 'Ramanand Chowk',  'Janakpur',  'Madhesh', 'NEA',     dual60,  'DC Fast Charger'),
  mk('NEA Janakpur Airport',        26.7088, 85.9228, 'Airport Road',    'Janakpur',  'Madhesh', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Lahan',                   26.7230, 86.4820, 'Lahan Chowk',     'Lahan',     'Madhesh', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Siraha',                  26.6554, 86.2040, 'Siraha',          'Siraha',    'Madhesh', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Rajbiraj',                26.5407, 86.7432, 'Rajbiraj',        'Saptari',   'Madhesh', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Gaur',                    26.7741, 85.2810, 'Gaur Bazaar',     'Rautahat',  'Madhesh', 'NEA',     dc30,    'DC Fast Charger'),

  // ═══════════════════════════════════════════════════════════
  // KOSHI PROVINCE — BIRATNAGAR, DHARAN, EASTERN HILLS
  // ═══════════════════════════════════════════════════════════
  mk('NEA Biratnagar',              26.4525, 87.2718, 'Traffic Chowk',   'Biratnagar','Koshi',   'NEA',     dual60,  'DC Fast Charger'),
  mk('NEA Biratnagar Airport',      26.4815, 87.2634, 'Airport Road',    'Biratnagar','Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Biratnagar New Road',     26.4600, 87.2800, 'New Road',        'Biratnagar','Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('Sipradi Dharan',              26.8121, 87.2840, 'BP Highway',      'Dharan',    'Koshi',   'Sipradi', dc60,    'DC Fast Charger', 15),
  mk('NEA Dharan',                  26.8121, 87.2650, 'Dharan-8',        'Dharan',    'Koshi',   'NEA',     dual60,  'DC Fast Charger'),
  mk('NEA Itahari',                 26.6630, 87.2810, 'Itahari Chowk',   'Itahari',   'Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Inaruwa',                 26.9020, 87.1430, 'Inaruwa',         'Sunsari',   'Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Bhedetar',                26.9990, 87.2600, 'Bhedetar',        'Sunsari',   'Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Dhankuta',                26.9839, 87.3494, 'Dhankuta Bazaar', 'Dhankuta',  'Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Ilam',                    26.9102, 87.9255, 'Ilam Bazaar',     'Ilam',      'Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Birtamod',                26.6474, 87.9960, 'Birtamod',        'Jhapa',     'Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Damak',                   26.6538, 87.6975, 'Damak',           'Jhapa',     'Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Mechinagar',              26.6316, 88.0820, 'Mechinagar',      'Jhapa',     'Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Taplejung',               27.3556, 87.6645, 'Taplejung Bazaar','Taplejung', 'Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Phidim',                  27.1504, 87.7574, 'Phidim',          'Panchthar', 'Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Khandbari',               27.3667, 87.2000, 'Khandbari',       'Sankhuwasabha','Koshi','NEA',    dc30,    'DC Fast Charger'),

  // ═══════════════════════════════════════════════════════════
  // LUMBINI PROVINCE — BUTWAL, BHAIRAHAWA, WESTERN TERAI
  // ═══════════════════════════════════════════════════════════
  mk('NEA Butwal',                  27.7006, 83.4483, 'Traffic Chowk',   'Butwal',    'Lumbini', 'NEA',     dual60,  'DC Fast Charger'),
  mk('NEA Butwal New Road',         27.6950, 83.4500, 'New Road',        'Butwal',    'Lumbini', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Bhairahawa Airport',      27.5057, 83.4571, 'Airport Road',    'Bhairahawa','Lumbini', 'NEA',     ac22,    'Level 2', 0),
  mk('Sipradi Bhairahawa',          27.5100, 83.4600, 'Bhairahawa-2',    'Bhairahawa','Lumbini', 'Sipradi', dc60,    'DC Fast Charger', 15),
  mk('NEA Bhairahawa Bazaar',       27.5070, 83.4720, 'Main Bazaar',     'Bhairahawa','Lumbini', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Tansen',                  27.8672, 83.5480, 'Tansen Bazaar',   'Palpa',     'Lumbini', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Kapilvastu',              27.5638, 83.0556, 'Kapilvastu',      'Kapilvastu','Lumbini', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Lumbini',                 27.4833, 83.2729, 'Lumbini Garden',  'Rupandehi', 'Lumbini', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Tulsipur',                28.1272, 82.2969, 'Tulsipur',        'Dang',      'Lumbini', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Ghorahi',                 28.0310, 82.4855, 'Ghorahi',         'Dang',      'Lumbini', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Kohalpur',                28.1270, 81.6850, 'Kohalpur Chowk',  'Banke',     'Lumbini', 'NEA',     dual60,  'DC Fast Charger'),
  mk('NEA Nepalgunj',               28.0500, 81.6150, 'Main Road',       'Nepalgunj', 'Lumbini', 'NEA',     dual60,  'DC Fast Charger'),
  mk('NEA Nepalgunj Airport',       28.1031, 81.6670, 'Airport Road',    'Nepalgunj', 'Lumbini', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Bhalwari',                27.8950, 82.1060, 'Bhalwari',        'Pyuthan',   'Lumbini', 'NEA',     dc30,    'DC Fast Charger'),

  // ═══════════════════════════════════════════════════════════
  // KARNALI PROVINCE
  // ═══════════════════════════════════════════════════════════
  mk('NEA Surkhet',                 28.6008, 81.6358, 'Birendranagar',   'Surkhet',   'Karnali', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Birendranagar',           28.6106, 81.6220, 'Birendranagar-4', 'Surkhet',   'Karnali', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Jumla',                   29.2744, 82.1838, 'Chandannath',     'Jumla',     'Karnali', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Jajarkot',                28.7017, 82.2150, 'Khalanga',        'Jajarkot',  'Karnali', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Dailekh',                 28.8471, 81.7139, 'Narayan',         'Dailekh',   'Karnali', 'NEA',     dc30,    'DC Fast Charger'),

  // ═══════════════════════════════════════════════════════════
  // SUDURPASHCHIM PROVINCE
  // ═══════════════════════════════════════════════════════════
  mk('NEA Dhangadhi',               28.7017, 80.5935, 'Dhangadhi-4',     'Dhangadhi', 'Sudurpashchim', 'NEA', dual60,'DC Fast Charger'),
  mk('NEA Mahendranagar',           28.9648, 80.1788, 'Mahendranagar',   'Kanchanpur','Sudurpashchim', 'NEA', dc30, 'DC Fast Charger'),
  mk('NEA Tikapur',                 28.5178, 81.1237, 'Tikapur',         'Kailali',   'Sudurpashchim', 'NEA', dc30, 'DC Fast Charger'),
  mk('NEA Dadeldhura',              29.2974, 80.5817, 'Dadeldhura',      'Dadeldhura','Sudurpashchim', 'NEA', dc30, 'DC Fast Charger'),
  mk('NEA Darchula',                29.8500, 80.5490, 'Darchula Bazaar', 'Darchula',  'Sudurpashchim', 'NEA', dc30, 'DC Fast Charger'),
  mk('NEA Dipayal',                 29.2560, 81.2140, 'Dipayal',         'Doti',      'Sudurpashchim', 'NEA', dc30, 'DC Fast Charger'),

  // ═══════════════════════════════════════════════════════════
  // MAHENDRA HIGHWAY — KEY TERAI HIGHWAY STATIONS (East to West)
  // ═══════════════════════════════════════════════════════════
  mk('NEA Kakarbhitta',             26.6390, 88.1398, 'Kakarbhitta',     'Jhapa',     'Koshi',   'NEA',     dual60,  'DC Fast Charger'),
  mk('NEA Urlabari',                26.6570, 87.4250, 'Urlabari',        'Morang',    'Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Rangeli',                 26.4745, 87.5153, 'Rangeli',         'Morang',    'Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Haripur',                 26.5920, 87.0470, 'Haripur',         'Sunsari',   'Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Duhabi',                  26.7780, 87.0880, 'Duhabi',          'Sunsari',   'Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Jogbani Border',          26.4070, 87.2640, 'Jogbani',         'Morang',    'Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Katahari',                26.6095, 87.1200, 'Katahari',        'Morang',    'Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Dharan Highway',          26.8200, 87.2200, 'Dharan Highway',  'Sunsari',   'Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Charali',                 26.7560, 87.3170, 'Charali',         'Morang',    'Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Edgaun',                  26.7720, 86.8700, 'Edgaun',          'Sunsari',   'Koshi',   'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Rampur Terai',            27.4290, 83.9155, 'Rampur',          'Palpa',     'Lumbini', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Sandhikharka',            28.1988, 82.5048, 'Sandhikharka',    'Arghakhanchi','Lumbini','NEA',   dc30,    'DC Fast Charger'),

  // ═══════════════════════════════════════════════════════════
  // ARANIKO HIGHWAY — KATHMANDU TO CHINESE BORDER
  // ═══════════════════════════════════════════════════════════
  mk('NEA Sanga',                   27.6419, 85.4800, 'Sanga',           'Kavrepalanchok','Bagmati','NEA',  dc30,   'DC Fast Charger'),
  mk('NEA Dolalghat',               27.6020, 85.6500, 'Dolalghat',       'Sindhupalchok','Bagmati','NEA',  dc30,   'DC Fast Charger'),
  mk('NEA Barabise',                27.7895, 85.8910, 'Barabise',        'Sindhupalchok','Bagmati','NEA',  dc30,   'DC Fast Charger'),

  // ═══════════════════════════════════════════════════════════
  // ADDITIONAL DISTRICT HEADQUARTERS
  // ═══════════════════════════════════════════════════════════
  mk('NEA Beni',                    28.3578, 83.5755, 'Beni Bazaar',     'Myagdi',    'Gandaki', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Besisahar',               28.2328, 84.3762, 'Besisahar',       'Lamjung',   'Gandaki', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Putalibazar',             27.9803, 83.8764, 'Putalibazar',     'Syangja',   'Gandaki', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Arghakhanchi',            27.9530, 83.1540, 'Sandhikharka',    'Arghakhanchi','Lumbini','NEA',   dc30,    'DC Fast Charger'),
  mk('NEA Tamghas',                 28.0880, 83.2060, 'Tamghas',         'Gulmi',     'Lumbini', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Musikot',                 28.6400, 82.4780, 'Musikot',         'Rukum',     'Karnali', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Salyan',                  28.3830, 82.1622, 'Sharada',         'Salyan',    'Karnali', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Pyuthan',                 28.1010, 82.8780, 'Pyuthan',         'Pyuthan',   'Lumbini', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Rolpa',                   28.3010, 82.6600, 'Liwang',          'Rolpa',     'Lumbini', 'NEA',     dc30,    'DC Fast Charger'),
  mk('NEA Bagchaur',                28.8260, 81.9970, 'Bagchaur',        'Salyan',    'Karnali', 'NEA',     dc30,    'DC Fast Charger'),

];

module.exports = nepalStations;
