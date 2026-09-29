# 📍 PlaceMatch — AI-Powered Location & Lifestyle Suitability Analyzer

**PlaceMatch** is a modern, interactive web application that helps users evaluate whether a specific geographical location suits their unique lifestyle needs. Powered by **OpenStreetMap (Overpass API)** for real-time geospatial data and **Google Gemini AI** for intelligent suitability scoring and narrative analysis, PlaceMatch turns raw spatial data into actionable lifestyle insights.

---

## 🌟 Key Features

### 1. 🗺️ Interactive Map Location Pinning
- **Drag-and-Drop Pinning**: Easily select any geographical location worldwide by clicking or dragging a marker on an interactive **Leaflet** map.
- **Smooth Navigation & Zoom**: Auto-centers and zooms smoothly to selected coordinates with real-time latitude/longitude feedback.

### 2. 👥 Tailored Lifestyle Profiles & Needs Customization
- **Pre-configured Lifestyle Profiles**:
  - 💑 **Couples**: Evaluates parks, romantic dining, shopping centers, cafes, and theaters while monitoring industrial/highway noise.
  - 🏠 **Bachelors**: Focuses on transit links, gyms, restaurants, ATMs, colleges, and nightlife.
  - 👴 **Senior Citizens / Old Age**: Prioritizes healthcare, pharmacies, quiet parks, places of worship, and grocery access while flagging traffic and noise risks.
  - 🎒 **School Children**: Checks proximity to schools, playgrounds, libraries, and parks while guarding against heavy traffic, liquor stores, and industrial hazards.
- **Customizable Needs & Risks**: Toggle specific amenities (needs) or potential drawbacks (risk factors) per category.

### 3. 📊 ComParison Mode (Multi-Category Analysis)
- **Side-by-Side Category Matrix**: Compare suitability scores, amenity density, and risk factors across multiple profiles simultaneously.
- **Interactive Map Category Filter**: Filter map markers by specific category or view all facilities at once.
- **Comprehensive Summary Matrix**: Detailed breakdown comparing scores, recommendations, and matched amenities for each target demographic.

### 4. 🌐 Real-Time OpenStreetMap (Overpass API) Integration
- **Live Amenity & Hazard Scan**: Queries real-time spatial nodes, ways, and relations within a user-defined search radius (default 4km).
- **Multi-Server Failover**: Resilient backend logic querying multiple Overpass servers (`kumi.systems`, `overpass-api.de`, etc.) with fallback strategies.
- **Haversine Distance Calculation**: Precise metric distances calculated for all identified amenities and risk items.

### 5. 🤖 AI-Powered Suitability Scoring & Insights
- **Google Gemini AI Integration**: Synthesizes spatial findings to generate:
  - An overall **Suitability Score (0–100)** based on weighted amenity-to-risk balance.
  - Concise, tailored narrative summaries explaining location pros and cons.
- **Offline / Fallback Simulation**: Built-in fallback algorithm guarantees full UI functionality even without an active API key.

### 6. ✨ Modern Dark Glassmorphic Design
- **Fluid Visual Experience**: Dark mode glassmorphism styled with pure CSS, custom gradients, interactive cards, and distance badge indicators.
- **Floating Particles Animation**: Canvas-based background animation for a dynamic feel.
- **Animated Counter**: Eased numeric counter animations for visual impact.

---

## 🛠️ Technology Stack

| Component | Technology Used |
| :--- | :--- |
| **Frontend Framework** | [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) |
| **Routing** | [React Router v6](https://reactrouter.com/) |
| **Mapping & GIS** | [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/) |
| **Map Tiles** | [OpenStreetMap](https://www.openstreetmap.org/) |
| **Spatial Data API** | Overpass API (OpenStreetMap Interpreter) |
| **AI Insights** | [Google Gemini API](https://ai.google.dev/) (`gemini-pro`) |
| **Styling & Effects** | Vanilla CSS3 (Glassmorphism, CSS Grid, Custom Animations) |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v16.0 or higher)
- **npm** (v8.0 or higher)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Suhas17-it/Place_match.git
   cd Place_match
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory based on `.env.example`:
   ```env
   # Gemini API Key (Optional - for real AI analysis)
   VITE_GEMINI_API_KEY=your_gemini_api_key_here

   # EmailJS Keys (Optional - for custom category request submissions)
   VITE_EMAILJS_SERVICE_ID=your_service_id
   VITE_EMAILJS_TEMPLATE_ID=your_template_id
   VITE_EMAILJS_PUBLIC_KEY=your_public_key
   ```
   > 💡 *Note: If no Gemini API key is provided, PlaceMatch will seamlessly use its intelligent fallback scoring engine.*

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173`.

5. **Build for Production**:
   ```bash
   npm run build
   ```
   To preview the production build locally:
   ```bash
   npm run preview
   ```

---

## 📁 Project Structure

```
Place_match/
├── public/                # Static public assets
├── src/
│   ├── assets/            # Project images and icons
│   ├── components/        # Shared components
│   │   ├── FloatingParticles.jsx  # Background animation canvas
│   │   ├── FloatingParticles.css  # Particle styling
│   │   └── Map.jsx                # Leaflet interactive map wrapper
│   ├── data/              # Static data & category configuration
│   │   └── categoryData.js    # Needs, risks & profile definitions
│   ├── pages/             # Application pages/routes
│   │   ├── Home.jsx               # Landing page & location selection map
│   │   ├── Home.css
│   │   ├── CategorySelection.jsx  # Profile selection & custom parameter tuning
│   │   ├── CategorySelection.css
│   │   ├── Results.jsx            # Analysis results, comparison table & map view
│   │   └── Results.css
│   ├── services/          # External API & service handlers
│   │   ├── dataService.js         # Overpass API queries & Gemini AI analysis
│   │   └── emailService.js        # Custom category request email handler
│   ├── App.jsx            # Main app router component
│   ├── App.css            # App layout styles
│   ├── main.jsx           # React DOM entry point
│   └── index.css          # Design system, CSS variables & global utility styles
├── .env.example           # Example environment variables
├── index.html             # HTML entry point
├── package.json           # Node package dependencies & scripts
└── vite.config.js         # Vite configuration
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

