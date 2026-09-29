import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CategorySelection from './pages/CategorySelection';
import Results from './pages/Results';
import FloatingParticles from './components/FloatingParticles';
import './App.css';

function App() {
  return (
    <Router>
      <FloatingParticles />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/categories" element={<CategorySelection />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </Router>
  );
}

export default App;
