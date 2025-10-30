import { useState, useContext } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FaFileAlt, FaTrash, FaBars, FaChartPie, FaUsers } from "react-icons/fa";
import { AiOutlineFileDone } from "react-icons/ai";
import { RTOContext } from "../../Context/RTOContext";
import './Sidebar.css';

const Sidebar = () => {
    const location = useLocation();
    const { user } = useContext(RTOContext);
    const role = user?.role || "user";

    const [isOpen, setIsOpen] = useState(false); 

    const menuItems = [];

    if (role === "superadmin") {
      menuItems.push(
        { name: "Overview", path: "/overview", icon: <FaChartPie /> },
      );
    }

    menuItems.push(
      { name: "RTO Form", path: "/rto-form", icon: <FaFileAlt /> },
      { name: "Submitted RTOs", path: "/submitted-rto", icon: <AiOutlineFileDone /> }
    );

    if (role === "superadmin") {
      menuItems.push(
        { name: "Deleted RTOs", path: "/deleted-rto", icon: <FaTrash /> }
      );
    }

    if (role === "superadmin") {
      menuItems.push(
        { name: "All Users", path: "/all-users", icon: <FaUsers /> }
      );
    }


  return (
    <div className={`sidebar ${isOpen ? "open" : "closed"} active-sidebar`}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
    >
      <button className="toggle-btn" onClick={() => setIsOpen(!isOpen)}>
        <FaBars />
      </button>
      <nav className="sidebar-menu">
        {menuItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={`menu-item ${location.pathname.startsWith(item.path) ? "active" : ""}`}
          >
            <div className="icon">{item.icon}</div>
            {isOpen && <span className="text">{item.name}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;

