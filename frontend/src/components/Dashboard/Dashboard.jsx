import React, { useState, useContext } from "react";
import { Box, Drawer, List, ListItem, ListItemButton, ListItemText, Typography } from "@mui/material";

// Pages
import RTOForm from "../RTO/RTOForm";
import SubmittedRTOsPage from "../RTO/SubmittedRTOsPage";
import DeletedRTOsPage from "../RTO/DeletedRTOsPage";
import { RTOContext } from "../../Context/RTOContext";

const drawerWidth = 200;

const Dashboard = () => {
  const { userRole } = useContext(RTOContext); // user role from context
  const [activePage, setActivePage] = useState("rtoForm");

  const renderActivePage = () => {
    switch (activePage) {
      case "rtoForm":
        return <RTOForm />;
      case "submittedRTOs":
        return <SubmittedRTOsPage />;
      case "deletedRTOs":
        return (userRole === "admin" || userRole === "superadmin") ? <DeletedRTOsPage /> : <Typography variant="h6">Access Denied</Typography>;
      default:
        return <RTOForm />;
    }
  };

  const drawer = (
    <div>
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => setActivePage("rtoForm")}>
            <ListItemText primary="RTO Form" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => setActivePage("submittedRTOs")}>
            <ListItemText primary="Submitted RTOs" />
          </ListItemButton>
        </ListItem>
        {(userRole === "admin" || userRole === "superadmin") && (
          <ListItem disablePadding>
            <ListItemButton onClick={() => setActivePage("deletedRTOs")}>
              <ListItemText primary="Deleted RTOs" />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: "flex" }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box", top: 64 }, // clipped under AppBar (assuming AppBar height = 64px)
        }}
        open
      >
        {drawer}
      </Drawer>

      {/* Main content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, ml: `${drawerWidth}px`, mt: '64px' }}>
        {renderActivePage()}
      </Box>
    </Box>
  );
};

export default Dashboard;
