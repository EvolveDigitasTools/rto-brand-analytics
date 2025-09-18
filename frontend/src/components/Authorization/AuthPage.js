import React, { useContext } from 'react';
import { Container, Typography } from '@mui/material';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';

function AuthPage({ mode }) {
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  if (isAuthenticated && mode === 'login') {
    navigate('/rto', { replace: true });
  }

  const handleSwitchToRegister = () => navigate('/register');
  const handleSwitchToLogin = () => navigate('/login');

  return (
    <Container
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: '#f5f5f5',
      }}
    >
      <Typography variant="h3" align="center" gutterBottom>
        {mode === 'login' ? 'Login' : 'Register'}
      </Typography>
      {mode === 'login' ? (
        <LoginForm onSwitchToRegister={handleSwitchToRegister} />
      ) : (
        <RegisterForm onSwitchToLogin={handleSwitchToLogin} />
      )}
    </Container>
  );
}

export default AuthPage;