import React, { useState } from "react";
import { Box, Button, TextField } from "@mui/material";
import axios from "axios";

const EditRTOForm = ({ row, onClose, refresh }) => {
  const [formData, setFormData] = useState({ ...row });

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/api/rto/${row.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      refresh();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to update");
    }
  };

  return (
    <Box component="form" sx={{ mt: 2, p: 2, border: "1px solid #ccc" }} onSubmit={handleSubmit}>
      <TextField label="Pickup Partner" value={formData.pickup_partner} onChange={(e) => handleChange("pickup_partner", e.target.value)} />
      <TextField label="SKU Code" value={formData.sku_code} onChange={(e) => handleChange("sku_code", e.target.value)} />
      <TextField label="Product Title" value={formData.product_title} onChange={(e) => handleChange("product_title", e.target.value)} />
      {/* Add other editable fields */}
      <Box sx={{ mt: 1 }}>
        <Button type="submit" variant="contained">Save</Button>
        <Button sx={{ ml: 1 }} onClick={onClose}>Cancel</Button>
      </Box>
    </Box>
  );
};

export default EditRTOForm;