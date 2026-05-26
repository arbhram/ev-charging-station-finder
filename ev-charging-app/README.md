# Smart EV Charging Station Finder (capstone Project)

 Full-stack MERN application for discovering, planning routes to, and managing electric vehicle charging stations across Australia.

## folder structure

```
ev-charging-app/
├── backend/                     # Node.js + Express API
│   ├── config/
│   │   └── database.js          # MongoDB connection with retry logic
│   ├── controllers/
│   │   ├── authController.js    # Register, login, profile management
│   │   ├── stationController.js # CRUD, nearby/reachable station queries
│   │   ├── calculatorController.js  # Charging time & cost calculations
│   │   ├── vehicleController.js # Vehicle DB & compatibility matching
│   │   ├── routeController.js   # Route planning with charging stops
│   │   ├── notificationController.js # User notification management
│   │   └── favoritesController.js   # Favorite station management
│   ├── middleware/
│   │   ├── auth.js              # JWT protect, authorize, optionalAuth
│   │   ├── errorHandler.js      # Global error handler + 404
│   │   └── validation.js        # express-validator rules
│   ├── models/
│   │   ├── User.js              # User with auth, vehicle, favorites
│   │   ├── ChargingStation.js   # Station with geospatial indexes
│   │   ├── Vehicle.js           # EV specs & connector compatibility
│   │   ├── Notification.js      # TTL-indexed notifications
│   │   ├── Route.js             # Saved routes with charging stops
│   │   └── index.js             # Centralized exports
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── stationRoutes.js
│   │   ├── calculatorRoutes.js
│   │   ├── vehicleRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── routePlannerRoutes.js
│   │   ├── favoritesRoutes.js
│   │   └── index.js             # Central route registration
│   ├── services/
│   │   ├── socketService.js     # Socket.IO real-time notifications
│   │   └── emailService.js      # Nodemailer email notifications
│   ├── utils/
│   │   ├── ApiError.js          # Custom error class with factory methods
│   │   ├── asyncHandler.js      # Async route wrapper
│   │   ├── calculations.js      # Charging time, cost, range, Haversine
│   │   ├── logger.js            # Winston structured logging
│   │   └── seedData.js          # Database seed script
│   ├── server.js                # Express + Socket.IO entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/                    # React + Tailwind CSS
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Common/
│   │   │   │   ├── Navbar.js            # Navigation with auth state
│   │   │   │   └── SharedComponents.js  # Spinner, ProtectedRoute, etc.
│   │   │   ├── Map/
│   │   │   │   └── MapView.js           # Leaflet interactive map
│   │   │   └── Station/
│   │   │       ├── StationCard.js       # Station list card
│   │   │       └── StationDetail.js     # Station detail panel
│   │   ├── context/
│   │   │   ├── AuthContext.js           # Authentication state
│   │   │   └── SocketContext.js         # Real-time notifications
│   │   ├── hooks/
│   │   │   └── useCustomHooks.js        # Geolocation, debounce, API hooks
│   │   ├── pages/
│   │   │   ├── HomePage.js              # Map + search + filters
│   │   │   ├── RoutePlannerPage.js      # Route planning with stops
│   │   │   ├── CalculatorPage.js        # Charging cost/time calculator
│   │   │   ├── CompatibilityPage.js     # Vehicle-charger matching
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterPage.js
│   │   │   ├── DashboardPage.js         # User favorites & notifications
│   │   │   └── AdminPage.js             # Station management & analytics
│   │   ├── services/
│   │   │   ├── api.js                   # Axios instance with interceptors
│   │   │   ├── authService.js
│   │   │   ├── stationService.js
│   │   │   ├── calculatorService.js
│   │   │   ├── vehicleService.js
│   │   │   ├── routeService.js
│   │   │   └── miscServices.js          # Favorites + Notifications
│   │   ├── utils/
│   │   │   └── helpers.js               # Formatting & display utilities
│   │   ├── App.js                       # Root component with routing
│   │   ├── index.js                     # Entry point
│   │   └── index.css                    # Tailwind + custom styles
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   └── .env.example
│
└── README.md
```

