import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "../RTO/Header";
import Sidebar from "../Sidebar/Sidebar";
import './DashboardLayout.css';

const DashboardLayout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <div className="dashboard-wrapper">
      <Header />
      <div className="dashboard-body">
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <main className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
