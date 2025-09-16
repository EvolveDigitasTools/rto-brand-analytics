import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Snackbar, Alert } from "@mui/material";
import { 
  Box, 
  MenuItem, 
  TextField, 
  InputAdornment, 
  IconButton 
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AddIcon from "@mui/icons-material/Add";
import styled from "@emotion/styled";
import { RTOContext } from "../../Context/RTOContext";

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
  align-items: center;
`;

const IconButtonStyle = styled(IconButton)`
  background: none;
  width: 49px;
  height: 49px;
  margin: 5px -5px 5px 0px;
  &:hover {
    background: black;
    color: white;
  }
`;

const RTOForm = () => {
  
  const navigate = useNavigate();
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const { submitRTO } = useContext(RTOContext);
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

  const itemCondition = [
    "Good",
    "Damaged", 
    "Missing", 
    "Wrong Return",
    "Used",
  ];

  const [skuCode, setSkuCode] = useState("");
  const [productTitle, setProductTitle] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  // Store multiple rows (courier + return qty, item condition)
  const [fields, setFields] = useState([{ courier: "", returnQty: "", itemCondition: "" }]);

  //Send Data to Context
  const handleSubmit = (e) => {
    e.preventDefault();

    const rtoData = {
      skuCode,
      productTitle,
      // awbId,
      // orderId,
      // orderDate,
      // returnDate,
      fields, // all couriers + return qty
      date: new Date().toISOString(),
    };

    submitRTO(rtoData);
    setOpenSnackbar(true);

    // Reset form
    setSkuCode("");
    setProductTitle("");
    setFields([{ courier: "", returnQty: "", itemCondition: "" }]);
  };

  // Add new row
  const addField = () => {
    setFields([...fields, { courier: "", returnQty: "", itemCondition: "" }]);
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

  const totalReturn = fields.reduce((acc, field) => {
    const qty = parseInt(field.returnQty, 10);
    return acc + (isNaN(qty) ? 0 : qty);
  }, 0);

  return (
    <MainContainer component="form" onSubmit={handleSubmit}>
      {/* SKU Input */}
      <FieldContainer>
        <TextField
          style={{ width: "24%" }}
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
        {/* Product Title */}
      <TextField
        style={{ width: "75%" }}
        label="Product Title"
        variant="outlined"
        value={productTitle}
        onChange={(e) => setProductTitle(e.target.value)}
        slotProps={{
            input: {
              readOnly: true,
            },
          }}
      />
      </FieldContainer>

      {/* Order Details */}
      <FieldContainer>
        <TextField style={{ width: "35%" }} label="AWB ID" variant="outlined" required />        
        <TextField style={{ width: "35%" }} label="Order ID" variant="outlined" optional />
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

          {/* Add Button */}
          <IconButtonStyle color="primary" onClick={addField} sx={{ alignSelf: "flex-start" }}>
            <AddIcon />
          </IconButtonStyle>

          <TextField
            style={{ width: "35%" }}
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
            select
            label="Item Condition"
            variant="outlined"
            value={field.itemCondition}
            onChange={(e) => handleChange(index, "itemCondition", e.target.value)}
            required
          >
            <MenuItem value="">-- Select Condition --</MenuItem>
            {itemCondition.map((itemCondition, i) => (
              <MenuItem key={i} value={itemCondition}>
                {itemCondition}
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

      {/* Submit & Total Return */}
      <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button 
          type="submit" 
          style={{ display: "flex", width: "68%" }} 
          className="learn-more"
        >
          <span className="circle" aria-hidden="true">
            <span className="icon arrow"></span>
          </span>
          <span style={{textTransform: "none"}} className="button-text">
            Submit RTO for Verification
          </span>
        </button>
        <TextField 
          style={{ width: "29%" }} 
          type="number" 
          label="Total Return" 
          variant="outlined" 
          value={totalReturn}
          InputProps={{ readOnly: true, }}
        />
      </Box>

      {/* // Snackbar */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setOpenSnackbar(false)} severity="success" sx={{ width: "100%" }}>
          RTO submitted successfully!
        </Alert>
      </Snackbar>

    </MainContainer>
  );
};

export default RTOForm;
