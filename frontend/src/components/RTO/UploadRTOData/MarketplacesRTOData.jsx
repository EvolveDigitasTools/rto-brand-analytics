import React from "react";
import { useNavigate } from "react-router-dom";

const MarketplacesRTOData = () => {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: "center" }}>
      <h3>Upload All Marketplaces RTO Data</h3>
      <div style={{ marginBottom: "20px" }}>
        <button
          style={{
            width: "100px",
            border: "1px solid black",
            margin: "0 20px",
          }}
          onClick={() => navigate("/amazon")}
        >
          Amazon
        </button>

        <button
          style={{
            width: "100px",
            border: "1px solid black",
            margin: "0 20px",
          }}
          onClick={() => navigate("/flipkart")}
        >
          Flipkart
        </button>

        <button
          style={{
            width: "100px",
            border: "1px solid black",
            margin: "0 20px",
          }}
          onClick={() => navigate("/meesho")}
        >
          Meesho
        </button>
      </div>
    </div>
  );
};

export default MarketplacesRTOData;
