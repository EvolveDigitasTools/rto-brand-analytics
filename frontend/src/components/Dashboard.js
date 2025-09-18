import React, { useState, useContext } from 'react';
import { TextField, Button, Alert, CircularProgress, Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../App';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/auth';

function LoginForm({ onSwitchToRegister }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setIsAuthenticated, setUserRole } = useContext(AuthContext);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_URL}/login`, {
        email: formData.email,
        password: formData.password,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Login failed');
      }

      localStorage.setItem('token', response.data.token);
      setSuccess('Login successful! Token stored.');
      setIsAuthenticated(true);
      setUserRole(response.data.user.role || 'user');
      setFormData({ email: '', password: '' });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ width: '100%', maxWidth: 400, bgcolor: 'white', p: 4, borderRadius: 2, boxShadow: 3 }}
    >
      <Typography variant="h5" align="center" gutterBottom>
        Login
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <TextField
        fullWidth
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        required
        margin="normal"
        variant="outlined"
      />
      <TextField
        fullWidth
        label="Password"
        name="password"
        type="password"
        value={formData.password}
        onChange={handleChange}
        required
        margin="normal"
        variant="outlined"
      />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        color="primary"
        disabled={loading}
        sx={{ mt: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Login'}
      </Button>
      <Typography align="center" sx={{ mt: 2 }}>
        Don't have an account?{' '}
        <Button onClick={onSwitchToRegister} color="primary">
          Register
        </Button>
      </Typography>
    </Box>
  );
}

export default LoginForm;