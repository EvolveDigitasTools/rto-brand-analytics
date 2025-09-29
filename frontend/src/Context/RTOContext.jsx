import { createContext, useState, useEffect } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

export const RTOContext = createContext();

export const RTOProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const auth = localStorage.getItem('isAuthenticated');
    // console.log("Initial isAuthenticated from localStorage:", auth); // Debug
    return auth === 'true';
  });

  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      // console.log("Initial user from localStorage:", storedUser); 
      if (!storedUser || storedUser === "undefined" || storedUser === "") {
        localStorage.removeItem("user");
        localStorage.removeItem("isAuthenticated"); // Clean up invalid data
        return null;
      }
      return JSON.parse(storedUser);
    } catch (err) {
      // console.warn("Failed to parse user from localStorage:", err);
      localStorage.removeItem("user"); // Clean invalid value
      localStorage.removeItem("isAuthenticated");
      return null;
    }
  });

  const [submittedRTOs, setSubmittedRTOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // console.log("Updating localStorage with isAuthenticated:", isAuthenticated); // Debug
    localStorage.setItem('isAuthenticated', isAuthenticated);
    if (!isAuthenticated) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setUser(null);
      setSubmittedRTOs([]);
    }
  }, [isAuthenticated]);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      // console.log("Login response:", response.data); // Debug

      if (response.data.success) {
        const userData = {
          email: response.data.user.email,
          name: response.data.user.name || 'User', // Fallback to 'User' if name is not returned
          role: response.data.user.role || 'user'
        };
        // Validate userData before storing
        if (!userData.email || !userData.name) {
          throw new Error("Invalid user data received from server");
        }
        setIsAuthenticated(true);
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("isAuthenticated", "true");
        console.log("Stored user:", userData, "isAuthenticated:", true); // Debug
        return { success: true };
      } else {
        throw new Error(response.data.message || "Login failed");
      }
    } catch (err) {
      // console.error("Login error:", err);
      setError(err.response?.data?.message || "Failed to login");
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("isAuthenticated");
      return { success: false, message: err.message };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setSubmittedRTOs([]);
    setError(null);
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("user");
    localStorage.removeItem("token"); 
    // console.log("Logged out, cleared localStorage"); // Debug
  };

  const fetchSubmittedRTOs = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      const res = await axios.get(`${API_URL}/api/rto`, {
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
      if (err.response?.status === 401) {
        logout(); // Auto-logout on 401
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      fetchSubmittedRTOs();
    } else {
      setSubmittedRTOs([]);
    }
  }, [isAuthenticated, user]);

  const submitRTO = async (rto) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      if (!user?.email) {
        throw new Error("No authenticated user found");
      }
      const formattedRTO = {
        ...rto,
        created_by: user?.email || null,
        order_date: rto.order_date ? new Date(rto.order_date).toISOString() : null,
        return_date: rto.return_date ? new Date(rto.return_date).toISOString() : null,
        created_at: rto.created_at ? new Date(rto.created_at).toISOString() : new Date().toISOString(),
      };
      // console.log("Submitting RTO with data:", formattedRTO); // Debug
      await axios.post(`${API_URL}/api/rto`, formattedRTO, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchSubmittedRTOs();
      return { success: true };
    } catch (err) {
      // console.error("Error submitting RTO:", {
      //   message: err.message,
      //   response: err.response?.data,
      // });
      setError(err.response?.data?.message || "Failed to submit RTO");
      if (err.response?.status === 401) {
        logout(); // Auto-logout on 401
      }
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
        fetchSubmittedRTOs,
        loading, 
        error 
      }}
    >
      {children}
    </RTOContext.Provider>
  );
};