import { 
  Box, 
  MenuItem, 
  TextField, 
  InputAdornment, 
  IconButton 
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import styled from "@emotion/styled";
import React, { useState, useEffect } from "react";
import axios from "axios";

const MainContainer = styled(Box)`
  display: grid;
  justify-content: center;
  width: 100%;
  margin: 40px 0;
  gap: 20px;
`;

const FieldContainer = styled(Box)`
  width: 100%;
  height: 100%;
  display: flex;
  gap: 20px;
`;

const RTOForm = () => {
  const couriers = [
    "Delhivery",
    "Blue Dart",
    "Valmo",
    "Shadowfax",
    "Xpressbees",
    "Amazon",
    "Flipkart",
    "Tata 1mg",
    "Hyugai Life",
    "Nimbus",
    "DTDC",
    "Meolaa",
  ];

  const [skuCode, setSkuCode] = useState("");
  const [sapCode, setSapCode] = useState("");
  const [productTitle, setProductTitle] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  // Store multiple rows (courier + return qty)
  const [fields, setFields] = useState([{ courier: "", returnQty: "" }]);

  // Add new row
  const addField = () => {
    setFields([...fields, { courier: "", returnQty: "" }]);
  };

  // Update field value
  const handleChange = (index, key, value) => {
    const updatedFields = [...fields];
    updatedFields[index][key] = value;
    setFields(updatedFields);
  };

  // Fetch SKU data
  const fetchSkuData = async (code) => {
    try {
      const res = await axios.get(`/api?type=skuCode&skuCode=${code}`);
      if (res.data.success) {
        setIsVerified(true);
        setSapCode(res.data.data.details?.sapcode || "");
        setProductTitle(res.data.data.sku?.name || "");
      } else {
        resetSkuState();
      }
    } catch (err) {
      resetSkuState();
    }
  };

  // Reset SKU-related fields
  const resetSkuState = () => {
    setIsVerified(false);
    setSapCode("");
    setProductTitle("");
  };

  // Watch skuCode changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (skuCode.trim() !== "") {
        fetchSkuData(skuCode);
      } else {
        resetSkuState();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [skuCode]);

  return (
    <MainContainer>
      {/* SKU Input */}
      <FieldContainer>
        <TextField
          style={{ width: "100%" }}
          label="SKU Code"
          variant="outlined"
          required
          value={skuCode}
          onChange={(e) => setSkuCode(e.target.value)}
          InputProps={{
            endAdornment: isVerified && (
              <InputAdornment position="end">
                <CheckCircleIcon color="success" />
              </InputAdornment>
            ),
          }}
        />
      </FieldContainer>

      {/* Product Title */}
      <TextField
        label="Product Title"
        variant="outlined"
        value={productTitle}
        onChange={(e) => setProductTitle(e.target.value)}
      />

      {/* Order Details */}
      <FieldContainer>
        <TextField style={{ width: "35%" }} label="Order ID" variant="outlined" required />
        <TextField
          style={{ width: "35%" }}
          type="date"
          label="Order Date"
          variant="outlined"
          required
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          style={{ width: "31.5%" }}
          type="date"
          label="Return Date"
          variant="outlined"
          required
          InputLabelProps={{ shrink: true }}
        />
      </FieldContainer>

      {/* Pickup Partners & Return Qty Rows */}
      {fields.map((field, index) => (
        <FieldContainer key={index}>
          <TextField
            style={{ width: "70%" }}
            select
            label="Pickup Partner"
            variant="outlined"
            value={field.courier}
            onChange={(e) => handleChange(index, "courier", e.target.value)}
            required
          >
            <MenuItem value="">-- Select Courier --</MenuItem>
            {couriers.map((courier, i) => (
              <MenuItem key={i} value={courier}>
                {courier}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            style={{ width: "30%" }}
            type="number"
            label="Return ?"
            variant="outlined"
            value={field.returnQty}
            onChange={(e) => handleChange(index, "returnQty", e.target.value)}
            required
          />
        </FieldContainer>
      ))}

      {/* Add Button */}
      <IconButton color="primary" onClick={addField} sx={{ alignSelf: "flex-start" }}>
        <AddIcon />
      </IconButton>

      {/* Submit & Total Return */}
      <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ display: "flex", width: "68%" }} className="learn-more">
          <span className="circle" aria-hidden="true">
            <span className="icon arrow"></span>
          </span>
          <span className="button-text">Submit RTO</span>
        </button>
        <TextField style={{ width: "29%" }} type="number" label="Total Return ?" variant="outlined" required />
      </Box>
    </MainContainer>
  );
};

export default RTOForm;
