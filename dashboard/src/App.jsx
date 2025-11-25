import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import KnowledgeBase from './pages/KnowledgeBase';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Testing from './pages/Testing';
import Notifications from './pages/Notifications';
import Chat from './components/Chat';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext.jsx';

function ThemedToaster() {
  const { settings } = useSettings();
  const theme = settings.theme === 'dark' ? 'dark' : 'light';
  return <Toaster position="top-center" theme={theme} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <WebSocketProvider>
            <SettingsProvider>
              <ThemedToaster />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route element={<Layout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/tickets" element={<Tickets />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/knowledge-base" element={<KnowledgeBase />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/testing" element={<Testing />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Routes>
            </SettingsProvider>
          </WebSocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
