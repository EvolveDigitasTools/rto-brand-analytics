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
import DeleteIcon from "@mui/icons-material/Delete";
import styled from "@emotion/styled";
import { RTOContext } from "../../Context/RTOContext";

const MainContainer = styled(Box)`
  display: grid;
  justify-content: center;
  align-items: center;
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
  margin: 5px 0px 5px 5px;
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
  const [pickupPartner, setPickupPartner] = useState("");  

  // Store multiple rows (courier + return qty, item condition)
  const [fields, setFields] = useState([
    { awbId: "", orderId: "", courier: "", returnQty: "", itemCondition: "", claimRaised: "", ticketId: "" },
  ]);

  //Send Data to Context
  const handleSubmit = (e) => {
    e.preventDefault();
    const rtoData = {
      skuCode,
      productTitle,
      pickupPartner,
      fields,
      date: new Date().toISOString(),
    };
    submitRTO(rtoData);
    setOpenSnackbar(true);

    // Reset everything
    setSkuCode("");
    setProductTitle("");
    setPickupPartner("");
    setFields([{ awbId: "", orderId: "", itemCondition: "", claimRaised: "", ticketId: "", returnQty: "" }]);
    setIsVerified(false);
  };

  // Add new row
  const addField = () => {
    setFields([
      ...fields,
      { awbId: "", orderId: "", courier: "", returnQty: "", itemCondition: "", claimRaised: "", ticketId: "" },
    ]);
  };

  // Delete added row
  const removeField = (index) => {
    // Prevent deleting if there is only one row left
    if (fields.length === 1) return;

    const updatedFields = fields.filter((_, i) => i !== index);
    setFields(updatedFields);
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
    return acc + (isNaN(qty) ? 1 : qty);
  }, 0);

  return (
    <MainContainer component="form" onSubmit={handleSubmit}>
        {/* Pickup Partner and Return Date */} 
      <FieldContainer>
        {/* Pickup Partner */}
        <TextField
          style={{ width: "75%" }}
          select
          label="Pickup Partner"
          value={pickupPartner}
          onChange={(e) => setPickupPartner(e.target.value)}
          required
        >
          <MenuItem value="">-- Select Courier --</MenuItem>
          {couriers.map((courier, i) => (
            <MenuItem key={i} value={courier}>{courier}</MenuItem>
          ))}
        </TextField>
          {/* Return Date */}
        <TextField
          style={{ width: "25%" }}
          type="date"
          label="Return Date"
          variant="outlined"
          required
          InputLabelProps={{ shrink: true }}
        />
      </FieldContainer>

      {/* AWB and Order ID, Conditions and Return Qty Rows */}

      {fields.map((field, index) => {
  const requiresClaim = ["Damaged", "Missing", "Wrong Return", "Used"].includes(field.itemCondition);

  return (
    <FieldContainer style={{ display: "grid" }} key={index}>
      {/* SKU Code and Title */}
      <FieldContainer>
        <TextField
          style={{ width: "30%" }}
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
          style={{ width: "70%" }}
          label="Product Title"
          variant="outlined"
          value={productTitle}
          onChange={(e) => setProductTitle(e.target.value)}
          slotProps={{
            input: { readOnly: true },
          }}
        />
      </FieldContainer>

      {/* AWB ID, Order ID and Order Date */}
      <FieldContainer>
        <TextField style={{ width: "32%" }} label="AWB ID" variant="outlined" required />
        <TextField style={{ width: "35%" }} label="Order ID" variant="outlined" />
        <TextField
          style={{ width: "35%" }}
          type="date"
          label="Order Date"
          variant="outlined"
          required
          InputLabelProps={{ shrink: true }}
        />
      </FieldContainer>

      {/* Item Condition, Claim Raised, Ticket ID */}
      <FieldContainer>
        <TextField
          style={{ width: "29.5%" }}
          select
          label="Item Condition"
          variant="outlined"
          value={field.itemCondition}
          onChange={(e) => handleChange(index, "itemCondition", e.target.value)}
          required
        >
          <MenuItem value="">-- Select Condition --</MenuItem>
          {itemCondition.map((cond, i) => (
            <MenuItem key={i} value={cond}>
              {cond}
            </MenuItem>
          ))}
        </TextField>

        {requiresClaim && (
          <TextField
            style={{ width: "32%" }}
            select
            label="Claim Raised"
            value={field.claimRaised}
            onChange={(e) => handleChange(index, "claimRaised", e.target.value)}
            required
          >
            <MenuItem value="">-- Select --</MenuItem>
            <MenuItem value="Yes">Yes</MenuItem>
            <MenuItem value="No">No</MenuItem>
          </TextField>
        )}

        {requiresClaim && field.claimRaised === "Yes" && (
          <TextField
            style={{ width: "32%" }}
            label="Ticket ID"
            value={field.ticketId}
            onChange={(e) => handleChange(index, "ticketId", e.target.value)}
            required
          />
        )}
      </FieldContainer>

      {/* Comments */}
      <TextField
        style={{ width: "100%", maxHeight: "80px" }}
        type="text"
        label="Comments"
        variant="outlined"
        value={field.returnQty}
        onChange={(e) => handleChange(index, "returnQty", e.target.value)}
        required
      />

      {/* Add/Delete Buttons - ONLY ON LAST ROW */}
      {index === fields.length - 1 && (
        <FieldContainer style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
          {/* Add Button */}
          <IconButtonStyle color="primary" onClick={addField}>
            <AddIcon />
          </IconButtonStyle>

          {/* Delete Button (only if more than one row) */}
          {fields.length > 1 && (
            <IconButtonStyle color="error" onClick={() => removeField(index)}>
              <DeleteIcon />
            </IconButtonStyle>
          )}
        </FieldContainer>
      )}
    </FieldContainer>
  );
})}



      {/* Add Button, Submit & Total Return */}
      <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px" }}>
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
