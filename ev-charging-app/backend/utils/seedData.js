require('dotenv').config();
const mongoose = require('mongoose');
const { ChargingStation, Vehicle, User } = require('../models');
const logger = require('./logger');

/**
 * Seed Script — Nepal EV Charging Stations
 * Locations, addresses, operators and connector data across Nepal.
 * Run: npm run seed
 */

const vehicles = [
  { make: 'Tesla', model: 'Model 3', year: 2024, batteryCapacity: 60, range: 491, efficiency: 0.122, compatibleConnectors: ['Type 2', 'CCS2', 'Tesla Supercharger', 'Tesla Destination'], maxChargingSpeed: { ac: 11, dc: 170 }, category: 'sedan' },
  { make: 'Tesla', model: 'Model Y', year: 2024, batteryCapacity: 75, range: 533, efficiency: 0.141, compatibleConnectors: ['Type 2', 'CCS2', 'Tesla Supercharger', 'Tesla Destination'], maxChargingSpeed: { ac: 11, dc: 250 }, category: 'suv' },
  { make: 'Nissan', model: 'Leaf', year: 2024, batteryCapacity: 40, range: 270, efficiency: 0.148, compatibleConnectors: ['Type 1', 'Type 2', 'CHAdeMO'], maxChargingSpeed: { ac: 6.6, dc: 50 }, category: 'hatchback' },
  { make: 'BYD', model: 'Atto 3', year: 2024, batteryCapacity: 60.48, range: 420, efficiency: 0.144, compatibleConnectors: ['Type 2', 'CCS2'], maxChargingSpeed: { ac: 7, dc: 80 }, category: 'suv' },
  { make: 'Hyundai', model: 'Ioniq 5', year: 2024, batteryCapacity: 77.4, range: 507, efficiency: 0.153, compatibleConnectors: ['Type 2', 'CCS2'], maxChargingSpeed: { ac: 11, dc: 233 }, category: 'suv' },
  { make: 'Hyundai', model: 'Kona Electric', year: 2024, batteryCapacity: 64, range: 484, efficiency: 0.132, compatibleConnectors: ['Type 2', 'CCS2'], maxChargingSpeed: { ac: 11, dc: 100 }, category: 'suv' },
  { make: 'Kia', model: 'EV6', year: 2024, batteryCapacity: 77.4, range: 528, efficiency: 0.147, compatibleConnectors: ['Type 2', 'CCS2'], maxChargingSpeed: { ac: 11, dc: 233 }, category: 'suv' },
  { make: 'MG', model: 'ZS EV', year: 2024, batteryCapacity: 51, range: 320, efficiency: 0.159, compatibleConnectors: ['Type 2', 'CCS2'], maxChargingSpeed: { ac: 7, dc: 76 }, category: 'suv' },
  { make: 'Volvo', model: 'XC40 Recharge', year: 2024, batteryCapacity: 82, range: 530, efficiency: 0.155, compatibleConnectors: ['Type 2', 'CCS2'], maxChargingSpeed: { ac: 11, dc: 150 }, category: 'suv' },
  { make: 'BMW', model: 'iX3', year: 2024, batteryCapacity: 80, range: 460, efficiency: 0.174, compatibleConnectors: ['Type 2', 'CCS2'], maxChargingSpeed: { ac: 11, dc: 150 }, category: 'suv' },
];

const loc = (lng, lat, street, area, city, province, postcode) => ({
  type: 'Point',
  coordinates: [lng, lat],
  address: { street, suburb: area, city, state: province, postcode, country: 'Nepal' },
  formattedAddress: `${street}, ${area}, ${city} ${postcode}, Nepal`,
});

