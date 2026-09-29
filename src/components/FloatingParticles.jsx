import React from 'react';
import './FloatingParticles.css';

const FloatingParticles = () => {
    // Generate 15 random particles
    const particles = Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        size: Math.random() * 4 + 2 + 'px',
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        duration: Math.random() * 20 + 10 + 's',
        delay: Math.random() * 10 + 's',
        opacity: Math.random() * 0.5 + 0.1
    }));

    return (
        <div className="particles-container">
            {particles.map(p => (
                <div 
                    key={p.id} 
                    className="particle" 
                    style={{
                        width: p.size,
                        height: p.size,
                        left: p.left,
                        top: p.top,
                        animationDuration: p.duration,
                        animationDelay: p.delay,
                        opacity: p.opacity
                    }}
                />
            ))}
        </div>
    );
};

export default FloatingParticles;
