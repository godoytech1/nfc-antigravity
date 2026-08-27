import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardLogin from './pages/dashboard/DashboardLogin';
import TeacherPanel from './pages/dashboard/TeacherPanel';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardLogin />} />
          <Route path="profesor" element={<TeacherPanel />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
