import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAllCategories, allPossibleNeeds, allPossibleRisks } from '../data/categoryData';
import { sendCustomCategoryRequest } from '../services/emailService';
import './CategorySelection.css';

function CategorySelection() {
    const navigate = useNavigate();
    const location = useLocation();
    const { latitude, longitude, locations, isMultiLocationMode, locationName } = location.state || {};

    const [selectedCategories, setSelectedCategories] = useState([]);
    const [radius, setRadius] = useState(4000);
    const [categoryConfigs, setCategoryConfigs] = useState({});
    const [showOtherInput, setShowOtherInput] = useState(false);
    const [otherCategoryText, setOtherCategoryText] = useState('');

    const categories = getAllCategories();

    // Redirect if no location data
    useEffect(() => {
        const hasSingleLocation = latitude && longitude;
        const hasMultiLocations = locations && locations.length >= 2;
        if (!hasSingleLocation && !hasMultiLocations) {
            navigate('/');
        }
    }, [latitude, longitude, locations, navigate]);

    // Initialize category configs when categories are loaded or selected
    useEffect(() => {
        const newConfigs = { ...categoryConfigs };
        categories.forEach(cat => {
            if (!newConfigs[cat.id]) {
                newConfigs[cat.id] = {
                    needs: [...cat.defaultNeeds],
                    risks: [...cat.defaultRisks]
                };
            }
        });
        setCategoryConfigs(newConfigs);
    }, []);

    const hasSingleLocation = latitude && longitude;
    const hasMultiLocations = locations && locations.length >= 2;

    if (!hasSingleLocation && !hasMultiLocations) {
        return null;
    }

    const handleCategoryToggle = (categoryId) => {
        if (selectedCategories.includes(categoryId)) {
            setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
        } else {
            setSelectedCategories([...selectedCategories, categoryId]);
        }
    };

    const handleNeedToggle = (categoryId, needType) => {
        const currentNeeds = categoryConfigs[categoryId].needs;
        let newNeeds;
        if (currentNeeds.includes(needType)) {
            newNeeds = currentNeeds.filter(n => n !== needType);
        } else {
            newNeeds = [...currentNeeds, needType];
        }
        setCategoryConfigs({
            ...categoryConfigs,
            [categoryId]: { ...categoryConfigs[categoryId], needs: newNeeds }
        });
    };

    const handleRiskToggle = (categoryId, riskType) => {
        const currentRisks = categoryConfigs[categoryId].risks;
        let newRisks;
        if (currentRisks.includes(riskType)) {
            newRisks = currentRisks.filter(r => r !== riskType);
        } else {
            newRisks = [...currentRisks, riskType];
        }
        setCategoryConfigs({
            ...categoryConfigs,
            [categoryId]: { ...categoryConfigs[categoryId], risks: newRisks }
        });
    };

    const handleOtherToggle = () => {
        setShowOtherInput(!showOtherInput);
    };

    const handleAnalyze = async () => {
        if (selectedCategories.length === 0 && !showOtherInput) {
            alert('Please select at least one category');
            return;
        }

        if (showOtherInput && !otherCategoryText.trim()) {
            alert('Please describe your custom category or uncheck "Other"');
            return;
        }

        if (selectedCategories.includes('comparison')) {
            const comparisonConfig = categoryConfigs['comparison'];
            if (!comparisonConfig || (comparisonConfig.needs.length === 0 && comparisonConfig.risks.length === 0)) {
                alert('Please select at least one need or risk factor for the ComParison category.');
                return;
            }
        }

        const selectedConfigs = selectedCategories.map(id => {
            const cat = categories.find(c => c.id === id);
            const config = categoryConfigs[id];
            return {
                ...cat,
                needs: config.needs.map(type => allPossibleNeeds.find(n => n.type === type)),
                risks: config.risks.map(type => allPossibleRisks.find(r => r.type === type))
            };
        });

        const allCategoriesConfigs = categories.map(cat => {
            const config = categoryConfigs[cat.id] || { needs: cat.defaultNeeds, risks: cat.defaultRisks };
            return {
                ...cat,
                needs: config.needs.map(type => allPossibleNeeds.find(n => n.type === type)).filter(Boolean),
                risks: config.risks.map(type => allPossibleRisks.find(r => r.type === type)).filter(Boolean)
            };
        });

        // Navigate to results
        navigate('/results', {
            state: {
                latitude,
                longitude,
                locations,
                isMultiLocationMode,
                locationName,
                selectedCategories: selectedConfigs,
                allCategories: allCategoriesConfigs,
                isComparisonMode: selectedCategories.includes('comparison'),
                radius: radius,
                customCategory: showOtherInput ? otherCategoryText : null
            }
        });
    };

    const handleBack = () => {
        navigate('/', {
            state: { latitude, longitude }
        });
    };

    const totalSelected = selectedCategories.length + (showOtherInput ? 1 : 0);

    return (
        <div className="category-page">
            {/* Background Animation Decorations */}
            <div className="bg-decorations">
                <div className="decor-circle circle-1"></div>
                <div className="decor-circle circle-2"></div>
                <div className="decor-circle circle-3"></div>
            </div>

            <div className="container">
                {/* Header */}
                <div className="page-header animate-in">
                    <h1 className="page-title">Customize Your Analysis</h1>
                    <p className="page-subtitle">
                        Choose your lifestyle, set search radius, and refine your needs and risks.
                    </p>
                </div>

                {/* Radius and Stats Section */}
                <div className="glass-card settings-card animate-in delay-1">
                    <div className="settings-grid">
                        <div className="radius-control">
                            <div className="control-header">
                                <label className="input-label">Search Radius: <span className="highlight">{(radius / 1000).toFixed(1)} km</span></label>
                            </div>
                            <input 
                                type="range" 
                                min="1000" 
                                max="10000" 
                                step="500" 
                                value={radius} 
                                onChange={(e) => setRadius(parseInt(e.target.value))}
                                className="range-slider"
                            />
                            <div className="range-labels">
                                <span>1km</span>
                                <span>10km</span>
                            </div>
                        </div>
                        <div className="location-info-pills">
                            <div className="pill location-pill">📍 {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}</div>
                            {totalSelected > 0 && (
                                <div className="pill selection-pill">✨ {totalSelected} Selected</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Category Selection Area */}
                <div className="category-grid">
                    {categories.map((category, index) => {
                        const isSelected = selectedCategories.includes(category.id);
                        return (
                            <div key={category.id} className="category-wrapper">
                                <div
                                    className={`category-card ${isSelected ? 'selected' : ''}`}
                                    style={{ animationDelay: `${0.1 + index * 0.08}s` }}
                                >
                                    <div className="category-header-clickable" onClick={() => handleCategoryToggle(category.id)}>
                                        <div className="category-main-info">
                                            <div className="category-icon-wrapper">
                                                <span className="category-icon">{category.icon}</span>
                                                {category.id === 'couples' && (
                                                    <div className="couple-animation">
                                                        <svg viewBox="0 0 100 100" className="holding-hands-svg">
                                                            <path d="M30 60 L30 40 A10 10 0 1 1 50 40 L50 60" stroke="#f093fb" strokeWidth="4" fill="none" />
                                                            <circle cx="40" cy="30" r="8" fill="#f093fb" />
                                                            <path d="M70 60 L70 40 A10 10 0 1 0 50 40 L50 60" stroke="#f5576c" strokeWidth="4" fill="none" />
                                                            <circle cx="60" cy="30" r="8" fill="#f5576c" />
                                                            <path className="hand-line" d="M45 50 Q50 60 55 50" stroke="white" strokeWidth="2" fill="none" />
                                                        </svg>
                                                        <span className="hand-heart">💖</span>
                                                    </div>
                                                )}
                                                {category.id === 'schoolChildren' && (
                                                    <div className="school-animation">
                                                        <span className="bouncing-ball">⚽</span>
                                                    </div>
                                                )}
                                                {category.id === 'comparison' && (
                                                    <div className="comparison-animation">
                                                        <span className="compare-icon">📈</span>
                                                    </div>
                                                )}
                                                {category.id === 'oldAge' && (
                                                    <div className="oldage-animation">
                                                        <span className="walking-cane">🦯</span>
                                                    </div>
                                                )}
                                                {category.id === 'bachelors' && (
                                                    <div className="bachelor-animation">
                                                        <span className="gaming-icon">🎮</span>
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="category-name">{category.name}</h3>
                                        </div>

                                        <div className="checkbox-indicator">
                                            {isSelected ? (
                                                <div className="checked-circle">
                                                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                                        <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </div>
                                            ) : (
                                                <div className="empty-circle"></div>
                                            )}
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <div className="customization-area fade-in" onClick={(e) => e.stopPropagation()}>
                                            <div className="dropdown-section">
                                                <label>Your Needs</label>
                                                <div className="options-tags">
                                                    {allPossibleNeeds.map(need => (
                                                        <span 
                                                            key={need.type} 
                                                            className={`option-tag ${categoryConfigs[category.id]?.needs.includes(need.type) ? 'active' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleNeedToggle(category.id, need.type);
                                                            }}
                                                        >
                                                            {need.icon} {need.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="dropdown-section">
                                                <label>Risk Factors to Avoid</label>
                                                <div className="options-tags">
                                                    {allPossibleRisks.map(risk => (
                                                        <span 
                                                            key={risk.type} 
                                                            className={`option-tag risk ${categoryConfigs[category.id]?.risks.includes(risk.type) ? 'active' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRiskToggle(category.id, risk.type);
                                                            }}
                                                        >
                                                            {risk.icon} {risk.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                        );
                    })}

                    {/* Other Category */}
                    <div
                        className={`category-card other-card ${showOtherInput ? 'selected' : ''}`}
                        onClick={handleOtherToggle}
                        style={{ animationDelay: `${0.1 + categories.length * 0.08}s` }}
                    >
                        <div className="category-main-info">
                            <div className="category-icon-wrapper">
                                <span className="category-icon">✨</span>
                            </div>
                            <h3 className="category-name">Something Else</h3>
                        </div>
                        <p className="other-desc">Define Your Own Lifestyle</p>
                        <div className="checkbox-indicator">
                            {showOtherInput ? (
                                <div className="checked-circle">
                                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                        <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                            ) : (
                                <div className="empty-circle"></div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Other Input */}
                {showOtherInput && (
                    <div className="glass-card other-input-section fade-in">
                        <h3>Tell us about your needs</h3>
                        <textarea
                            className="other-textarea"
                            placeholder="E.g., 'Looking for a place near co-working spaces and high-speed internet...'"
                            value={otherCategoryText}
                            onChange={(e) => setOtherCategoryText(e.target.value)}
                            rows={3}
                        />
                    </div>
                )}

                {/* Bottom Actions */}
                <div className="action-buttons animate-in delay-2">
                    <button className="btn btn-secondary btn-outline" onClick={handleBack}>
                        ← Go Back
                    </button>
                    <button
                        className={`btn btn-primary ${totalSelected > 0 ? 'btn-glow' : 'disabled'}`}
                        onClick={handleAnalyze}
                        disabled={totalSelected === 0}
                    >
                        Analyze Location & Amenities →
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CategorySelection;

