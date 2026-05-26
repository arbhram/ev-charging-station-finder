require('dotenv').config();
const mongoose = require('mongoose');
const { ChargingStation, Vehicle, User } = require('../models');
const logger = require('./logger');

/**
 * Seed Script — Australian EV Charging Stations
 * Real locations, addresses, operators and connector data for all states/territories.
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

// Helper to build the location object with Australian address format
const loc = (lng, lat, street, suburb, city, state, postcode) => ({
  type: 'Point',
  coordinates: [lng, lat],
  address: { street, suburb, city, state, postcode, country: 'Australia' },
  formattedAddress: `${street}, ${suburb} ${state} ${postcode}, Australia`,
});

const stations = [
  // ── NEW SOUTH WALES ──────────────────────────────────────────
  {
    name: 'Chargefox Sydney Olympic Park',
    location: loc(151.0694, -33.8469, '7 Figtree Dr', 'Sydney Olympic Park', 'Sydney', 'NSW', '2127'),
    operator: { name: 'Chargefox', website: 'https://www.chargefox.com' },
    connectors: [
      { type: 'CCS2', powerKW: 350, quantity: 4, available: 3, status: 'available' },
      { type: 'CHAdeMO', powerKW: 50, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 4, available: 4, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.45, currency: 'AUD', isFree: false },
    amenities: ['WiFi', 'Restroom', 'Food', 'Parking', '24/7 Access'],
    rating: { average: 4.5, count: 128 },
    isVerified: true,
  },
  {
    name: 'Evie Networks Bondi Junction Westfield',
    location: loc(151.2476, -33.8916, '500 Oxford St', 'Bondi Junction', 'Sydney', 'NSW', '2022'),
    operator: { name: 'Evie Networks', website: 'https://www.evie.com.au' },
    connectors: [
      { type: 'Type 2', powerKW: 22, quantity: 6, available: 4, status: 'available' },
      { type: 'CCS2', powerKW: 50, quantity: 2, available: 0, status: 'occupied' },
    ],
    chargerLevel: 'Level 2',
    pricing: { perKWh: 0.35, currency: 'AUD', isFree: false },
    amenities: ['WiFi', 'Restroom', 'Food', 'Shopping', 'Parking', 'Wheelchair Accessible'],
    rating: { average: 4.1, count: 73 },
    isVerified: true,
  },
  {
    name: 'NRMA Goulburn Fast Charger',
    location: loc(149.7259, -34.7546, '201 Auburn St', 'Goulburn', 'Goulburn', 'NSW', '2580'),
    operator: { name: 'NRMA', website: 'https://www.mynrma.com.au' },
    connectors: [
      { type: 'CCS2', powerKW: 150, quantity: 2, available: 2, status: 'available' },
      { type: 'CHAdeMO', powerKW: 50, quantity: 1, available: 1, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 2, available: 2, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.00, currency: 'AUD', isFree: true },
    amenities: ['Restroom', 'Food', 'Parking', '24/7 Access'],
    rating: { average: 4.3, count: 56 },
    isVerified: true,
  },
  {
    name: 'Tesla Supercharger Parramatta',
    location: loc(151.0031, -33.8151, '159 Church St', 'Parramatta', 'Sydney', 'NSW', '2150'),
    operator: { name: 'Tesla', website: 'https://www.tesla.com' },
    connectors: [
      { type: 'Tesla Supercharger', powerKW: 250, quantity: 8, available: 5, status: 'available' },
      { type: 'CCS2', powerKW: 250, quantity: 4, available: 3, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.52, currency: 'AUD', isFree: false },
    amenities: ['WiFi', 'Restroom', 'Food', 'Shopping', 'Parking', '24/7 Access'],
    rating: { average: 4.6, count: 211 },
    isVerified: true,
  },
  {
    name: 'Chargefox Newcastle Hunter St',
    location: loc(151.7789, -32.9283, '290 Hunter St', 'Newcastle', 'Newcastle', 'NSW', '2300'),
    operator: { name: 'Chargefox', website: 'https://www.chargefox.com' },
    connectors: [
      { type: 'CCS2', powerKW: 150, quantity: 4, available: 3, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 4, available: 4, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.40, currency: 'AUD', isFree: false },
    amenities: ['WiFi', 'Restroom', 'Parking', '24/7 Access'],
    rating: { average: 4.2, count: 89 },
    isVerified: true,
  },
  {
    name: 'NRMA Albury Fast Charger',
    location: loc(146.9135, -36.0737, '555 Dean St', 'Albury', 'Albury', 'NSW', '2640'),
    operator: { name: 'NRMA', website: 'https://www.mynrma.com.au' },
    connectors: [
      { type: 'CCS2', powerKW: 350, quantity: 2, available: 2, status: 'available' },
      { type: 'CHAdeMO', powerKW: 50, quantity: 1, available: 1, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.00, currency: 'AUD', isFree: true },
    amenities: ['Restroom', 'Food', 'Parking', '24/7 Access', 'Lighting'],
    rating: { average: 4.3, count: 61 },
    isVerified: true,
  },
  // ── VICTORIA ──────────────────────────────────────────────────
  {
    name: 'Tesla Supercharger Melbourne Central',
    location: loc(144.9631, -37.8136, '300 Lonsdale St', 'Melbourne CBD', 'Melbourne', 'VIC', '3000'),
    operator: { name: 'Tesla', website: 'https://www.tesla.com' },
    connectors: [
      { type: 'Tesla Supercharger', powerKW: 250, quantity: 8, available: 5, status: 'available' },
      { type: 'CCS2', powerKW: 250, quantity: 4, available: 3, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.55, currency: 'AUD', isFree: false },
    amenities: ['WiFi', 'Restroom', 'Food', 'Shopping', 'Parking', '24/7 Access'],
    rating: { average: 4.7, count: 256 },
    isVerified: true,
  },
  {
    name: 'Chargefox Southbank Arts Precinct',
    location: loc(144.9684, -37.8224, '180 St Kilda Rd', 'Southbank', 'Melbourne', 'VIC', '3006'),
    operator: { name: 'Chargefox', website: 'https://www.chargefox.com' },
    connectors: [
      { type: 'CCS2', powerKW: 350, quantity: 6, available: 4, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 6, available: 6, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.45, currency: 'AUD', isFree: false },
    amenities: ['WiFi', 'Restroom', 'Food', 'Parking', 'Wheelchair Accessible'],
    rating: { average: 4.5, count: 142 },
    isVerified: true,
  },
  {
    name: 'Evie Networks Geelong Waterfront',
    location: loc(144.3572, -38.1489, '10 Eastern Beach Rd', 'Geelong', 'Geelong', 'VIC', '3220'),
    operator: { name: 'Evie Networks', website: 'https://www.evie.com.au' },
    connectors: [
      { type: 'CCS2', powerKW: 150, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 4, available: 3, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.40, currency: 'AUD', isFree: false },
    amenities: ['Restroom', 'Food', 'Parking', 'Wheelchair Accessible'],
    rating: { average: 4.2, count: 67 },
    isVerified: true,
  },
  {
    name: 'NRMA Wodonga Highway Stop',
    location: loc(146.8880, -36.1218, '1 Wodonga Pl', 'Wodonga', 'Wodonga', 'VIC', '3690'),
    operator: { name: 'NRMA', website: 'https://www.mynrma.com.au' },
    connectors: [
      { type: 'CCS2', powerKW: 150, quantity: 2, available: 1, status: 'available' },
      { type: 'CHAdeMO', powerKW: 50, quantity: 1, available: 1, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.00, currency: 'AUD', isFree: true },
    amenities: ['Restroom', 'Food', 'Parking', '24/7 Access'],
    rating: { average: 4.0, count: 38 },
    isVerified: true,
  },
  // ── QUEENSLAND ────────────────────────────────────────────────
  {
    name: 'Tesla Supercharger Brisbane CBD',
    location: loc(153.0251, -27.4698, '171 George St', 'Brisbane City', 'Brisbane', 'QLD', '4000'),
    operator: { name: 'Tesla', website: 'https://www.tesla.com' },
    connectors: [
      { type: 'Tesla Supercharger', powerKW: 250, quantity: 10, available: 7, status: 'available' },
      { type: 'CCS2', powerKW: 250, quantity: 4, available: 3, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.52, currency: 'AUD', isFree: false },
    amenities: ['WiFi', 'Restroom', 'Food', 'Parking', '24/7 Access'],
    rating: { average: 4.6, count: 198 },
    isVerified: true,
  },
  {
    name: 'Chargefox Cairns Esplanade',
    location: loc(145.7753, -16.9186, '1 The Esplanade', 'Cairns City', 'Cairns', 'QLD', '4870'),
    operator: { name: 'Chargefox', website: 'https://www.chargefox.com' },
    connectors: [
      { type: 'CCS2', powerKW: 150, quantity: 4, available: 3, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 4, available: 4, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.45, currency: 'AUD', isFree: false },
    amenities: ['WiFi', 'Restroom', 'Food', 'Parking', 'Wheelchair Accessible'],
    rating: { average: 4.3, count: 82 },
    isVerified: true,
  },
  {
    name: 'Evie Networks Gold Coast Surfers Paradise',
    location: loc(153.4286, -28.0017, '3128 Surfers Paradise Blvd', 'Surfers Paradise', 'Gold Coast', 'QLD', '4217'),
    operator: { name: 'Evie Networks', website: 'https://www.evie.com.au' },
    connectors: [
      { type: 'CCS2', powerKW: 150, quantity: 4, available: 2, status: 'available' },
      { type: 'CHAdeMO', powerKW: 50, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 4, available: 4, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.42, currency: 'AUD', isFree: false },
    amenities: ['WiFi', 'Restroom', 'Food', 'Shopping', 'Parking'],
    rating: { average: 4.4, count: 115 },
    isVerified: true,
  },
  {
    name: 'Jolt Charge Toowoomba',
    location: loc(151.9547, -27.5598, '541 Ruthven St', 'Toowoomba City', 'Toowoomba', 'QLD', '4350'),
    operator: { name: 'Jolt', website: 'https://jolt.com.au' },
    connectors: [
      { type: 'CCS2', powerKW: 25, quantity: 4, available: 4, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.00, currency: 'AUD', isFree: true },
    amenities: ['Parking', '24/7 Access', 'Lighting'],
    rating: { average: 4.1, count: 43 },
    isVerified: true,
  },
  // ── WESTERN AUSTRALIA ─────────────────────────────────────────
  {
    name: 'Tesla Supercharger Perth CBD',
    location: loc(115.8617, -31.9505, '815 Hay St', 'Perth CBD', 'Perth', 'WA', '6000'),
    operator: { name: 'Tesla', website: 'https://www.tesla.com' },
    connectors: [
      { type: 'Tesla Supercharger', powerKW: 250, quantity: 8, available: 6, status: 'available' },
      { type: 'CCS2', powerKW: 250, quantity: 4, available: 4, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.52, currency: 'AUD', isFree: false },
    amenities: ['WiFi', 'Restroom', 'Food', 'Shopping', 'Parking', '24/7 Access'],
    rating: { average: 4.5, count: 162 },
    isVerified: true,
  },
  {
    name: 'Chargefox Fremantle Market',
    location: loc(115.7456, -32.0569, '84 South Tce', 'Fremantle', 'Fremantle', 'WA', '6160'),
    operator: { name: 'Chargefox', website: 'https://www.chargefox.com' },
    connectors: [
      { type: 'CCS2', powerKW: 150, quantity: 4, available: 3, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 4, available: 4, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.40, currency: 'AUD', isFree: false },
    amenities: ['WiFi', 'Restroom', 'Food', 'Parking', 'Wheelchair Accessible'],
    rating: { average: 4.3, count: 74 },
    isVerified: true,
  },
  {
    name: 'BP Pulse Mandurah',
    location: loc(115.7228, -32.5296, '330 Pinjarra Rd', 'Mandurah', 'Mandurah', 'WA', '6210'),
    operator: { name: 'BP Pulse', website: 'https://bpchargemaster.com' },
    connectors: [
      { type: 'CCS2', powerKW: 150, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 2, available: 2, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.45, currency: 'AUD', isFree: false },
    amenities: ['Restroom', 'Food', 'Parking', '24/7 Access'],
    rating: { average: 4.0, count: 35 },
    isVerified: true,
  },
  // ── SOUTH AUSTRALIA ───────────────────────────────────────────
  {
    name: 'Chargefox Adelaide CBD Rundle Mall',
    location: loc(138.6007, -34.9218, '100 Rundle Mall', 'Adelaide City', 'Adelaide', 'SA', '5000'),
    operator: { name: 'Chargefox', website: 'https://www.chargefox.com' },
    connectors: [
      { type: 'CCS2', powerKW: 350, quantity: 4, available: 4, status: 'available' },
      { type: 'CHAdeMO', powerKW: 50, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 6, available: 5, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.45, currency: 'AUD', isFree: false },
    amenities: ['WiFi', 'Restroom', 'Food', 'Shopping', 'Parking', '24/7 Access'],
    rating: { average: 4.5, count: 104 },
    isVerified: true,
  },
  {
    name: 'Tesla Supercharger Adelaide Glenelg',
    location: loc(138.5166, -34.9820, '2 Moseley Sq', 'Glenelg', 'Adelaide', 'SA', '5045'),
    operator: { name: 'Tesla', website: 'https://www.tesla.com' },
    connectors: [
      { type: 'Tesla Supercharger', powerKW: 250, quantity: 6, available: 4, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.52, currency: 'AUD', isFree: false },
    amenities: ['WiFi', 'Restroom', 'Food', 'Parking'],
    rating: { average: 4.4, count: 88 },
    isVerified: true,
  },
  {
    name: 'NRMA Tailem Bend Highway Stop',
    location: loc(139.4483, -35.2586, '1 Railway Tce', 'Tailem Bend', 'Tailem Bend', 'SA', '5260'),
    operator: { name: 'NRMA', website: 'https://www.mynrma.com.au' },
    connectors: [
      { type: 'CCS2', powerKW: 150, quantity: 2, available: 2, status: 'available' },
      { type: 'CHAdeMO', powerKW: 50, quantity: 1, available: 1, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.00, currency: 'AUD', isFree: true },
    amenities: ['Restroom', 'Food', 'Parking', '24/7 Access'],
    rating: { average: 4.2, count: 47 },
    isVerified: true,
  },
  // ── AUSTRALIAN CAPITAL TERRITORY ──────────────────────────────
  {
    name: 'Evie Networks Canberra Civic',
    location: loc(149.1302, -35.2809, '148 Bunda St', 'Civic', 'Canberra', 'ACT', '2601'),
    operator: { name: 'Evie Networks', website: 'https://www.evie.com.au' },
    connectors: [
      { type: 'CCS2', powerKW: 150, quantity: 4, available: 3, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 4, available: 4, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.40, currency: 'AUD', isFree: false },
    amenities: ['WiFi', 'Restroom', 'Food', 'Shopping', 'Parking'],
    rating: { average: 4.2, count: 87 },
    isVerified: true,
  },
  {
    name: 'Chargefox Canberra Airport',
    location: loc(149.1950, -35.3075, 'Terminal Dr', 'Pialligo', 'Canberra', 'ACT', '2609'),
    operator: { name: 'Chargefox', website: 'https://www.chargefox.com' },
    connectors: [
      { type: 'CCS2', powerKW: 150, quantity: 4, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 6, available: 5, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.45, currency: 'AUD', isFree: false },
    amenities: ['WiFi', 'Restroom', 'Parking', '24/7 Access', 'Wheelchair Accessible'],
    rating: { average: 4.3, count: 53 },
    isVerified: true,
  },
  // ── TASMANIA ──────────────────────────────────────────────────
  {
    name: 'Chargefox Hobart Salamanca',
    location: loc(147.3316, -42.8819, '1 Salamanca Pl', 'Battery Point', 'Hobart', 'TAS', '7004'),
    operator: { name: 'Chargefox', website: 'https://www.chargefox.com' },
    connectors: [
      { type: 'CCS2', powerKW: 150, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 4, available: 3, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.40, currency: 'AUD', isFree: false },
    amenities: ['Restroom', 'Food', 'Parking', 'Wheelchair Accessible'],
    rating: { average: 4.2, count: 45 },
    isVerified: true,
  },
  {
    name: 'Tesla Supercharger Launceston',
    location: loc(147.1347, -41.4332, '187 Brisbane St', 'Launceston', 'Launceston', 'TAS', '7250'),
    operator: { name: 'Tesla', website: 'https://www.tesla.com' },
    connectors: [
      { type: 'Tesla Supercharger', powerKW: 150, quantity: 6, available: 4, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.52, currency: 'AUD', isFree: false },
    amenities: ['WiFi', 'Parking', '24/7 Access'],
    rating: { average: 4.3, count: 39 },
    isVerified: true,
  },
  {
    name: 'NRMA Devonport Ferry Terminal',
    location: loc(146.3508, -41.1794, 'The Esplanade', 'Devonport', 'Devonport', 'TAS', '7310'),
    operator: { name: 'NRMA', website: 'https://www.mynrma.com.au' },
    connectors: [
      { type: 'CCS2', powerKW: 150, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 2, available: 2, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.00, currency: 'AUD', isFree: true },
    amenities: ['Restroom', 'Food', 'Parking'],
    rating: { average: 4.1, count: 28 },
    isVerified: true,
  },
  // ── NORTHERN TERRITORY ────────────────────────────────────────
  {
    name: 'Chargefox Darwin Waterfront',
    location: loc(130.8421, -12.4574, '7 Kitchener Dr', 'Darwin City', 'Darwin', 'NT', '0800'),
    operator: { name: 'Chargefox', website: 'https://www.chargefox.com' },
    connectors: [
      { type: 'CCS2', powerKW: 150, quantity: 4, available: 3, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 4, available: 4, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.45, currency: 'AUD', isFree: false },
    amenities: ['WiFi', 'Restroom', 'Food', 'Parking', 'Wheelchair Accessible'],
    rating: { average: 4.0, count: 31 },
    isVerified: true,
  },
  {
    name: 'Territory EV Alice Springs Todd Mall',
    location: loc(133.8807, -23.6980, '60 Todd Mall', 'Alice Springs', 'Alice Springs', 'NT', '0870'),
    operator: { name: 'Chargefox' },
    connectors: [
      { type: 'CCS2', powerKW: 50, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 2, available: 2, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.45, currency: 'AUD', isFree: false },
    amenities: ['Restroom', 'Parking', '24/7 Access'],
    rating: { average: 3.9, count: 22 },
    isVerified: true,
  },
  // ── HIGHWAY / INTERCITY CORRIDOR ─────────────────────────────
  {
    name: 'NRMA Mittagong Hume Highway',
    location: loc(150.4440, -34.4547, '22 Old Hume Hwy', 'Mittagong', 'Mittagong', 'NSW', '2575'),
    operator: { name: 'NRMA', website: 'https://www.mynrma.com.au' },
    connectors: [
      { type: 'CCS2', powerKW: 150, quantity: 2, available: 2, status: 'available' },
      { type: 'CHAdeMO', powerKW: 50, quantity: 1, available: 1, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.00, currency: 'AUD', isFree: true },
    amenities: ['Restroom', 'Food', 'Parking', '24/7 Access'],
    rating: { average: 4.1, count: 49 },
    isVerified: true,
  },
  {
    name: 'Chargefox Holbrook Hume Highway',
    location: loc(147.3138, -35.7270, '99 Albury St', 'Holbrook', 'Holbrook', 'NSW', '2644'),
    operator: { name: 'Chargefox', website: 'https://www.chargefox.com' },
    connectors: [
      { type: 'CCS2', powerKW: 150, quantity: 2, available: 1, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 2, available: 2, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.40, currency: 'AUD', isFree: false },
    amenities: ['Restroom', 'Food', 'Parking'],
    rating: { average: 4.0, count: 33 },
    isVerified: true,
  },
  {
    name: 'Evie Networks Euroa Gateway Highway',
    location: loc(145.5705, -36.7513, '5 Kirkland Ave', 'Euroa', 'Euroa', 'VIC', '3666'),
    operator: { name: 'Evie Networks', website: 'https://www.evie.com.au' },
    connectors: [
      { type: 'CCS2', powerKW: 150, quantity: 2, available: 2, status: 'available' },
      { type: 'CHAdeMO', powerKW: 50, quantity: 1, available: 1, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.40, currency: 'AUD', isFree: false },
    amenities: ['Restroom', 'Parking', '24/7 Access'],
    rating: { average: 4.0, count: 27 },
    isVerified: true,
  },
  {
    name: 'Ampol AmpCharge Goondiwindi',
    location: loc(150.3097, -28.5492, '73 Marshall St', 'Goondiwindi', 'Goondiwindi', 'QLD', '4390'),
    operator: { name: 'Ampol AmpCharge', website: 'https://www.ampol.com.au' },
    connectors: [
      { type: 'CCS2', powerKW: 150, quantity: 2, available: 2, status: 'available' },
      { type: 'Type 2', powerKW: 22, quantity: 2, available: 2, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.42, currency: 'AUD', isFree: false },
    amenities: ['Restroom', 'Food', 'Parking', '24/7 Access'],
    rating: { average: 4.1, count: 24 },
    isVerified: true,
  },
  {
    name: 'Chargefox Bordertown SA',
    location: loc(140.7748, -36.3088, '30 Dukes Hwy', 'Bordertown', 'Bordertown', 'SA', '5268'),
    operator: { name: 'Chargefox', website: 'https://www.chargefox.com' },
    connectors: [
      { type: 'CCS2', powerKW: 350, quantity: 2, available: 2, status: 'available' },
      { type: 'CHAdeMO', powerKW: 50, quantity: 1, available: 1, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.40, currency: 'AUD', isFree: false },
    amenities: ['Restroom', 'Parking', '24/7 Access'],
    rating: { average: 4.2, count: 41 },
    isVerified: true,
  },
  {
    name: 'Chargefox Nullarbor Roadhouse WA',
    location: loc(129.0038, -31.4424, 'Eyre Hwy', 'Nullarbor', 'Nullarbor', 'WA', '6443'),
    operator: { name: 'Chargefox', website: 'https://www.chargefox.com' },
    connectors: [
      { type: 'CCS2', powerKW: 150, quantity: 2, available: 2, status: 'available' },
      { type: 'CHAdeMO', powerKW: 50, quantity: 1, available: 1, status: 'available' },
    ],
    chargerLevel: 'DC Fast Charger',
    pricing: { perKWh: 0.00, currency: 'AUD', isFree: true },
    amenities: ['Restroom', 'Food', 'Parking', '24/7 Access'],
    rating: { average: 4.4, count: 58 },
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
    logger.info(`Inserted ${preparedStations.length} charging stations across all Australian states`);

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
