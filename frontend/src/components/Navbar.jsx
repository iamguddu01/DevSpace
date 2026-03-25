import React, { useContext } from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getToken, removeToken } from '../utils/auth';
import { ThemeContext } from '../context/ThemeContext';

function NavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = getToken();
  const { theme, toggleTheme } = useContext(ThemeContext);

  // Hide the Navbar completely on login and register pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  const handleLogout = () => {
    removeToken();
    navigate('/login');
  };

  return (
    <Navbar bg={theme === 'dark' ? 'dark' : 'white'} variant={theme} expand="lg" sticky="top" className="shadow-sm py-3 custom-navbar">
      <Container fluid className="px-4">
        <Navbar.Brand as={Link} to="/" className="fw-bold fs-4 text-primary d-flex align-items-center">
          <span className="bg-primary text-white p-1 rounded me-2 px-2">D</span>
          DevSpace
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            
            {/* Always visible (if we had a public landing page), but in our app, 
                everything is protected anyway except login/register */}
            <Nav.Link as={Link} to="/" className="px-3 fw-semibold nav-hover">Home</Nav.Link>
            
            {/* Protected Links - Only show if user is logged in */}
            {token && (
              <>
                <Nav.Link as={Link} to="/messages" className="px-3 fw-semibold nav-hover">Messages</Nav.Link>
                <Nav.Link as={Link} to="/notifications" className="px-3 fw-semibold nav-hover">Notifications</Nav.Link>
                <Nav.Link as={Link} to="/create" className="px-3 fw-semibold nav-hover">Create</Nav.Link>
                <Nav.Link as={Link} to="/profile/me" className="px-3 fw-semibold nav-hover">Profile</Nav.Link>
                
                <Button 
                  variant={theme === 'dark' ? 'outline-light' : 'outline-dark'}
                  size="sm" 
                  className="ms-2 ms-lg-4 px-3 rounded-pill fw-bold"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            )}

            {/* If somehow the user is on a public page and not logged in (fallback) */}
            {!token && (
              <Button 
                as={Link} 
                to="/login"
                variant="primary" 
                size="sm" 
                className="ms-2 ms-lg-4 px-4 rounded-pill fw-bold"
              >
                Sign In
              </Button>
            )}

            {/* Theme Toggle Button - Always visible on the navbar */}
            <Button
              variant={theme === 'dark' ? 'outline-light' : 'outline-dark'}
              size="sm"
              className="ms-3 rounded-circle d-flex align-items-center justify-content-center p-0 pt-1 border-0"
              style={{ width: '36px', height: '36px' }}
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? '🌞' : '🌙'}
            </Button>

          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavigationBar;
