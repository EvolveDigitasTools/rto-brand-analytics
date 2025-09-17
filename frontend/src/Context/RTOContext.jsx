import { createContext, useState, useEffect } from "react";
import axios from "axios";

export const RTOContext = createContext();

export const RTOProvider = ({ children }) => {
  const [submittedRTOs, setSubmittedRTOs] = useState([]);

  // Fetch all submitted RTOs from backend
  const fetchSubmittedRTOs = async () => {
    try {
      const res = await axios.get("/api/rto"); // your backend endpoint
      if (res.data.success) {
        setSubmittedRTOs(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching submitted RTOs:", err);
    }
  };

  useEffect(() => {
    fetchSubmittedRTOs();
  }, []);

  const submitRTO = async (rto) => {
    try {
      await axios.post("/api/rto", rto); // save to DB
      fetchSubmittedRTOs(); // refresh list from DB
    } catch (err) {
      console.error("Error submitting RTO:", err);
    }
  };

  return (
    <RTOContext.Provider value={{ submittedRTOs, submitRTO }}>
      {children}
    </RTOContext.Provider>
  );
};
