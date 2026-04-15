import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAllCategories } from '../data/categoryData';
import { sendCustomCategoryRequest } from '../services/emailService';
import './CategorySelection.css';

function CategorySelection() {
    const navigate = useNavigate();
    const location = useLocation();
    const { latitude, longitude } = location.state || {};

    const [selectedCategories, setSelectedCategories] = useState([]);
    const [showOtherInput, setShowOtherInput] = useState(false);
    const [otherCategoryText, setOtherCategoryText] = useState('');

    const categories = getAllCategories();

    // Redirect if no location data
    useEffect(() => {
        if (!latitude || !longitude) {
            navigate('/');
        }
    }, [latitude, longitude, navigate]);

    if (!latitude || !longitude) {
        return null; // Return null while redirecting
    }

    const handleCategoryToggle = (categoryId) => {
        if (selectedCategories.includes(categoryId)) {
            setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
        } else {
            setSelectedCategories([...selectedCategories, categoryId]);
        }
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

        // If "Other" is selected, send request to admin
        if (showOtherInput && otherCategoryText.trim()) {
            try {
                await sendCustomCategoryRequest(otherCategoryText, { latitude, longitude });
            } catch (error) {
                console.error('Failed to send custom category request:', error);
            }
        }

        // Navigate to results
        navigate('/results', {
            state: {
                latitude,
                longitude,
                selectedCategories: selectedCategories.map(id =>
                    categories.find(c => c.id === id)
                ),
                customCategory: showOtherInput ? otherCategoryText : null
            }
        });
    };

    const handleBack = () => {
        navigate('/', {
            state: { latitude, longitude }
        });
    };

    return (
        <div className="category-page">
            <div className="container">
                {/* Header */}
                <div className="page-header">
                    <h1 className="page-title">Select Your Lifestyle Category</h1>
                    <p className="page-subtitle">
                        Choose one or more categories that match your needs. We'll analyze the location based on your selection.
                    </p>
                    <div className="location-badge">
                        📍 Location: {latitude}, {longitude}
                    </div>
                </div>

                {/* Category Grid */}
                <div className="category-grid">
                    {categories.map((category) => (
                        <div
                            key={category.id}
                            className={`category-card ${selectedCategories.includes(category.id) ? 'selected' : ''}`}
                            onClick={() => handleCategoryToggle(category.id)}
                        >
                            <div className="category-icon">{category.icon}</div>
                            <h3 className="category-name">{category.name}</h3>

                            <div className="category-details">
                                <div className="needs-section">
                                    <h4>✅ Needs</h4>
                                    <ul>
                                        {category.needs.slice(0, 3).map((need, idx) => (
                                            <li key={idx}>{need.name}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="risks-section">
                                    <h4>⚠️ Risks</h4>
                                    <ul>
                                        {category.risks.slice(0, 2).map((risk, idx) => (
                                            <li key={idx}>{risk.name}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="checkbox-indicator">
                                {selectedCategories.includes(category.id) && '✓'}
                            </div>
                        </div>
                    ))}

                    {/* Other Category */}
                    <div
                        className={`category-card other-card ${showOtherInput ? 'selected' : ''}`}
                        onClick={handleOtherToggle}
                    >
                        <div className="category-icon">🔧</div>
                        <h3 className="category-name">Other</h3>
                        <p className="category-description">
                            Define your own custom category
                        </p>
                        <div className="checkbox-indicator">
                            {showOtherInput && '✓'}
                        </div>
                    </div>
                </div>

                {/* Other Category Input */}
                {showOtherInput && (
                    <div className="glass-card other-input-section">
                        <h3>Describe Your Custom Category</h3>
                        <p className="input-hint">
                            Tell us about your specific needs and we'll send it to our admin for review.
                        </p>
                        <textarea
                            className="other-textarea"
                            placeholder="E.g., 'Remote workers needing co-working spaces, cafes with good wifi, and quiet neighborhoods...'"
                            value={otherCategoryText}
                            onChange={(e) => setOtherCategoryText(e.target.value)}
                            rows={4}
                        />
                    </div>
                )}

                {/* Action Buttons */}
                <div className="action-buttons">
                    <button className="btn btn-secondary" onClick={handleBack}>
                        ← Back
                    </button>
                    <button className="btn btn-primary" onClick={handleAnalyze}>
                        Analyze Location
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CategorySelection;
