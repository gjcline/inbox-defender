import { Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Connect } from './pages/Connect';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/connect" element={<Connect />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}

export default App;
