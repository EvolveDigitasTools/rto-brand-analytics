import { createContext, useState } from "react";

export const RTOContext = createContext();

export const RTOProvider = ({ children }) => {
  const [submittedRTOs, setSubmittedRTOs] = useState([]);

  const submitRTO = (rto) => {
    setSubmittedRTOs((prev) => [...prev, rto]);
  };

  return (
    <RTOContext.Provider value={{ submittedRTOs, submitRTO }}>
      {children}
    </RTOContext.Provider>
  );
};
