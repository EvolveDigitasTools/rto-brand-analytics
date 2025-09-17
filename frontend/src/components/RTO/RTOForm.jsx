import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Snackbar, Alert, Box, MenuItem, TextField, InputAdornment, IconButton } from "@mui/material";
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
    "Delhivery", "Blue Dart", "Valmo", "Shadowfax", "Xpressbees",
    "Amazon", "Flipkart", "Tata 1mg", "Hyugai Life", "Nimbus",
    "DTDC", "Meolaa"
  ];

  const itemCondition = ["Good", "Damaged", "Missing", "Wrong Return", "Used"];

  // ✅ Single source of truth for all rows
  const [fields, setFields] = useState([
    {
      skuCode: "",
      productTitle: "",
      awbId: "",
      orderId: "",
      courier: "",
      returnQty: "",
      itemCondition: "",
      claimRaised: "",
      ticketId: ""
    }
  ]);

  const [pickupPartner, setPickupPartner] = useState("");

  // ✅ Add new row, copy first row's SKU/productTitle if available
  const addField = () => {
    setFields((prev) => [
      ...prev,
      {
        skuCode: prev[0]?.skuCode || "",
        productTitle: prev[0]?.productTitle || "",
        awbId: "",
        orderId: "",
        courier: "",
        returnQty: "",
        itemCondition: "",
        claimRaised: "",
        ticketId: ""
      }
    ]);
  };

  // ✅ Delete specific row
  const removeField = (index) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  // ✅ Handle field changes
  const handleChange = (index, key, value) => {
    setFields((prevFields) => {
      if (!prevFields[index]) return prevFields;
      const updatedFields = [...prevFields];
      updatedFields[index] = { ...updatedFields[index], [key]: value };
      return updatedFields;
    });

    if (key === "skuCode") {
      const timer = setTimeout(() => fetchSkuData(value, index), 400);
      return () => clearTimeout(timer);
    }
  };

  // ✅ Fetch SKU data and update product title
  const fetchSkuData = async (code, index) => {
    try {
      const res = await axios.get(`/api?type=skuCode&skuCode=${code}`);
      setFields((prevFields) => {
        if (!prevFields[index]) return prevFields;
        const updatedFields = [...prevFields];
        updatedFields[index] = {
          ...updatedFields[index],
          productTitle: res.data.success ? res.data.data.sku?.name || "" : ""
        };
        return updatedFields;
      });
    } catch (err) {
      setFields((prevFields) => {
        if (!prevFields[index]) return prevFields;
        const updatedFields = [...prevFields];
        updatedFields[index] = { ...updatedFields[index], productTitle: "" };
        return updatedFields;
      });
    }
  };

  // ✅ Submit form
  const handleSubmit = (e) => {
    e.preventDefault();
    submitRTO({
      pickupPartner,
      fields,
      date: new Date().toISOString()
    });

    setOpenSnackbar(true);

    // Reset all fields
    setPickupPartner("");
    setFields([{
      skuCode: "",
      productTitle: "",
      awbId: "",
      orderId: "",
      courier: "",
      returnQty: "",
      itemCondition: "",
      claimRaised: "",
      ticketId: ""
    }]);
  };

  // ✅ Auto-total return quantity
  const totalReturn = fields.reduce((acc, field) => {
    const qty = parseInt(field.returnQty, 10);
    return acc + (isNaN(qty) ? 1 : qty);
  }, 0);

  return (
    <MainContainer component="form" onSubmit={handleSubmit}>
      {/* Pickup Partner + Return Date */}
      <FieldContainer>
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

        <TextField
          style={{ width: "25%" }}
          type="date"
          label="Return Date"
          variant="outlined"
          required
          InputLabelProps={{ shrink: true }}
        />
      </FieldContainer>

      {/* Row Mapping */}
      {fields.map((field, index) => {
        const requiresClaim = ["Damaged", "Missing", "Wrong Return", "Used"].includes(field.itemCondition);

        return (
          <FieldContainer style={{ display: "grid" }} key={index}>
            {/* SKU Code + Product Title */}
            <FieldContainer>
              <TextField
                style={{ width: "30%" }}
                label="SKU Code"
                variant="outlined"
                required
                value={field.skuCode}
                onChange={(e) => handleChange(index, "skuCode", e.target.value)}
                InputProps={{
                  endAdornment: field.productTitle && (
                    <InputAdornment position="end">
                      <CheckCircleIcon color="success" />
                    </InputAdornment>
                  )
                }}
              />

              <TextField
                style={{ width: "70%" }}
                label="Product Title"
                variant="outlined"
                value={field.productTitle}
                InputProps={{ readOnly: true }}
              />
            </FieldContainer>

            {/* AWB ID + Order ID + Date */}
            <FieldContainer>
              <TextField
                style={{ width: "32%" }}
                label="AWB ID"
                variant="outlined"
                required
                value={field.awbId}
                onChange={(e) => handleChange(index, "awbId", e.target.value)}
              />
              <TextField
                style={{ width: "35%" }}
                label="Order ID"
                variant="outlined"
                value={field.orderId}
                onChange={(e) => handleChange(index, "orderId", e.target.value)}
              />
              <TextField
                style={{ width: "35%" }}
                type="date"
                label="Order Date"
                variant="outlined"
                required
                InputLabelProps={{ shrink: true }}
              />
            </FieldContainer>

            {/* Item Condition + Claim + Ticket ID */}
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
                {itemCondition.map((c, i) => (
                  <MenuItem key={i} value={c}>{c}</MenuItem>
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
              required
            />

            {/* Add / Delete buttons */}
            <FieldContainer style={{ justifyContent: "center" }}>
              {index === fields.length - 1 && (
                <IconButtonStyle color="primary" onClick={addField}>
                  <AddIcon />
                </IconButtonStyle>
              )}
              {fields.length > 1 && (
                <IconButtonStyle color="error" onClick={() => removeField(index)}>
                  <DeleteIcon />
                </IconButtonStyle>
              )}
            </FieldContainer>
          </FieldContainer>
        );
      })}

      {/* Submit + Total Return */}
      <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px" }}>
        <button type="submit" style={{ display: "flex", width: "68%" }} className="learn-more">
          <span className="circle" aria-hidden="true">
            <span className="icon arrow"></span>
          </span>
          <span style={{ textTransform: "none" }} className="button-text">
            Submit RTO for Verification
          </span>
        </button>

        <TextField
          style={{ width: "29%" }}
          type="number"
          label="Total Return"
          variant="outlined"
          value={totalReturn}
          InputProps={{ readOnly: true }}
        />
      </Box>

      {/* Snackbar */}
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
