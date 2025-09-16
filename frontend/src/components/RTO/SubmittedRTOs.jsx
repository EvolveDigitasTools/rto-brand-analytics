import React, { useContext } from "react";
import { RTOContext } from "../../Context/RTOContext";

const SubmittedRTOs = ({ onClose }) => {
  const { submittedRTOs } = useContext(RTOContext);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Submitted RTOs</h2>
      {submittedRTOs.length === 0 ? (
        <p>No RTOs submitted yet.</p>
      ) : (
        <ul>
          {submittedRTOs.map((rto, index) => (
            <li key={index} style={{ marginBottom: "10px" }}>
              <strong>SKU:</strong> {rto.skuCode} |{" "}
              <strong>Title:</strong> {rto.productTitle} |{" "}
              <strong>Couriers:</strong>{" "}
              {rto.fields
                .map((f, i) => `${f.courier} (${f.returnQty})`)
                .join(", ")}
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
