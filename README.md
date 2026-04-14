                                                 Software Requirement 	`Specification Report on Ev charging finder

1Introduction:
 Purpose
The purpose of this Software Requirements Specification (SRS) document is to organize and describe the EV Charging Station Finder website requirements in a comprehensible way. It describes the main elements of the system as well as how it operates. This document outlines the functions, features, and methods of operation of the system. It addresses both non-functional criteria (such system performance, security, and usability) and functional requirements (like looking for charging stations and viewing details). 
1.2 Scope:
The EV Charging Station Finder system's purpose is to create a web-based platform that makes it simple for users to find local EV charging stations. Users will be able to examine important data such charger type, availability, pricing, and operation hours, search for stations depending on their present location, and obtain directions via a map on the website. Additionally, it will have capabilities like basic user account functions like login and profile maintenance, as well as filtering choices (such fast chargers and distance). Web browsers that are used on internet-connected computers, tablets, and smartphones will be able to access the system. 

Definitions, Acronyms, and Abbreviations

Term 	Definition
SRS	Software Requirement Specification
API	Application Programming interface
GPS	Global positioning System
UI	User Interface
UX	User Experience
FR	Functional Requirement
NFR	Nonfunctional Requirement 
JWT	JSON Web Token

Intended Audience 
This Document is intended for:
•	Project Developers
•	University Supervisors
•	Skill up Labs (Industry Partner)
•	Test Engineers
•	End users (EV drivers)
2. Overall Description
2.1 Product Perspective 
The EV Charging Station Finder is a separate website which is accessible through modern browsers that makes it simple for users to find charging stations for electric vehicles. The system is designed to give EV customers who require rapid access to charging station information a straightforward and easy-to-use experience.
System Architecture:
Frontend
 React.js + Tailwind CSS
Backend
 Node.js + Express.js
Database
 MongoDB
External Services
 Map box API / Open Charge Map API / OSM
2.2 Product Functions
The system will perform the following Functions:
•	Show charging stations on a map.
•	Identify the user's present location.
•	Allow users to look for charging stations
•	Provide options for filters, such as distance and charger type.
•	Display comprehensive details about each station, such as availability and cost.
•	Give stations navigation and route planning.
•	Permit customers to bookmark their preferred charging stations.
•	Display recent searches for easy access.
•	Integrate external APIs to obtain data in real time.
2.3 User Classes
User Type 	Description
Guest 	Unregistered visitors with access to map, search, calculator.
Registered Ev Driver	Primary users can save favorites, plan routes, receive notifications, and manage vehicle profile.
Admin	Manage station data, can perform the CRUD Operation, and perform Analytics.
2.4 Assumptions and Dependencies
It is assumed that users have an active internet connection, a modern browser with JavaScript and geolocation enabled, and that GPS accuracy is adequate for proximity searches. Dependencies: Node.js v18+ is available on the hosting server; MongoDB Atlas is operational; Open Charge Map and Mapbox APIs are still accessible; and SMTP service is set up for email notifications.
Operational Setting 
The program will function on:
•	Desktop browsers 
•	Mobile web browsers 
•	Tablet devices
Browsers that are supported: 
•	Chrome on Google 
•	Microsoft Edge 
•	Firefox and Safari
3: Functional Requirements:
User Registration and Authentication (FR-01 to FR-05)
ID	Requirement 	Priority
FR-01	Users can register via email and password.	High
FR-02	Users will be able to sign in and keep their authenticated accounts active	High
FR-03	Users will be able to update their profile, which will include vehicle information.	High
FR-04	Multi-factor authentication (MFA) will be supported by the system as an optional feature.	High
FR-05	Passwords can be reset by users using email verification.	High

Map and Station Discovery (FR-06 to FR-10)
ID	Requirement	Priority
FR-06	The website will offer an interactive map of charging stations that are within a user-specified radius of their current location.	High
FR-07	The station availability status on the map must be updated almost right away (within 120 seconds).	Medium
FR-08	 Users will be able to look up stations using postcode, addresses, or suburbs.	High
FR-09	Station indicators (green for available, red for full, and grey for offline) must graphically represent availability on the map.	Medium
FR-10	A complete station page with all connector kinds, images, reviews, and operating hours will be available to users.	Medium


Filtering and Search (FR-11 to FR-15)
ID	Requirement 	Priority
FR-11	Users will be able to filter stations according to the kind of connector (kind 1, Type 2, CCS, CHAdeMO, Tesla Supercharger).	Medium
FR-12	Users will have the option to filter based on the minimum charging speed (kW)	High
FR-13	Users will have the option to filter to display only stations that are currently available.	High
FR-14	Users will have the option to filter by network provider.	Medium
FR-15	Users will have the option to filter by price (free, paid, or subscription).	High

Navigation (FR-16 to FR-18)
ID	Requirement	Priority
FR-16	Users will be able to use integrated or third-party maps to start turn-by-turn navigation to a designated station.	Medium
FR-17	Before navigation starts, the system must show the approximate journey time and distance.	High
FR-18	A charging station may be added by users as a waypoint on a multi-stop route.	Medium

Notifications (FR-19 to FR-21)
ID	Requirement	Priority
FR-19	Push alerts will be given to users once a monitored station becomes available.	Medium
FR-20	When a user's charging session is finished (if the network allows it), the system will alert them.	Low
FR-21	The app settings will allow users to control their notification options. 	Low

Non-Functional Requirements
Performance 
NFR-01	station data and map tiles should load in three seconds.
NFR-02	At least 5000 concurrent users must be supported by the system without experiencing any performance reduction.
NFR-03	Under typical demand API response times for station availability requests should not be longer than one second.
Reliability and Availability
NFR-04	In the event of a system Breakdown, the system will immediately switch to backup servers.
NFR-05	To avoid data loss, the system must regularly perform data backups once every six hours. 
NFR-06	The system must guarantee high availability on various devices such as desktops and mobile.
 
Security
NFR-07	TLS 1.3 or above must be used to encrypt all data in transit.
NFR-08	Argon2 hashing must be used to store passwords, with a minimum cost factor of 12. 
NFR-09	Unless the user chooses to opt into history, user location data cannot be kept on servers after the current session.


Usability
NFR-10	The program must be able to be used on a typical smartphone with one hand.
NFR-11	The UI should conform to WCAG 2.2.1 AA accessibility standards
NFR-12	Without a tutorial, new users must be able to find a local charging station within 60 seconds of launching the app.

Scalability and Maintainability
NFR	The system architecture must enable backend services to scale horizontally. 
NFR	The codebase must retain a minimum of 80% coverage of unit tests. 
 NFR	Additional charging network integrations must be added without requiring modifications to the main application logic.

External Interface Requirement:
User Interface
The system will offer a dynamic and user-friendly interface that functions flawlessly on a variety of devices, including computers, tablets, and smartphones. It will have an interactive map that shows charging stations and a search bar that makes it simple for users to locate them. When a user chooses a particular charging station, a station popup will show extensive information, and a sidebar filter will assist users in filtering their search based on preferences.
Hardware Interface
The following major screens are included in the system's responsive,  online interface: Home Page (full-screen map with sidebar search and filters); Station Detail Panel (connectors, pricing,  favorite toggle); Route Planner (origin/destination inputs, vehicle parameters, route map with stops); Calculator (battery inputs with vehicle presets, comparison charts); Compatibility Page (compatible station results with vehicle selector); User Dashboard (favorites, notifications, profile tabs); Admin Dashboard (station CRUD table and analytics); and Login/Register pages.

Software interface
The system's software interface will incorporate external services including the Geolocation API to determine the user's location, the Open Charge Map API to obtain real-time charging station data, and the Map box API to visualize maps and charging stations.
Communication Interface
In terms of communication, the system will make effective use of REST APIs to transfer data between the client and external services. The HTTPS protocol will be used to secure all communication to safeguard user information and guarantee secure transmission. To provide the most recent charging station availability and status, the system will handle real-time data updates. The system will also offer asynchronous interactions to improve responsiveness and minimize delays during user interactions, as well as data caching to cut down on pointless API calls and boost performance.





Use Case Diagram
 

Description of Use Cases
The Use Case Diagram illustrates the main interactions between different types of users and the EV Charging Station Finder system.
Actors
•	Guest: A visitor who has not registered or logged in.
•	User (Registered EV Driver): The primary actor who uses the system to find and navigate to charging stations.
•	Admin: Manages the charging station data and system.
Main Use Cases for Guest
•	View Map
•	Search Stations
•	View Station Details
•	Plan Route

Main Use Cases for Registered User
•	View Map
•	Search Stations
•	View Station Details
•	Plan Route
•	Add Charging Stop
•	Save Favorites
•	Receive Notifications (future enhancement)
Main Use Cases for Admin
•	Delete Station
•	Manage Users
•	Monitor System
This diagram shows that Guests have limited access, while registered Users can save favorites and plan routes. The admin has full control over station data. This design supports both quick public access and personalized features for regular EV drivers.
System Architecture
System Architecture
The EV Charging Station Finder application follows a modern MERN stack architecture with clear separation of concerns. This layered design makes the system scalable, secure, and easier to maintain within the 12-week project timeline.
 
Architecture Layers
Client Layer (Frontend) 
The frontend is built using React.js + Tailwind CSS. It provides a responsive and user-friendly interface including:
•	Interactive map view (using Mapbox)
•	Route planner and directions
•	Cost and time calculator
•	User dashboard with favorites and search history
•	Admin panel for CRUD operations
•	Real-time notifications using Socket.io client
API Gateway Layer
This layer is implemented with Express.js. It acts as the single-entry point for all client requests and includes:
•	JWT middleware for authentication
•	Rate limiting to prevent abuse
•	CORS and Helmet for security
•	REST endpoints and Socket.io server
Service Layer (Business Logic) 
The core logic is separated into dedicated services for better maintainability:
•	Auth Service: Handles JWT tokens, crypt password hashing, and role-based guards
•	Station Service: Fetches data from Open Charge Map API, applies caching and filtering
•	Route Service: Uses Mapbox Directions API and handles charging stops
•	EV Range Calculator Service: Calculates battery usage, cost, and travel time
•	Notification Service: Manages real-time updates via Socket.io and email notifications using Nodemailer.
Data Layer
•	MongoDB + Mongoose ODM is used as the primary database to store:
•	Users, Charging Stations, Routes, Vehicles, and Notifications
External APIs & Integrations
 The system integrates with several external services:
•	Open Charge Map API – for charging station data
•	Mapbox API – for map rendering and directions
•	Nodemailer  – for email and push notifications
Key Design Decisions:
•	The layered approach allows independent development and testing of frontend and backend.
•	MongoDB helps handle API rate limits and improves response time.
•	Socket.io enables real-time features such as notifications about station availability.
•	JWT-based authentication ensures secure access for user-specific features like favorites and route history.
This architecture fully supports all the functional requirements (map visualization, search, filtering, navigation, favorites) and non-functional requirements (performance, security, scalability) mentioned in the SRS.
Database Requirements
The EV Charging Station Finder uses MongoDB (NoSQL database) with Mongoose ODM because it handles geospatial queries (for finding nearby charging stations) very well and offers flexible schemas for future enhancements.
Main Collections:
•	Users – Stores user information, vehicle profile, and favorites (array of station ObjectIds).
•	Charging Stations – Core collection with station name, GeoJSON location, connectors, charger level, pricing, availability, etc.
•	Vehicles – Linked to users for EV range calculations (make, model, battery capacity, compatible connectors).
•	Routes – Saves planned trips with charging stops, total distance, duration, and cost.
•	Notifications – For real-time alerts.
•	Search History – Tracks recent searches for logged-in users.


 
Explanation of Class Diagram:
The Class Diagram above shows the main data entities (classes) and their relationships:
•	A User can have many Favorites (Charging Stations) and plans many Routes.
•	A Route uses one Vehicle and stops at multiple Charging Stations.
•	Charging Station includes methods like find Nearby() to support map-based searches.

This design supports all key features from the SRS such as saving favorites, route planning with EV range consideration, and geospatial searches. It also allows easy scaling when we add real-time availability or reservations in the future.
Why MongoDB?
•	Excellent support for GeoJSON location queries (important for "find nearby stations")
•	Flexible document structure for arrays (e.g., connectors, favorites)
•	Works well with the MERN stack
Project Constraints
The EV Charging Station Finder system has some constraints that may affect the system design, implementation, and performance, some of these constraints are:
Time Constraints
The project will last 12 weeks as a part of the Work Integrated Learning (WIL) program. With such a short time constraint, advanced functions as AI-based routing, real-time station information and comprehensive testing cannot be implemented. The search for charging stations, basic user reviews and ratings will be the priorities of the system.
Risk:
•	Emphasis is made on providing a Minimum Viable Product (MVP).
Mitigation:
•	Use Agile method and sprints on a weekly basis. 
•	Pay attention to the key features (map, search, filter, navigation).

External API Constraints
The system depends on third-party APIs such as:
•	Mapbox
•	Open Charge Map API
Issues:
•	API rate limits (Frequencies per second/day)
•	Limited free-tier usage 
•	Latency or possible downtime.
Risk:
Slowness in display of maps or incomplete information on display.
Mitigation:
•	Implement API caching.
•	Minimize unneeded API calls. 
•	Fallback data or alternative APIs.
Data Availability Constraints
Data on charging stations is retrieved via open datasets and external APIs, which contain much-needed data on station location, connector types, availability and operation information necessary to make the system work.
Issues:
•	Information can be old-fashioned or missing. 
•	Absence of real time availability information.
•	Inconsistent data formats.
Risk:
•	Reduced accuracy of station information.
Mitigation:
•	Validate and clean up incoming data.
•	Combine multiple data sources where possible.
•	Allow future integration of real-time data.

Technical Constraints
The system will be developed with:
•	React.js (Frontend), Node.js + 
•	Express.js (Backend) 
•	MongoDB (Database)
Risk:
•	Limits flexibility in technology selection.
•	Requires compatibility within MERN stack.
Mitigation:
•	Utilize common libraries and frameworks. 
•	Follow best practices in full-stack development.
Device and Platform Constraints
The application should be able to support: 
•	Tablet, mobile and desktop. 
•	Different browsers (chrome, Safari, Edge, Firefox etc).
Risk:
•	UI consistency challenges across devices.
Mitigation:
•	Apply responsive design (Tailwind CSS) 
•	Perform cross-browser testing.
Security Constraints
Security constraints include:
•	Securing user information (email, password, preferences) 
•	Safe management of API keys.
Risk:
•	Risk of data breaches, if the data is not managed properly.
Mitigation:
•	Use HTTPS protocol.
•	Store sensitive data securely.
•	Implement authentication mechanisms.
Internet Dependency
The system will need constant access to the internet to communicate to external APIs, access charging station information and offer real-time mapping and navigation services. The app uses online services to locate places, create routes and update data and without internet access, the system cannot work correctly.
Risk:
•	System unusable in offline mode
Mitigation:
•	Display user-friendly error messages
•	Cache previously loaded data (future improvement)
Future Enhancements
The existing system has all the necessary basic functionalities needed to discover and navigate EV charging stations. However, the system can be further expanded and added with additional features which can help to improve its scalability, usability, efficiency and overall intelligence.
Real-Time Charging Availability
•	Integrate live data from charging stations
Display:
•	Available chargers
•	Occupied chargers
•	Waiting time
Payment Integration
•	Allow in-app payment to charge services.
•	Add payment gateways as an option (e.g., Stripe).
Features:
•	Secure transactions
•	Payment history tracking

Charging Slot Reservation
Allow users to book charging stations in advance
Features:
•	Time-slot selection
•	Booking confirmation
AI-Based Route Optimization
Intelligent route planning based on:
•	Battery level (Vehicle entity)
•	Distance and traffic
•	Charging station availability
Mobile Application Development
Develop native apps for:
•	Android
•	iOS
Benefits:
•	Better performance
•	Push notifications support
Smart Notification System
Notify users about:
•	Nearby stations
•	Availability updates
•	Promotions or alerts
Vehicle Integration
Allow users to input EV details (battery, range)
Features:
•	Personalized station recommendations
Admin Dashboard
Manage:
•	Stations
•	Users
•	System analytics
Acceptance Criteria
System is accepted when:
•	Map displays stations
•	Search works
•	Navigation works
•	Filters work
•	UI responsive
When the system satisfies the functional and non-functional requirements listed below, the system would only be acceptable.
Functional Acceptance Criteria
Map and Location
•	The system shall load the map within 3 seconds
•	Charging stations shall be displayed accurately on the map
•	User location shall be detected using geolocation
Search Functionality
Users shall be able to search by:
•	City
•	Address
•	Postcode
Filtering:
Users shall be able to filter stations by.
•	Charger type
•	Availability
•	Distance
•	Results shall be updated dynamically
Charging Station Details:
System shall display.
•	Name
•	Location
•	Charger type
•	Availability
•	Operating hours
Navigation
•	System shall generate a valid route to the selected station.
•	Travel time and distance shall be displayed.
User Features:
Users shall be able to.
•	Register/Login (if implemented)
•	Save and remove favorite stations
•	View search history
Non-Functional Acceptance Criteria
Performance
•	Page load time ≤ 3 seconds
•	System supports minimum 1000 concurrent users
Usability
Interface shall be:
•	Responsive across all devices
•	Easy to navigate
•	Tasks should be completed within 3 clicks (max)
Reliability
•	System shall handle API failures gracefully
•	Fallback messages shall be displayed
Security
•	All data transmission shall be used by HTTPS
•	User passwords shall be encrypted
•	API keys shall not be exposed
Testing and Validation Criteria
The system must pass:
•	Unit Testing (backend logic)
•	Integration Testing (API + frontend)
•	UI Testing (responsive design)
•	User Acceptance Testing (UAT)

 
Project Milestones
The EV Charging Station Finder system is developed over a structured 12-week timeline, ensuring a systematic and efficient workflow. The project begins with requirement analysis and the preparation of a detailed SRS, which defines the core functional and non-functional requirements.
A strong foundation is then established through system architecture and database design using the MERN stack and MongoDB. The development phase focuses on two key components: backend implementation (APIs, authentication, business logic) and frontend development (interactive UI with map integration, search, and filtering features).
Following this, system integration connects all components with external services such as Mapbox and Open Charge Map. The project then undergoes rigorous testing to ensure reliability and performance, and concludes with final presentation and documentation, demonstrating the system’s overall effectiveness.
 
Project Timeline
The Gantt chart shows the estimated timeline to complete the project.
 
 
Gantt Chart
 
Project Budget
 
Budget Item	Estimated Cost (AUD)
Research and planning	$130
SRS documentation and design	$90
UI/UX Design	$220
Database design and setup	$200
Backend development	$380
Frontend development	$380
API integration(Map box/Open charge map)	$50
Testing and debugging	$200
Hosting, deployment, internet/tools	$220
Final documentation and presentation	$80
Contingency reserve	$120
Total estimated budget	$2070
Table: Estimated budget allocation for the EV Charging Station Finder project
 
 
Risk Analysis
The development of the EV Charging Station Finder system involves several potential risks that may impact system performance and project delivery. A systematic risk assessment has been conducted to identify these risks, evaluate their potential impact, and define appropriate mitigation strategies.
 
 
Risk	Impact	Mitigation Strategy
Dependency on External APIs (Mapbox, Open Charge Map)	High	Implement fallback mechanisms, caching, and alternative data sources to ensure service consistency
API Rate Limits and Restrictions	Medium	Optimise API requests, reduce unnecessary calls, and implement caching techniques
Project Time Constraints (12-week duration)	Medium	Adopt Agile methodology and prioritise core process to deliver a Minimum Viable Product (MVP)
Data Inaccuracy or Incompleteness	Medium	Apply data verification, preprocessing, and combine multiple data sources for efficient reliability
Internet Dependency	High	Provide clear error handling and cache previously retrieved data where possible
Cross-Platform Compatibility Issues	Medium	Implement responsive design and conduct cross-browser and device testing
Security Risks (data breaches, API key exposure)	High	Use HTTPS, encrypt sensitive data, and manage API keys securely using environment variables
System Performance and Latency	Medium	Use caching and asynchronous data handling to improve response time
 
 
 
 
These risk management strategies help ensure that the system remains stable, efficient and deliverable within the given timeframe.
 
 
 
 
 
Conclusion
The EV Charging Station Finder system has been developed as a practical and user-focused solution to support electric vehicle users in easily locating and accessing charging stations. This Software Requirements Specification (SRS) has clearly outlined the system’s scope, essential key functionalities, and technical requirements, providing a strong foundation for the application’s design and development. The project places particular emphasis on delivering a simple and user-friendly experience through a map-based interface, allowing users to search, filter, and navigate to charging stations efficiently. Core features such as real-time location detection,comprehensive station details and efficient route guidance have been prioritised to ensure that the system meets its primary objective within the given timeline.
One of the significant aspects of this system is its effective way of handling geospatial data. By integrating external APIs and open datasets, the application is able to process and provide accessible and meaningful location-based information. This not only improves usability but also supports users in making quick and informed decisions while on the move.
In addition, the SRS demonstrates careful consideration of system reliability, performance and security, ensuring that the proposed solution is both practical and scalable. The inclusion of optional features such as user preferences and saved locations further strengthens the system’s potential for future development.
Overall, the EV Charging Station Finder successfully fulfils its defined scope and mandatory requirements, while also reflecting the practical application of software engineering principles in a real-world scenario. It establishes a solid foundation for further improvements and contributes to the wider goal of supporting efficient and sustainable transportation systems.
 
 









