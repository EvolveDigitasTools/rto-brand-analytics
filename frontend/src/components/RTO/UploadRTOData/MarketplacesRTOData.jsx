import React from "react";
import { useNavigate } from "react-router-dom";

const MarketplacesRTOData = () => {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: "center" }}>
      <h3 className="market_place">Upload All Marketplaces RTO Data</h3>
      <div style={{ marginBottom: "20px" }}>
        <button className="button2" 
         
          onClick={() => navigate("/amazon")}
        >
          Amazon
        </button>

        <button className="button2" 
          
          onClick={() => navigate("/flipkart")}
        >
          Flipkart
        </button>

        <button className="button2" 
         
          onClick={() => navigate("/meesho")}
        >
          Meesho
        </button>
      </div>
    </div>
  );
};

export default MarketplacesRTOData;
