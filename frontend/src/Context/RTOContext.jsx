import { createContext, useState, useEffect } from "react";
import axios from "axios";

export const RTOContext = createContext();

export const RTOProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      // Check for invalid values like "undefined" or empty strings
      if (!storedUser || storedUser === "undefined" || storedUser === "") {
        localStorage.removeItem("user"); // Clean up invalid data
        return null;
      }
      return JSON.parse(storedUser);
    } catch (err) {
      console.warn("Failed to parse user from localStorage:", err);
      localStorage.removeItem("user"); // Clean invalid value
      return null;
    }
  });

  const [submittedRTOs, setSubmittedRTOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSubmittedRTOs();
    }
  }, [isAuthenticated]);

  const login = async (email, password) => {
    try {
      const response = await axios.post("http://localhost:4000/auth/login", {
        email,
        password,
      });

      if (response.data.success) {
        const userData = {
          email: response.data.user.email,
          name: response.data.user.name || 'User', // Fallback to 'User' if name is not returned
        };
        // Validate userData before storing
        if (!userData.email || !userData.name) {
          throw new Error("Invalid user data received from server");
        }
        setIsAuthenticated(true);
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", response.data.token);
        return { success: true };
      } else {
        throw new Error(response.data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Failed to login");
      localStorage.removeItem("user"); // Prevent storing invalid data
      localStorage.removeItem("token");
      return { success: false, message: err.message };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("user");
    localStorage.removeItem("token"); 
  };

  const fetchSubmittedRTOs = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      const res = await axios.get("http://localhost:4000/api/rto", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success && Array.isArray(res.data.data)) {
        const validRows = res.data.data.filter(
          (row) => row && typeof row === "object" && row.hasOwnProperty("id")
        );
        setSubmittedRTOs(validRows);
      } else {
        setSubmittedRTOs([]);
        setError("No valid RTO data received");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch RTOs");
      setSubmittedRTOs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSubmittedRTOs();
    } else {
      setSubmittedRTOs([]);
    }
  }, [isAuthenticated]);

  const submitRTO = async (rto) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      const formattedRTO = {
        ...rto,
        order_date: rto.order_date ? new Date(rto.order_date).toISOString() : null,
        return_date: rto.return_date ? new Date(rto.return_date).toISOString() : null,
        created_at: rto.created_at ? new Date(rto.created_at).toISOString() : new Date().toISOString(),
      };
      await axios.post("http://localhost:4000/api/rto", formattedRTO, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchSubmittedRTOs();
      return { success: true };
    } catch (err) {
      console.error("Error submitting RTO:", {
        message: err.message,
        response: err.response?.data,
      });
      setError(err.response?.data?.message || "Failed to submit RTO");
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  return (
    <RTOContext.Provider 
      value={{ 
        isAuthenticated, 
        user,
        login, 
        logout, 
        submittedRTOs, 
        submitRTO, 
        loading, 
        error 
      }}
    >
      {children}
    </RTOContext.Provider>
  );
};