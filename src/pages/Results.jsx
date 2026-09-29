import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { searchNearbyPlaces, generateSuitabilityAnalysis, getPlacesForMultipleCategories, generateComparisonAnalysis } from '../services/dataService';
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

// Animated score counter hook
function useAnimatedScore(target, duration = 1500) {
    const [score, setScore] = useState(0);
    const frameRef = useRef(null);

    useEffect(() => {
        if (target === null || target === undefined) return;
        let start = null;
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setScore(Math.round(eased * target));
            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate);
            }
        };
        frameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameRef.current);
    }, [target, duration]);

    return score;
}

// Distance badge color helper
function getDistanceColor(distance) {
    if (distance <= 1) return 'distance-close';
    if (distance <= 2.5) return 'distance-medium';
    return 'distance-far';
}

// Sub-component to safely use animated hook in loop
function AnimatedScoreValue({ score }) {
    const animatedValue = useAnimatedScore(score);
    return <>{animatedValue}</>;
}

function Results() {
    const navigate = useNavigate();
    const location = useLocation();
    const { latitude, longitude, selectedCategories, allCategories, isComparisonMode, customCategory, radius = 4000 } = location.state || {};

    const [nearbyPlaces, setNearbyPlaces] = useState({ needs: [], risks: [] });
    const [comparisonData, setComparisonData] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [activeCompareCategory, setActiveCompareCategory] = useState('all');

    const animatedScore = useAnimatedScore(!isComparisonMode ? (analysis?.score ?? null) : null);

    // Redirect if no data
    useEffect(() => {
        if (!latitude || !longitude || (!selectedCategories && !allCategories)) {
            navigate('/');
        }
    }, [latitude, longitude, selectedCategories, allCategories, navigate]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                if (isComparisonMode && allCategories) {
                    const comparisonPlaces = await getPlacesForMultipleCategories(latitude, longitude, allCategories, radius);
                    setComparisonData(comparisonPlaces);

                    const analysisResult = await generateComparisonAnalysis(
                        { latitude, longitude },
                        allCategories,
                        comparisonPlaces
                    );
                    setAnalysis(analysisResult);
                } else {
                    // Fetch nearby places with custom radius
                    const places = await searchNearbyPlaces(latitude, longitude, selectedCategories, radius);
                    setNearbyPlaces(places || { needs: [], risks: [] });

                    // Generate analysis
                    const analysisResult = await generateSuitabilityAnalysis(
                        { latitude, longitude },
                        selectedCategories,
                        places || { needs: [], risks: [] }
                    );
                    setAnalysis(analysisResult);
                }
            } catch (err) {
                console.error('Error in fetchData:', err);
                setError('Something went wrong while analyzing this location.');
                if (isComparisonMode) {
                    setAnalysis({
                        summary: 'Error loading comparison. Please try again.',
                        categories: {}
                    });
                } else {
                    setAnalysis({
                        summary: 'Error loading analysis. Please try again.',
                        score: 0,
                        needsCount: 0,
                        risksCount: 0
                    });
                }
            } finally {
                setLoading(false);
            }
        };

        if (latitude && longitude && (selectedCategories || allCategories)) {
            fetchData();
        }
    }, [latitude, longitude, selectedCategories, allCategories, isComparisonMode, radius]);

    // Guard AFTER all hooks
    if (!latitude || !longitude || (!selectedCategories && !allCategories)) {
        return null;
    }

    const handleStartOver = () => {
        navigate('/');
    };

    const getComparisonPlacesList = (catId) => {
        if (!comparisonData || !comparisonData[catId]) return { needs: [], risks: [] };
        return comparisonData[catId];
    };

    const getAllComparisonPlacesList = () => {
        if (!comparisonData) return { needs: [], risks: [] };
        const uniqueNeeds = new Map();
        const uniqueRisks = new Map();
        Object.keys(comparisonData).forEach(catId => {
            const cat = comparisonData[catId];
            cat.needs?.forEach(p => uniqueNeeds.set(`${p.name}-${p.type}`, p));
            cat.risks?.forEach(p => uniqueRisks.set(`${p.name}-${p.type}`, p));
        });
        return {
            needs: Array.from(uniqueNeeds.values()),
            risks: Array.from(uniqueRisks.values())
        };
    };

    const activePlaces = isComparisonMode
        ? (activeCompareCategory === 'all' ? getAllComparisonPlacesList() : getComparisonPlacesList(activeCompareCategory))
        : nearbyPlaces;

    const allPlaces = [...(activePlaces?.needs || []), ...(activePlaces?.risks || [])];
    const position = [parseFloat(latitude), parseFloat(longitude)];

    return (
        <div className="results-page">
            {/* Background Animation Decorations */}
            <div className="bg-decorations">
                <div className="decor-circle circle-1"></div>
                <div className="decor-circle circle-2"></div>
                <div className="decor-circle circle-3"></div>
            </div>

            <div className="container">
                {/* Header */}
                <div className="results-header">
                    <h1 className="page-title">Location Analysis Results</h1>
                    <div className="location-info">
                        <span className="location-badge">📍 {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}</span>
                        <span className="location-badge">📏 Radius: {radius / 1000} km</span>
                        <span className="category-badge">
                            {isComparisonMode ? 'ComParison Mode' : selectedCategories.map(c => c.name).join(', ')}
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="skeleton-container">
                        <div className="skeleton-card">
                            <div className="skeleton-header">
                                <div className="skeleton-line skeleton-title"></div>
                                <div className="skeleton-circle"></div>
                            </div>
                            <div className="skeleton-line skeleton-text"></div>
                            <div className="skeleton-line skeleton-text short"></div>
                            <div className="skeleton-stats">
                                <div className="skeleton-stat"></div>
                                <div className="skeleton-stat"></div>
                            </div>
                        </div>
                        <div className="skeleton-grid">
                            <div className="skeleton-map-block"></div>
                            <div className="skeleton-list-block">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="skeleton-item"></div>
                                ))}
                            </div>
                        </div>
                        <p className="loading-text">
                            <span className="loading-dot">●</span>
                            <span className="loading-dot">●</span>
                            <span className="loading-dot">●</span>
                            Analyzing location and nearby amenities
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Error Banner */}
                        {error && (
                            <div className="error-banner fade-in">
                                <span className="error-icon">⚠️</span>
                                <p>{error}</p>
                                <button className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>
                                    Retry
                                </button>
                            </div>
                        )}

                        {isComparisonMode ? (
                            <>
                                {/* Comparison Summary Card */}
                                <div className="glass-card summary-card animate-in">
                                    <div className="summary-header">
                                        <h2>AI Suitability Comparison Overview</h2>
                                        <div className="score-badge comparison-badge" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                                            <span className="score-number" style={{ fontSize: '1.2rem' }}>📊</span>
                                        </div>
                                    </div>
                                    <p className="summary-text">{analysis?.summary || 'No comparison analysis available.'}</p>
                                </div>

                                {/* Comparison Table Section */}
                                <div className="glass-card comparison-table-card animate-in delay-1">
                                    <h3 className="section-title">Suitability Comparison Table</h3>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', marginTop: '-0.5rem', fontSize: '0.95rem' }}>
                                        Compare location compatibility across various categories. Click any category row to view detailed lists of nearby facilities & warnings.
                                    </p>
                                    <div className="table-responsive">
                                        <table className="comparison-table">
                                            <thead>
                                                <tr>
                                                    <th>Lifestyle Category</th>
                                                    <th>Suitability Score</th>
                                                    <th>Needs Met</th>
                                                    <th>Risks Found</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {allCategories?.map((cat) => {
                                                    const catAnalysis = analysis?.categories?.[cat.id] || {};
                                                    const score = catAnalysis.score ?? 0;
                                                    const needsCount = catAnalysis.needsCount ?? 0;
                                                    const risksCount = catAnalysis.risksCount ?? 0;
                                                    const rec = catAnalysis.recommendation || '';
                                                    const isExpanded = expandedCategory === cat.id;

                                                    return (
                                                        <React.Fragment key={cat.id}>
                                                            <tr 
                                                                className={`comparison-row ${isExpanded ? 'active' : ''}`}
                                                                onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                                                            >
                                                                <td>
                                                                    <div className="category-cell">
                                                                        <span className="category-cell-icon">{cat.icon}</span>
                                                                        <span className="category-cell-name">{cat.name}</span>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                        <div className={`score-badge-sm ${score >= 70 ? 'good' : score >= 40 ? 'ok' : 'bad'}`}>
                                                                            <AnimatedScoreValue score={score} />%
                                                                        </div>
                                                                        <div className="score-bar-track">
                                                                            <div 
                                                                                className={`score-bar-fill ${score >= 70 ? 'good' : score >= 40 ? 'ok' : 'bad'}`}
                                                                                style={{ width: `${score}%` }}
                                                                            ></div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="stat-cell needs-cell">
                                                                    <span className="count-pill green">{needsCount} met</span>
                                                                </td>
                                                                <td className="stat-cell risks-cell">
                                                                    <span className="count-pill red">{risksCount} found</span>
                                                                </td>
                                                                <td>
                                                                    <span className="btn-table-action">
                                                                        {isExpanded ? 'Hide Details ▲' : 'View Details ▼'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                            {isExpanded && (
                                                                <tr className="expansion-row">
                                                                    <td colSpan="5">
                                                                        <div className="expanded-details-container fade-in">
                                                                            <div className="recommendation-box">
                                                                                <strong>💡 Recommendation:</strong> {rec}
                                                                            </div>
                                                                            <div className="details-columns-grid">
                                                                                <div className="details-column">
                                                                                    <h5 className="details-column-title">✅ Amenities Near Location ({needsCount})</h5>
                                                                                    {comparisonData?.[cat.id]?.needs.length > 0 ? (
                                                                                        <div className="details-items-list">
                                                                                            {comparisonData[cat.id].needs.map((p, idx) => (
                                                                                                <div key={idx} className="details-subitem need">
                                                                                                    <span className="subitem-name">{p.name}</span>
                                                                                                    <span className="subitem-dist">{p.distance} km</span>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <p className="no-subitems-text">No matching amenities found.</p>
                                                                                    )}
                                                                                </div>
                                                                                <div className="details-column">
                                                                                    <h5 className="details-column-title">⚠️ Warnings & Risks ({risksCount})</h5>
                                                                                    {comparisonData?.[cat.id]?.risks.length > 0 ? (
                                                                                        <div className="details-items-list">
                                                                                            {comparisonData[cat.id].risks.map((p, idx) => (
                                                                                                <div key={idx} className="details-subitem risk">
                                                                                                    <span className="subitem-name">{p.name}</span>
                                                                                                    <span className="subitem-dist">{p.distance} km</span>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <p className="no-subitems-text">No matching risk factors identified.</p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Interactive Map Section */}
                                <div className="glass-card comparison-map-card animate-in delay-2">
                                    <h3 className="section-title">Comparison Map Visualization</h3>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.2rem', marginTop: '-0.5rem', fontSize: '0.95rem' }}>
                                        Filter pins on the map to visualize amenities and risks corresponding to each category profile.
                                    </p>
                                    
                                    <div className="map-view-filter-tabs">
                                        <button 
                                            className={`tab-btn ${activeCompareCategory === 'all' ? 'active' : ''}`}
                                            onClick={() => setActiveCompareCategory('all')}
                                        >
                                            🌐 All Pins
                                        </button>
                                        {allCategories?.map(cat => (
                                            <button 
                                                key={cat.id}
                                                className={`tab-btn ${activeCompareCategory === cat.id ? 'active' : ''}`}
                                                onClick={() => setActiveCompareCategory(cat.id)}
                                            >
                                                {cat.icon} {cat.name}
                                            </button>
                                        ))}
                                    </div>

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

                                            {/* Search radius ring */}
                                            <Circle
                                                center={position}
                                                radius={radius}
                                                pathOptions={{
                                                    color: '#667eea',
                                                    fillColor: '#667eea',
                                                    fillOpacity: 0.06,
                                                    weight: 2,
                                                    dashArray: '8, 6'
                                                }}
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
                                                    key={`${place.name}-${idx}`}
                                                    position={[place.lat || position[0], place.lng || position[1]]}
                                                    icon={place.category === 'need' ? greenIcon : redIcon}
                                                >
                                                    <Popup>
                                                        <strong>{place.name}</strong>
                                                        <br />
                                                        Distance: {place.distance} km
                                                        <br />
                                                        Type: {place.type?.replace(/_/g, ' ')}
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
                                        <div className="legend-item">
                                            <span className="legend-dot radius-dot"></span>
                                            <span>{radius / 1000} km Radius</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Summary Card */}
                                <div className="glass-card summary-card animate-in">
                                    <div className="summary-header">
                                        <h2>AI-Powered Suitability Analysis</h2>
                                        <div className={`score-badge ${(analysis?.score || 0) >= 70 ? 'score-good' : (analysis?.score || 0) >= 40 ? 'score-ok' : 'score-bad'}`}>
                                            <span className="score-number">{animatedScore}</span>
                                            <span className="score-percent">%</span>
                                        </div>
                                    </div>
                                    <p className="summary-text">{analysis?.summary || 'No analysis available.'}</p>
                                    <div className="summary-stats">
                                        <div className="stat">
                                            <span className="stat-value">{analysis?.needsCount ?? 0}</span>
                                            <span className="stat-label">Amenities Found</span>
                                        </div>
                                        <div className="stat">
                                            <span className="stat-value">{analysis?.risksCount ?? 0}</span>
                                            <span className="stat-label">Risk Factors</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Content Grid */}
                                <div className="results-grid">
                                    {/* Map Section */}
                                    <div className="map-container animate-in delay-1">
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

                                                {/* Search radius ring */}
                                                <Circle
                                                    center={position}
                                                    radius={radius}
                                                    pathOptions={{
                                                        color: '#667eea',
                                                        fillColor: '#667eea',
                                                        fillOpacity: 0.06,
                                                        weight: 2,
                                                        dashArray: '8, 6'
                                                    }}
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
                                            <div className="legend-item">
                                                <span className="legend-dot radius-dot"></span>
                                                <span>{radius / 1000} km Radius</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Places List */}
                                    <div className="places-list animate-in delay-2">
                                        {/* Needs */}
                                        {nearbyPlaces.needs.length > 0 && (
                                            <div className="places-section">
                                                <h3 className="section-title">✅ Nearby Amenities</h3>
                                                <div className="places-items">
                                                    {nearbyPlaces.needs.map((place, idx) => (
                                                        <div key={idx} className="place-item need-item" style={{ animationDelay: `${idx * 0.08}s` }}>
                                                            <div className="place-info">
                                                                <h4 className="place-name">{place.name}</h4>
                                                                <p className="place-type">{place.type.replace(/_/g, ' ')}</p>
                                                            </div>
                                                            <div className={`place-distance ${getDistanceColor(place.distance)}`}>
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
                                                        <div key={idx} className="place-item risk-item" style={{ animationDelay: `${idx * 0.08}s` }}>
                                                            <div className="place-info">
                                                                <h4 className="place-name">{place.name}</h4>
                                                                <p className="place-type">{place.type.replace(/_/g, ' ')}</p>
                                                            </div>
                                                            <div className={`place-distance ${getDistanceColor(place.distance)}`}>
                                                                {place.distance} km
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {nearbyPlaces.needs.length === 0 && nearbyPlaces.risks.length === 0 && (
                                            <div className="empty-state">
                                                <div className="empty-icon">🔍</div>
                                                <h3>No Results Found</h3>
                                                <p>We couldn't find amenities or risk factors in this area. This might be a remote location with limited mapped data.</p>
                                                <button className="btn btn-secondary" onClick={handleStartOver}>
                                                    Try Another Location
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Custom Category Notice */}
                        {customCategory && (
                            <div className="glass-card custom-notice animate-in delay-3">
                                <h3>📧 Custom Category Submitted</h3>
                                <p>Your custom category "{customCategory}" has been sent to our admin team for review. We'll add it to our analysis soon!</p>
                            </div>
                        )}

                        {/* Action Button */}
                        <div className="action-section animate-in delay-3">
                            <button className="btn btn-primary btn-glow" onClick={handleStartOver}>
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
