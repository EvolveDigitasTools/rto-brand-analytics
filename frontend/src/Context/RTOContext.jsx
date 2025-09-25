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
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (err) {
      console.warn("Failed to parse user from localStorage:", err);
      localStorage.removeItem("user"); // clean invalid value
      return null;
    }
  });

  const [submittedRTOs, setSubmittedRTOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    localStorage.setItem('isAuthenticated', isAuthenticated);
  }, [isAuthenticated]);

  const login = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
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
      const res = await axios.get("http://localhost:4000/api/rto");
      // console.log("Fetched RTOs in context (raw):", res.data.data);
      if (res.data.success && Array.isArray(res.data.data)) {
        const validRows = res.data.data.filter(
          (row) => row && typeof row === "object" && row.hasOwnProperty("id")
        );
        // console.log("Filtered valid rows:", validRows);
        setSubmittedRTOs(validRows);
      } else {
        // console.log("No valid data received:", res.data);
        setSubmittedRTOs([]);
        setError("No valid RTO data received");
      }
    } catch (err) {
      // console.error("Error fetching submitted RTOs:", {
      //   message: err.message,
      //   response: err.response?.data,
      // });
      setError(err.response?.data?.message || "Failed to fetch RTOs");
      setSubmittedRTOs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmittedRTOs();
  }, []);

  const submitRTO = async (rto) => {
    try {
      setLoading(true);
      setError(null);
      const formattedRTO = {
        ...rto,
        order_date: rto.order_date ? new Date(rto.order_date).toISOString() : null,
        return_date: rto.return_date ? new Date(rto.return_date).toISOString() : null,
        created_at: rto.created_at ? new Date(rto.created_at).toISOString() : new Date().toISOString(),
      };
      await axios.post("http://localhost:4000/api/rto", formattedRTO);
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