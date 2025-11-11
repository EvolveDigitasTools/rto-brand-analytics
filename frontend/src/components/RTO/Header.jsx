import { useContext } from "react";
import { RTOContext } from "../../Context/RTOContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import React, { useState } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Container,
  Button,
  Tooltip,
  Menu,
  MenuItem,
} from '@mui/material';
import AddIcon from "@mui/icons-material/Add";
import FlakyIcon from '@mui/icons-material/Flaky';
import MenuIcon from "@mui/icons-material/Menu";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

const pages = ['Home', 'RTO Form', 'Submitted RTOs'];

function Header() {
  const { user, logout } = useContext(RTOContext);
  const navigate = useNavigate();
  const location = useLocation(); // <-- Get current path
  // const { submittedRTOs } = useContext(RTOContext);
  const [anchorElNav, setAnchorElNav] = useState(null);
  const [anchorElUser, setAnchorElUser] = useState(null);

  const settings = [
    user?.email ||'Profile', 
    'Account', 
    'Dashboard', 
    'Logout'
  ];

  const handleLogout = () => {
    logout();
    handleCloseUserMenu();
    navigate('/');
  };

  const handleOpenNavMenu = (event) => setAnchorElNav(event.currentTarget);
  const handleOpenUserMenu = (event) => setAnchorElUser(event.currentTarget);
  const handleCloseNavMenu = () => setAnchorElNav(null);
  const handleCloseUserMenu = () => setAnchorElUser(null);

  // Determine button text & navigation based on current page
  const isSubmittedPage = location.pathname === "/submitted-rto";
  const buttonText = isSubmittedPage ? "Back to Submission" : "Check Submitted RTO";
  const buttonClick = () => {
    if (isSubmittedPage) navigate("/rto-form");
    else navigate("/submitted-rto");
  };

  const userName = user ? user.name || 'User' : 'Guest';

  return (
    <AppBar position="static" style={{ background: "#424141" }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Logo */}
          <Typography
            variant="h6"
            noWrap
            component={Link}
            to="/"
            sx={{
              width: "20%",
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.3rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            <img 
              src="images/plugin-logo.png" 
              alt="plugin-logo" 
              style={{ width: "100px", height: "50px" }} 
            />
          </Typography>

          {/* Centered Title */}
          <Box
            sx={{
              flexGrow: 1,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{
                fontFamily: 'Open Sans',
                fontWeight: 400,
                color: 'inherit',
              }}
            >
              Hello {userName}
            </Typography> */}
            <Typography
              variant="h5"
              noWrap
              component="div"
              sx={{
                fontFamily: 'Open Sans',
                fontWeight: 700,
                color: 'inherit',
              }}
            >
              RTO System
            </Typography>
          </Box>

          {/* Mobile Check Button */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<FlakyIcon />}
              onClick={buttonClick}
              sx={{ textTransform: "none", fontWeight: "bold", borderRadius: "12px", boxShadow: 2 }}
            >
              {buttonText}
            </Button>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Tooltip title="Profile">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  <AccountCircleIcon style={{ color: "white", width: 40, height: 35 }} />
                </IconButton>
              </Tooltip>
              {user && (
                <Typography
                  variant="caption"
                  sx={{ color: "white", textAlign: "center", mt: 0.5 }}
                >
                  {userName}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Navigation Menu for Mobile */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              keepMounted
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{ display: { xs: 'block', md: 'none' } }}
            >
              {pages.map((page) => (
                <MenuItem 
                  key={page} 
                  onClick={() => {
                    handleCloseNavMenu();

                    // Navigate based on page name
                    if (page === "Home") navigate("/");
                    else if (page === "RTO Form") navigate("/rto-form");
                    else if (page === "Submitted RTOs") navigate("/submitted-rto");
                  }}
                >
                  <Typography sx={{ textAlign: 'center' }}>{page}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* Desktop Buttons */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
            <Button
              style={{ background: "#ffffff", color: "#424141" }}
              variant="contained"
              color="primary"
              startIcon={<FlakyIcon />}
              onClick={buttonClick}
              sx={{ textTransform: "none", fontWeight: "bold", borderRadius: "12px", boxShadow: 2 }}
            >
              {buttonText}
            </Button>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Tooltip title="Profile">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  <AccountCircleIcon style={{ color: "white", width: 40, height: 35 }} />
                </IconButton>
              </Tooltip>
              {user && (
                <Typography
                  variant="caption"
                  sx={{ color: "white", textAlign: "center", mt: 0.5 }}
                >
                  {userName}
                </Typography>
              )}
            </Box>

            <Menu
              sx={{ mt: '45px' }}
              id="menu-appbar-user"
              anchorEl={anchorElUser}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              keepMounted
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              <MenuItem onClick={handleCloseUserMenu}>
                <Typography sx={{ textAlign: 'center' }}>Account</Typography>
              </MenuItem>
              <MenuItem onClick={handleCloseUserMenu}>
                <Typography sx={{ textAlign: 'center' }}>Dashboard</Typography>
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <Typography sx={{ textAlign: 'center' }}>Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Header;