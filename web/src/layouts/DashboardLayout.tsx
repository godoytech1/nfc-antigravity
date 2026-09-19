import { Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-paper text-ink font-sans">
      <Outlet />
    </div>
  );
}
