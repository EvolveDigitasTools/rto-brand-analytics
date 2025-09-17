import React, { useContext } from "react";
import { RTOContext } from "../../Context/RTOContext";

const SubmittedRTOs = ({ onClose }) => {
  const { submittedRTOs } = useContext(RTOContext);

  // Log rows for debugging
  console.log("SubmittedRTOs in List:", submittedRTOs);

  const safeDate = (dateValue) => {
    if (!dateValue || dateValue === "NULL" || dateValue === "") {
      console.log("Invalid dateValue in List:", { dateValue, stack: new Error().stack });
      return "-";
    }
    console.log("Valid dateValue in List:", dateValue);
    return dateValue;
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Submitted RTOs</h2>
      {submittedRTOs.length === 0 ? (
        <p>No RTOs submitted yet.</p>
      ) : (
        <ul>
          {submittedRTOs.map((rto) => (
            <li key={rto.id} style={{ marginBottom: "10px" }}>
              <strong>SKU:</strong> {rto.sku_code || "-"} |{" "}
              <strong>Title:</strong> {rto.product_title || "-"} |{" "}
              <strong>Courier:</strong> {rto.courier || "-"} |{" "}
              <strong>Return Qty:</strong> {rto.return_qty || "-"} |{" "}
              <strong>Order Date:</strong> {safeDate(rto.order_date)} |{" "}
              <strong>Return Date:</strong> {safeDate(rto.return_date)} |{" "}
              <strong>Created At:</strong> {safeDate(rto.created_at)}
            </li>
          ))}
        </ul>
      )}
      <button onClick={onClose} style={{ marginTop: "20px" }}>
        Close
      </button>
    </div>
  );
};

export default SubmittedRTOs;