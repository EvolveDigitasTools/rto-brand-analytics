import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Snackbar, Alert, Box, MenuItem, TextField, InputAdornment, IconButton } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import styled from "@emotion/styled";
// import { RTOContext } from "../../Context/RTOContext";


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
  const API_URL = process.env.REACT_APP_API_URL;
  // const navigate = useNavigate();
  const [openSnackbar, setOpenSnackbar] = useState(false);
  // const { submitRTO } = useContext(RTOContext);

  const marketPlaces = [
    "Amazon", "Flipkart", "Meesho", "FirstCry", "Plugin Store"
  ]

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
      orderDate: "",
      courier: "",
      returnQty: "",
      itemCondition: "",
      claimRaised: "",
      ticketId: "",
      comments: "",
    },
  ]);

  const [pickupPartner, setPickupPartner] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [allMarketPlaces, setAllMarketPlaces] = useState("");

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
      const updatedFields = [...prevFields];
      if (!updatedFields[index]) return prevFields;

      updatedFields[index] = { ...updatedFields[index], [key]: value };
      return updatedFields;
    });

    if (key === "skuCode") {
      const timer = setTimeout(() => fetchSkuData(value, index), 500);
      return () => clearTimeout(timer);
    }
  };

  // ✅ Fetch SKU data and update product title
  const fetchSkuData = async (code, index) => {
  try {
    const res = await axios.get(`${API_URL}/api?type=skuCode&skuCode=${code}`);

    setFields((prevFields) => {
      if (!prevFields[index]) return prevFields;

      const updatedFields = [...prevFields];

      // ✅ For both normal and combo SKUs, use data.sku.name
      const title = res.data.success ? res.data.data.sku?.name || "" : "";

      updatedFields[index] = {
        ...updatedFields[index],
        productTitle: title,
        isValidSku: res.data.success,
      };

      return updatedFields;
    });
  } catch (err) {
    setFields((prevFields) => {
      if (!prevFields[index]) return prevFields;

      const updatedFields = [...prevFields];
      updatedFields[index] = {
        ...updatedFields[index],
        productTitle: "",
        isValidSku: false,
      };

      return updatedFields;
    });
  }
};

// Fetch Data with Awb id
const fetchAwbData = async (awbId, index) => {
  if (!awbId) return;

  try {
    const res = await axios.get(`${API_URL}/api/meesho-rto/${awbId}`);
    const rto = res.data.data;

    const formatDate = (dateString) => {
      if (!dateString) return "";
      return new Date(dateString).toISOString().split("T")[0];
    };

    setFields((prev) => {
      const updated = [...prev];
      if (!updated[index]) return prev;

      updated[index] = {
        ...updated[index],
        awbId,
        skuCode: rto.sku || "",
        productTitle: rto.product_name || "",
        courier: rto.courier_partner || "",
        orderId: rto.order_number || "",
        orderDate: formatDate(rto.dispatch_date),
        returnQty: rto.qty || "",
      };
      return updated;
    });

    if (rto.courier_partner) setPickupPartner(rto.courier_partner);
    if (rto.return_created_date)
    setReturnDate(formatDate(rto.return_created_date));

  } catch (err) {
    console.error("❌ Error fetching AWB:", err.response?.data || err.message);
  }
};


  // ✅ Submit form
  const handleSubmit = async (e) => {
  e.preventDefault();

  const token = localStorage.getItem("token");
  if (!token) {
    console.error("No token found — user may not be logged in");
    return;
  }
  // console.log("🔑 API URL:", API_URL);
  // console.log("🔑 Token:", token ? token.slice(0, 30) + "..." : "MISSING");

  try {
    const res = await axios.post(`${API_URL}/api/rto`, {
      marketplaces: allMarketPlaces,
      pickupPartner,
      returnDate: new Date().toISOString().split("T")[0],
      fields,
      }, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      }
    });

    console.log("✅ Response:", res.data);

    setOpenSnackbar(true);
    // Reset form
    setPickupPartner("");
    setAllMarketPlaces("");
    setFields([{ 
      returnDate: "",
      skuCode: "", 
      productTitle: "", 
      awbId: "", 
      orderId: "", 
      orderDate: "", 
      courier: "", 
      itemCondition: "", 
      claimRaised: "", 
      ticketId: "",
      comments: "", 
      returnQty: "" }]);
  } catch (err) {
    console.error("Error submitting RTO:", err);
    console.error("Response:", err.response?.data);
    console.error("Status:", err.response?.status);
    console.error("Request URL:", err.config?.url);
    console.error("Request Headers:", err.config?.headers);
  }
};

  // ✅ Auto-total return quantity
  const totalReturn = fields.reduce((acc, field) => {
    const qty = parseInt(field.returnQty, 10);
    return acc + (isNaN(qty) ? 1 : qty);
  }, 0);

  return (
    <div className="rto_form_stylin">
    <MainContainer component="form" onSubmit={handleSubmit}>
      {/* MarketPlaces + Pickup Partner + Return Date */}
      <FieldContainer>
        <TextField
          style={{ width: "32%" }}
          select
          label="Marketplaces"
          value={allMarketPlaces}
          onChange={(e) => setAllMarketPlaces(e.target.value)}
          required
        >
          <MenuItem value="">-- Select Marketplaces --</MenuItem>
          {marketPlaces.map((marketPlace, i) => (
            <MenuItem key={i} value={marketPlace}>{marketPlace}</MenuItem>
          ))}
        </TextField>
        <TextField
          style={{ width: "35%" }}
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
          style={{ width: "35%" }}
          type="date"
          label="Return Date"
          variant="outlined"
          value={returnDate}
          onChange={(e) => setReturnDate(e.target.value)}
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
                  endAdornment:
                    field.isValidSku && (
                      <InputAdornment position="end">
                        <CheckCircleIcon color="success" />
                      </InputAdornment>
                    ),
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
                onChange={(e) => {
                  const value = e.target.value;
                  handleChange(index, "awbId", value);

                  if (value.length >= 8) {
                    clearTimeout(window.awbTimer);
                    window.awbTimer = setTimeout(() => fetchAwbData(value, index), 600);
                  }
                }}
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
                label="Dispatched Date"
                variant="outlined"
                value={field.orderDate} // <-- bind to state
                onChange={(e) => handleChange(index, "orderDate", e.target.value)}
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

            {/* Comments + Return Qty */}
            <FieldContainer>
            <TextField
              style={{ width: "70%", maxHeight: "80px" }}
              type="text"
              label="Comments"
              variant="outlined"
              value={field.comments}
              onChange={(e) => handleChange(index, "comments", e.target.value)}
              required
            />
            <TextField
              style={{ width: "35%" }}
              type="number"
              label="Return Qty"
              variant="outlined"
              value={field.returnQty}
              onChange={(e) => handleChange(index, "returnQty", e.target.value)}
              required
            />
            </FieldContainer>

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
      <Box 
        style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          gap: "20px" 
        }}>
        <button 
          type="submit" 
          style={{ display: "flex", width: "70%" }} 
          className="learn-more"
        >
          <span className="circle" aria-hidden="true">
            <span className="icon arrow"></span>
          </span>
          <span style={{ textTransform: "none" }} className="button-text">
            Submit RTO for Verification
          </span>
        </button>

        <TextField
          style={{ width: "35%" }}
          type="number"
          label="Total Return Qty"
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
        <Alert 
          onClose={() => setOpenSnackbar(false)} 
          severity="success" 
          sx={{ width: "100%" }}
        >
          RTO submitted successfully!
        </Alert>
      </Snackbar>
    </MainContainer>
    </div>
  );
};

export default RTOForm;
