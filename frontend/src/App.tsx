import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AuthGate from './components/AuthGate';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Documents = lazy(() => import('./pages/Documents'));
const Chat = lazy(() => import('./pages/Chat'));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'));
const SystemStatus = lazy(() => import('./pages/SystemStatus'));
const Evaluation = lazy(() => import('./pages/Evaluation'));
const AuditLog = lazy(() => import('./pages/AuditLog'));

function App() {
  return (
    <AuthGate>
      <BrowserRouter>
        <Suspense fallback={<div role="status" className="p-6 text-on-surface-variant">Loading page…</div>}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/evaluation" element={<Evaluation />} />
              <Route path="/audit" element={<AuditLog />} />
              <Route path="/knowledge" element={<KnowledgeBase />} />
              <Route path="/status" element={<SystemStatus />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthGate>
  );
}

export default App;
