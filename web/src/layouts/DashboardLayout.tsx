import { Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] text-gray-800 font-sans">
      <Outlet />
    </div>
  );
}
