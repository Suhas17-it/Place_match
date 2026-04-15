import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { searchNearbyPlaces, generateSuitabilityAnalysis } from '../services/dataService';
import 'leaflet/dist/leaflet.css';
import './Results.css';

// Custom marker icons
const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const blueIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

function Results() {
    const navigate = useNavigate();
    const location = useLocation();
    const { latitude, longitude, selectedCategories, customCategory } = location.state || {};

    const [nearbyPlaces, setNearbyPlaces] = useState({ needs: [], risks: [] });
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);

    // Redirect if no data
    useEffect(() => {
        if (!latitude || !longitude || !selectedCategories) {
            navigate('/');
        }
    }, [latitude, longitude, selectedCategories, navigate]);

    if (!latitude || !longitude || !selectedCategories) {
        return null;
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Fetch nearby places
                const places = await searchNearbyPlaces(latitude, longitude, selectedCategories);
                setNearbyPlaces(places || { needs: [], risks: [] });

                // Generate analysis
                const analysisResult = await generateSuitabilityAnalysis(
                    { latitude, longitude },
                    selectedCategories,
                    places || { needs: [], risks: [] }
                );
                setAnalysis(analysisResult);
            } catch (error) {
                console.error('Error in fetchData:', error);
                setAnalysis({
                    summary: 'Error loading analysis. Please try again.',
                    score: 0,
                    needsCount: 0,
                    risksCount: 0
                });
            } finally {
                setLoading(false);
            }
        };

        if (latitude && longitude && selectedCategories) {
            fetchData();
        }
    }, [latitude, longitude, selectedCategories]);

    const handleStartOver = () => {
        navigate('/');
    };

    const allPlaces = [...nearbyPlaces.needs, ...nearbyPlaces.risks];
    const position = [parseFloat(latitude), parseFloat(longitude)];

    return (
        <div className="results-page">
            <div className="container">
                {/* Header */}
                <div className="results-header">
                    <h1 className="page-title">Location Analysis Results</h1>
                    <div className="location-info">
                        <span className="location-badge">📍 {latitude}, {longitude}</span>
                        <span className="category-badge">
                            {selectedCategories.map(c => c.name).join(', ')}
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Analyzing location and nearby amenities...</p>
                    </div>
                ) : (
                    <>
                        {/* Summary Card */}
                        <div className="glass-card summary-card">
                            <div className="summary-header">
                                <h2>AI-Powered Suitability Analysis</h2>
                                <div className="score-badge" style={{
                                    background: (analysis?.score || 0) >= 70 ? '#4ade80' : (analysis?.score || 0) >= 40 ? '#fbbf24' : '#f87171'
                                }}>
                                    {analysis?.score || 0}%
                                </div>
                            </div>
                            <p className="summary-text">{analysis.summary}</p>
                            <div className="summary-stats">
                                <div className="stat">
                                    <span className="stat-value">{analysis.needsCount}</span>
                                    <span className="stat-label">Amenities Found</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">{analysis.risksCount}</span>
                                    <span className="stat-label">Risk Factors</span>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Grid */}
                        <div className="results-grid">
                            {/* Map Section */}
                            <div className="map-container">
                                <h3 className="section-title">Location Map</h3>
                                <div className="map-wrapper">
                                    <MapContainer
                                        center={position}
                                        zoom={14}
                                        style={{ height: '100%', width: '100%' }}
                                        scrollWheelZoom={true}
                                    >
                                        <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />

                                        {/* Main location marker */}
                                        <Marker position={position} icon={blueIcon}>
                                            <Popup>
                                                <strong>Your Selected Location</strong>
                                                <br />
                                                {latitude}, {longitude}
                                            </Popup>
                                        </Marker>

                                        {/* Nearby places markers */}
                                        {allPlaces.map((place, idx) => (
                                            <Marker
                                                key={idx}
                                                position={[place.lat || position[0], place.lng || position[1]]}
                                                icon={place.category === 'need' ? greenIcon : redIcon}
                                            >
                                                <Popup>
                                                    <strong>{place.name}</strong>
                                                    <br />
                                                    Distance: {place.distance} km
                                                    <br />
                                                    Type: {place.type}
                                                </Popup>
                                            </Marker>
                                        ))}
                                    </MapContainer>
                                </div>
                                <div className="map-legend">
                                    <div className="legend-item">
                                        <span className="legend-dot blue"></span>
                                        <span>Your Location</span>
                                    </div>
                                    <div className="legend-item">
                                        <span className="legend-dot green"></span>
                                        <span>Amenities</span>
                                    </div>
                                    <div className="legend-item">
                                        <span className="legend-dot red"></span>
                                        <span>Risk Factors</span>
                                    </div>
                                </div>
                            </div>

                            {/* Places List */}
                            <div className="places-list">
                                {/* Needs */}
                                {nearbyPlaces.needs.length > 0 && (
                                    <div className="places-section">
                                        <h3 className="section-title">✅ Nearby Amenities</h3>
                                        <div className="places-items">
                                            {nearbyPlaces.needs.map((place, idx) => (
                                                <div key={idx} className="place-item need-item">
                                                    <div className="place-info">
                                                        <h4 className="place-name">{place.name}</h4>
                                                        <p className="place-type">{place.type.replace(/_/g, ' ')}</p>
                                                    </div>
                                                    <div className="place-distance">
                                                        {place.distance} km
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Risks */}
                                {nearbyPlaces.risks.length > 0 && (
                                    <div className="places-section">
                                        <h3 className="section-title">⚠️ Risk Factors</h3>
                                        <div className="places-items">
                                            {nearbyPlaces.risks.map((place, idx) => (
                                                <div key={idx} className="place-item risk-item">
                                                    <div className="place-info">
                                                        <h4 className="place-name">{place.name}</h4>
                                                        <p className="place-type">{place.type.replace(/_/g, ' ')}</p>
                                                    </div>
                                                    <div className="place-distance">
                                                        {place.distance} km
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {nearbyPlaces.needs.length === 0 && nearbyPlaces.risks.length === 0 && (
                                    <div className="no-data">
                                        <p>No data available for this location. Try a different area.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Custom Category Notice */}
                        {customCategory && (
                            <div className="glass-card custom-notice">
                                <h3>📧 Custom Category Submitted</h3>
                                <p>Your custom category "{customCategory}" has been sent to our admin team for review. We'll add it to our analysis soon!</p>
                            </div>
                        )}

                        {/* Action Button */}
                        <div className="action-section">
                            <button className="btn btn-primary" onClick={handleStartOver}>
                                🏠 Start New Analysis
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default Results;