const stations = [
  // ── BAGMATI PROVINCE (Kathmandu Valley) ──────────────────────
  {
    name: 'NEA Thamel Charging Station',
    location: loc(85.3123, 27.7155, 'Thamel Marg', 'Thamel', 'Kathmandu', 'Bagmati', '44600'),
    operator: { name: 'NEA', website: 'https://www.nea.org.np' },
    connectors: [
      { type: 'CCS2', powerKW: 50, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 4, available: 3, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 13.00, currency: 'NPR', isFree: false },
    amenities: ['Parking', 'WiFi', '24/7 Access'],
    rating: { average: 4.3, count: 42 },
    isVerified: true,
  },
  {
    name: 'Sipradi BYD Service Center',
    location: loc(85.3279, 27.7303, 'Chakrapath', 'Lazimpat', 'Kathmandu', 'Bagmati', '44600'),
    operator: { name: 'Sipradi', website: 'https://www.sipradi.com' },
    connectors: [
      { type: 'CCS2', powerKW: 80, quantity: 3, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 4, available: 4, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 15.00, currency: 'NPR', isFree: false },
    amenities: ['Restroom', 'Waiting Lounge', 'Parking'],
    rating: { average: 4.5, count: 67 },
    isVerified: true,
  },
  {
    name: 'CG Motors Chabahil',
    location: loc(85.3468, 27.7158, 'Chabahil Ring Road', 'Chabahil', 'Kathmandu', 'Bagmati', '44600'),
    operator: { name: 'CG Motors', website: 'https://www.cgmotors.com.np' },
    connectors: [
      { type: 'CCS2', powerKW: 50, quantity: 2, available: 1, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 3, available: 3, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 14.00, currency: 'NPR', isFree: false },
    amenities: ['Parking', 'Restroom'],
    rating: { average: 4.1, count: 28 },
    isVerified: true,
  },
  {
    name: 'NEA New Baneshwor',
    location: loc(85.3404, 27.6939, 'New Baneshwor Marg', 'New Baneshwor', 'Kathmandu', 'Bagmati', '44600'),
    operator: { name: 'NEA', website: 'https://www.nea.org.np' },
    connectors: [
      { type: 'CCS2', powerKW: 50, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 11, quantity: 6, available: 5, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 13.00, currency: 'NPR', isFree: false },
    amenities: ['Parking', '24/7 Access', 'Security'],
    rating: { average: 4.2, count: 55 },
    isVerified: true,
  },
  {
    name: 'Hyundai Dealership Pulchowk',
    location: loc(85.3163, 27.6670, 'Pulchowk Road', 'Pulchowk', 'Lalitpur', 'Bagmati', '44700'),
    operator: { name: 'Hyundai', website: 'https://www.hyundai.com.np' },
    connectors: [
      { type: 'CCS2', powerKW: 100, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 4, available: 3, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 15.00, currency: 'NPR', isFree: false },
    amenities: ['Restroom', 'Waiting Lounge', 'Parking', 'WiFi'],
    rating: { average: 4.6, count: 39 },
    isVerified: true,
  },
  {
    name: 'NEA Patan Durbar Square',
    location: loc(85.3247, 27.6588, 'Mangal Bazaar', 'Patan', 'Lalitpur', 'Bagmati', '44700'),
    operator: { name: 'NEA', website: 'https://www.nea.org.np' },
    connectors: [
      { type: 'Type 2', powerKW: 22, quantity: 4, available: 4, status: 'available' },
    ],
    chargerLevel: 'Level 2',
    pricing: { perKWh: 13.00, currency: 'NPR', isFree: false },
    amenities: ['Parking'],
    rating: { average: 4.0, count: 21 },
    isVerified: true,
  },
  {
    name: 'Kia Motors Bhaktapur',
    location: loc(85.4298, 27.6710, 'Suryamadhi Road', 'Suryamadhi', 'Bhaktapur', 'Bagmati', '44800'),
    operator: { name: 'Kia', website: 'https://www.kia.com.np' },
    connectors: [
      { type: 'CCS2', powerKW: 50, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 2, available: 2, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 15.00, currency: 'NPR', isFree: false },
    amenities: ['Restroom', 'Parking'],
    rating: { average: 4.3, count: 17 },
    isVerified: true,
  },
  {
    name: 'NEA Hetauda Highway Stop',
    location: loc(85.0329, 27.4259, 'Hetauda Bypass Road', 'Hetauda', 'Hetauda', 'Bagmati', '44107'),
    operator: { name: 'NEA', website: 'https://www.nea.org.np' },
    connectors: [
      { type: 'CCS2', powerKW: 50, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 2, available: 1, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 13.00, currency: 'NPR', isFree: false },
    amenities: ['Restroom', 'Food', 'Parking'],
    rating: { average: 4.1, count: 33 },
    isVerified: true,
  },

  // ── GANDAKI PROVINCE (Pokhara) ───────────────────────────────
  {
    name: 'NEA Pokhara Lakeside',
    location: loc(83.9569, 28.2020, 'Lakeside Road', 'Lakeside', 'Pokhara', 'Gandaki', '33700'),
    operator: { name: 'NEA', website: 'https://www.nea.org.np' },
    connectors: [
      { type: 'CCS2', powerKW: 50, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 4, available: 3, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 13.00, currency: 'NPR', isFree: false },
    amenities: ['Restroom', 'Food', 'Parking', 'WiFi'],
    rating: { average: 4.4, count: 51 },
    isVerified: true,
  },
  {
    name: 'MG Motor Pokhara',
    location: loc(83.9856, 28.2096, 'Prithvi Highway', 'Newroad', 'Pokhara', 'Gandaki', '33700'),
    operator: { name: 'MG Motor', website: 'https://www.mgmotor.com.np' },
    connectors: [
      { type: 'CCS2', powerKW: 50, quantity: 2, available: 1, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 3, available: 3, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 15.00, currency: 'NPR', isFree: false },
    amenities: ['Restroom', 'Waiting Lounge', 'Parking'],
    rating: { average: 4.2, count: 24 },
    isVerified: true,
  },

  // ── MADHESH PROVINCE (Birgunj) ───────────────────────────────
  {
    name: 'NEA Birgunj Customs Area',
    location: loc(84.8821, 27.0104, 'Birgunj-Raxaul Highway', 'Adarshanagar', 'Birgunj', 'Madhesh', '44300'),
    operator: { name: 'NEA', website: 'https://www.nea.org.np' },
    connectors: [
      { type: 'CCS2', powerKW: 50, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 4, available: 4, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 13.00, currency: 'NPR', isFree: false },
    amenities: ['Restroom', 'Parking', '24/7 Access'],
    rating: { average: 4.0, count: 29 },
    isVerified: true,
  },

  // ── KOSHI PROVINCE (Biratnagar) ──────────────────────────────
  {
    name: 'NEA Biratnagar Main Road',
    location: loc(87.2718, 26.4524, 'Traffic Chowk', 'Biratnagar-4', 'Biratnagar', 'Koshi', '56613'),
    operator: { name: 'NEA', website: 'https://www.nea.org.np' },
    connectors: [
      { type: 'CCS2', powerKW: 50, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 4, available: 3, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 13.00, currency: 'NPR', isFree: false },
    amenities: ['Restroom', 'Parking'],
    rating: { average: 4.1, count: 19 },
    isVerified: true,
  },
  {
    name: 'Sipradi Dharan Service Center',
    location: loc(87.2840, 26.8121, 'BP Highway', 'Dharan-8', 'Dharan', 'Koshi', '56700'),
    operator: { name: 'Sipradi', website: 'https://www.sipradi.com' },
    connectors: [
      { type: 'CCS2', powerKW: 80, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 2, available: 2, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 15.00, currency: 'NPR', isFree: false },
    amenities: ['Restroom', 'Waiting Lounge', 'Parking'],
    rating: { average: 4.3, count: 14 },
    isVerified: true,
  },

  // ── LUMBINI PROVINCE (Butwal / Bhairahawa) ───────────────────
  {
    name: 'NEA Butwal Bus Park',
    location: loc(83.4482, 27.6952, 'Butwal Bus Park Road', 'Traffic Chowk', 'Butwal', 'Lumbini', '32907'),
    operator: { name: 'NEA', website: 'https://www.nea.org.np' },
    connectors: [
      { type: 'CCS2', powerKW: 50, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 3, available: 2, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 13.00, currency: 'NPR', isFree: false },
    amenities: ['Restroom', 'Food', 'Parking'],
    rating: { average: 4.0, count: 22 },
    isVerified: true,
  },
  {
    name: 'NEA Bhairahawa Airport Road',
    location: loc(83.4571, 27.5057, 'Airport Road', 'Bhairahawa', 'Bhairahawa', 'Lumbini', '32900'),
    operator: { name: 'NEA', website: 'https://www.nea.org.np' },
    connectors: [
      { type: 'Type 2', powerKW: 22, quantity: 4, available: 4, status: 'available' },
    ],
    chargerLevel: 'Level 2',
    pricing: { perKWh: 0.00, currency: 'NPR', isFree: true },
    amenities: ['Parking', 'Restroom'],
    rating: { average: 4.2, count: 11 },
    isVerified: true,
  },

  // ── CHITWAN (Bharatpur) ──────────────────────────────────────
  {
    name: 'NEA Bharatpur Prithvi Chowk',
    location: loc(84.4333, 27.6833, 'Prithvi Highway', 'Prithvi Chowk', 'Bharatpur', 'Bagmati', '44200'),
    operator: { name: 'NEA', website: 'https://www.nea.org.np' },
    connectors: [
      { type: 'CCS2', powerKW: 50, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 4, available: 3, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 13.00, currency: 'NPR', isFree: false },
    amenities: ['Restroom', 'Food', 'Parking', '24/7 Access'],
    rating: { average: 4.4, count: 38 },
    isVerified: true,
  },
];

// Add dataSource and isActive to all stations
const preparedStations = stations.map((s) => ({
  ...s,
  dataSource: 'manual',
  isActive: true,
}));

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB for seeding');

    await Promise.all([
      ChargingStation.deleteMany({}),
      Vehicle.deleteMany({}),
      User.deleteMany({}),
    ]);
    logger.info('Cleared existing data');

    await Vehicle.insertMany(vehicles);
    logger.info(`Inserted ${vehicles.length} vehicles`);

    await ChargingStation.insertMany(preparedStations);
    logger.info(`Inserted ${preparedStations.length} charging stations across Nepal`);

    await User.create({
      name: 'Admin User',
      email: 'admin@evcharging.com',
      password: 'Admin123!',
      role: 'admin',
    });

    await User.create({
      name: 'Demo User',
      email: 'demo@evcharging.com',
      password: 'Demo123!',
      role: 'user',
      vehicle: { make: 'Tesla', model: 'Model 3', year: 2024, batteryCapacity: 60, range: 491, connectorType: 'CCS2' },
    });

    logger.info('Admin and demo users created');
    logger.info('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();
