import { Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-bg text-body">
      <Outlet />
    </div>
  );
}
