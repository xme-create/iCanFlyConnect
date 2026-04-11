import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import RequestHelp from './pages/RequestHelp';
import VolunteerLogin from './pages/VolunteerLogin';
import VolunteerDashboard from './pages/VolunteerDashboard';
import Session from './pages/Session';
import History from './pages/History';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Navbar />
          <Routes>
            <Route path="/"          element={<Home />} />
            <Route path="/request"   element={<RequestHelp />} />
            <Route path="/volunteer" element={<VolunteerLogin />} />
            <Route path="/dashboard" element={<VolunteerDashboard />} />
            <Route path="/session/:sessionId" element={<Session />} />
            <Route path="/history"   element={<History />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
