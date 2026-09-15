import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Chat from './pages/Chat';
import KnowledgeBase from './pages/KnowledgeBase';
import SystemStatus from './pages/SystemStatus';
import Evaluation from './pages/Evaluation';
import { ensureDemoLogin } from './services/api';

function App() {
  // Establish a demo session up front: /query and /documents require authentication.
  useEffect(() => {
    void ensureDemoLogin();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/evaluation" element={<Evaluation />} />
          <Route path="/knowledge" element={<KnowledgeBase />} />
          <Route path="/status" element={<SystemStatus />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
