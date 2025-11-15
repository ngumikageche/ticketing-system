import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import KnowledgeBase from './pages/KnowledgeBase';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/knowledge-base" element={<KnowledgeBase />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/users" element={<Users />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