## Tech Stack

| Layer      | Technology                                       |
|------------|--------------------------------------------------|
| Frontend   | React 18, Tailwind CSS, React Router, Axios      |
| Maps       | Leaflet + OpenStreetMap (dark theme)              |
| Backend    | Node.js, Express.js                               |
| Database   | MongoDB + Mongoose (geospatial indexes)           |
| Auth       | JWT with bcrypt password hashing                  |
| Real-time  | Socket.IO                                         |
| Email      | Nodemailer                                        |
| Logging    | Winston                                           |
| Security   | Helmet, CORS, express-rate-limit, express-validator |

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

```bash
cd backend
cp .env.example .env        # Edit with your config
npm install
npm run seed                # Populate sample data
npm run dev                 # Start on port 5000
```

### Frontend Setup

```bash
cd frontend
cp .env.example .env        # Edit with your config
npm install
npm start                   # Start on port 3000
```

### Demo Credentials

| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | admin@evcharging.com   | Admin123!  |
| User  | demo@evcharging.com    | Demo123!   |

## API Endpoints

### Authentication
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login
- `GET  /api/auth/me` — Get profile (protected)
- `PUT  /api/auth/profile` — Update profile (protected)
- `PUT  /api/auth/password` — Change password (protected)

### Charging Stations
- `GET  /api/stations` — List all with filters/pagination
- `GET  /api/stations/nearby?lat=&lng=&radius=` — Geospatial search
- `GET  /api/stations/reachable?lat=&lng=&battery=&range=` — Range-based
- `GET  /api/stations/:id` — Get single station
- `POST /api/stations` — Create (admin)
- `PUT  /api/stations/:id` — Update (admin)
- `DELETE /api/stations/:id` — Soft delete (admin)
- `GET  /api/stations/analytics/overview` — Analytics (admin)

### Calculator
- `POST /api/calculator/charge` — Full calculation
- `POST /api/calculator/quick-estimate` — Compare all charger levels

### Vehicles
- `GET  /api/vehicles` — List all vehicles
- `GET  /api/vehicles/makes` — Get unique makes
- `GET  /api/vehicles/:id/compatible-stations` — Compatible stations

### Route Planning
- `POST /api/routes/plan` — Plan route with charging stops
- `GET  /api/routes` — Get saved routes (protected)
- `POST /api/routes` — Save route (protected)
- `DELETE /api/routes/:id` — Delete route (protected)

### Favorites
- `GET  /api/favorites` — Get user favorites (protected)
- `POST /api/favorites/:stationId` — Add favorite (protected)
- `DELETE /api/favorites/:stationId` — Remove favorite (protected)

### Notifications
- `GET  /api/notifications` — Get notifications (protected)
- `PUT  /api/notifications/read-all` — Mark all read (protected)
- `PUT  /api/notifications/:id/read` — Mark one read (protected)

## Key Business Logic

### Charging Time Formula
```
energyRequired = (batteryCapacity * (target% - current%) / 100) / efficiency
chargingTime = energyRequired / chargerPowerKW
```

### Range Calculation
```
reachableDistance = (currentBattery% / 100) * totalRange
safeDistance = ((currentBattery% - 10%) / 100) * totalRange
```

### Route Planning Algorithm
Greedy algorithm that selects the farthest reachable station that minimizes remaining distance to destination, charging to 80% at each stop.

## Deployment

### Backend (Render / Railway / AWS)
1. Set environment variables
2. MongoDB Atlas for production database
3. `npm start` runs `node server.js`

### Frontend (Vercel / Netlify)
1. Set `REACT_APP_API_URL` to production backend
2. Build: `npm run build`
3. Deploy the `build/` directory

## License

This project is built as a capstone project for educational purposes.
