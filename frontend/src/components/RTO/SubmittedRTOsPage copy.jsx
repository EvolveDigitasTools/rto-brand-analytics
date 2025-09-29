import React, { useContext, useState } from "react";
import { Box, TextField, IconButton, Snackbar, Alert, MenuItem } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { RTOContext } from "../../Context/RTOContext";
import { format, parseISO, isValid } from "date-fns";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import axios from "axios";

const PICKUP_PARTNERS = [
    "Delhivery", "Blue Dart", "Valmo", "Shadowfax", "Xpressbees",
    "Amazon", "Flipkart", "Tata 1mg", "Hyugai Life", "Nimbus",
    "DTDC", "Meolaa"
  ];
const ITEM_CONDITIONS = ["Good", "Damaged", "Missing", "Wrong Return", "Used"];

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = parseISO(dateString);
  if (!isValid(date)) return "-";
  return format(date, "yyyy-MM-dd"); // send to backend in YYYY-MM-DD
};

const formatDateTime = (dateString) => {
  if (!dateString) return "-";
  const date = parseISO(dateString);
  if (!isValid(date)) return "-";
  return format(date, "dd MMM yyyy HH:mm");
};

const SubmittedRTOsPage = () => {
  const { submittedRTOs, loading, error, fetchSubmittedRTOs } = useContext(RTOContext);
  const [editRowId, setEditRowId] = useState(null);
  const [editData, setEditData] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const API_URL = process.env.REACT_APP_API_URL;
  const token = localStorage.getItem("token");

  const handleEditClick = (row) => {
    setEditRowId(row.id);
    setEditData({ ...row });
  };

  const handleCancelClick = () => {
    setEditRowId(null);
    setEditData({});
  };

  const handleChange = (key, value) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (id) => {
    if (!token) return alert("Not logged in");

      // ✅ Add validation for claim_raised & ticket_id
  if (editData.item_condition === "Good") {
    // Automatically clear these fields if condition is good
    editData.claim_raised = null;
    editData.ticket_id = null;
  } else {
    // Validate fields when condition is not good
    if (!editData.claim_raised || !editData.ticket_id) {
      setSnackbar({
        open: true,
        message: "Claim Raised and Ticket ID are required when condition is not good",
        severity: "error",
      });
      return; // Stop update
    }
  }

    // Convert dates to YYYY-MM-DD format before sending
    const payload = {
      ...editData,
      return_date: editData.return_date ? editData.return_date.split("T")[0] : null,
      order_date: editData.order_date ? editData.order_date.split("T")[0] : null,
    };

    try {
      await axios.put(`${API_URL}/api/rto/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchSubmittedRTOs();
      setEditRowId(null);
      setEditData({});
      setSnackbar({ open: true, message: "RTO updated successfully", severity: "success" });
    } catch (err) {
      console.error("Update error:", err);
      
      if (err.response?.status === 400 && err.response.data?.message) {
      setSnackbar({ open: true, message: err.response.data.message, severity: "error" });

    } else {
      setSnackbar({ open: true, message: "Failed to update record", severity: "error" });
    }
  }
};

  const handleDelete = async (id) => {
    if (!token) return alert("Not logged in");
    if (!window.confirm("Are you sure you want to delete this RTO record?")) return;

    try {
      await axios.delete(`${API_URL}/api/rto/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchSubmittedRTOs();
      setSnackbar({ open: true, message: "RTO deleted successfully", severity: "success" });
    } catch (err) {
      console.error("Delete error:", err);
      setSnackbar({ open: true, message: "Failed to delete record", severity: "error" });
    }
  };

  const handleKeyPress = (e, id) => {
    if (e.key === "Enter") handleSave(id);
  };

  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    // Pickup Partner
    {
      field: "pickup_partner",
      headerName: "Pickup Partner",
      width: 150,
      renderCell: (params) =>
        editRowId === params.row.id ? (
          <TextField
            select
            value={editData.pickup_partner || ""}
            onChange={(e) => handleChange("pickup_partner", e.target.value)}
            size="small"
            onBlur={() => handleSave(params.row.id)}
          >
            {PICKUP_PARTNERS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          params.value
        ),
    },
    // AWB Id
    {
      field: "awb_id",
      headerName: "AWB ID",
      width: 130,
      editable: true,
      renderCell: (params) =>
        editRowId === params.row.id ? (
          <TextField
            value={editData.awb_id || ""}
            onChange={(e) => handleChange("awb_id", e.target.value)}
            size="small"
            onBlur={() => handleSave(params.row.id)}
            onKeyPress={(e) => handleKeyPress(e, params.row.id)}
          />
        ) : (
          params.value
        ),
    },
    // Return Date
    {
      field: "return_date",
      headerName: "Return Date",
      width: 150,
      renderCell: (params) => formatDate(params.value),
    },
    // SKU Code
    {
      field: "sku_code",
      headerName: "SKU Code",
      width: 150,
      renderCell: (params) =>
        editRowId === params.row.id ? (
          <TextField
            value={editData.sku_code || ""}
            onChange={(e) => handleChange("sku_code", e.target.value)}
            size="small"
            onBlur={() => handleSave(params.row.id)}
            onKeyPress={(e) => handleKeyPress(e, params.row.id)}
          />
        ) : (
          params.value
        ),
    },
    // Product Title
    {
      field: "product_title",
      headerName: "Product Title",
      width: 250,
      renderCell: (params) =>
        editRowId === params.row.id ? (
          <TextField
            value={editData.product_title || ""}
            onChange={(e) => handleChange("product_title", e.target.value)}
            size="small"
            onBlur={() => handleSave(params.row.id)}
            onKeyPress={(e) => handleKeyPress(e, params.row.id)}
          />
        ) : (
          params.value
        ),
    },
    // Order Id
    {
      field: "order_id",
      headerName: "Order ID",
      width: 130,
      renderCell: (params) =>
        editRowId === params.row.id ? (
          <TextField
            value={editData.order_id || ""}
            onChange={(e) => handleChange("order_id", e.target.value)}
            size="small"
            onBlur={() => handleSave(params.row.id)}
            onKeyPress={(e) => handleKeyPress(e, params.row.id)}
          />
        ) : (
          params.value
        ),
    },
    // Order Date
    {
      field: "order_date",
      headerName: "Dispatched Date",
      width: 150,
      renderCell: (params) =>
        editRowId === params.row.id ? (
          <TextField
            type="date"
            value={editData.order_date?.split("T")[0] || ""}
            onChange={(e) => handleChange("order_date", e.target.value)}
            size="small"
            onBlur={() => handleSave(params.row.id)}
            onKeyPress={(e) => handleKeyPress(e, params.row.id)}
          />
        ) : (
          formatDate(params.value)
        ),
    },
    // Item Condition
    {
      field: "item_condition",
      headerName: "Item Condition",
      width: 150,
      renderCell: (params) =>
        editRowId === params.row.id ? (
          <TextField
            select
            value={editData.item_condition || ""}
            onChange={(e) => handleChange("item_condition", e.target.value)}
            size="small"
            onBlur={() => handleSave(params.row.id)}
          >
            {ITEM_CONDITIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          params.value
        ),
    },
    // Claim Raised
    { 
      field: "claim_raised", 
      headerName: "Claim Raised", 
      width: 120, 
      renderCell: (params) =>
       editRowId === params.row.id ? (
          <TextField
            select
            value={editData.claim_raised || ""}
            onChange={(e) => handleChange("claim_raised", e.target.value)}
            size="small"
            onBlur={() => handleSave(params.row.id)}
            onKeyPress={(e) => handleKeyPress(e, params.row.id)}
            fullWidth
          > 
            <MenuItem value="">-- Select --</MenuItem>
            <MenuItem value="Yes">Yes</MenuItem>
            <MenuItem value="No">No</MenuItem>
          </TextField>
      ) : (
        params.value
      ),
    },
    // Ticket Id
    { 
      field: "ticket_id", 
      headerName: "Ticket ID", 
      width: 130, 
      renderCell: (params) =>
       editRowId === params.row.id ? (
          <TextField
            value={editData.ticket_id || ""}
            onChange={(e) => handleChange("ticket_id", e.target.value)}
            size="small"
            onBlur={() => handleSave(params.row.id)}
            onKeyPress={(e) => handleKeyPress(e, params.row.id)}
          />
      ) : (
        params.value
      ),
    },
    // Comments
    {
      field: "comments",
      headerName: "Comments",
      width: 250,
      renderCell: (params) =>
        editRowId === params.row.id ? (
          <TextField
            value={editData.comments || ""}
            onChange={(e) => handleChange("comments", e.target.value)}
            size="small"
            onBlur={() => handleSave(params.row.id)}
            onKeyPress={(e) => handleKeyPress(e, params.row.id)}
          />
        ) : (
          params.value
        ),
    },
    // Return QTY
    { field: "return_qty", headerName: "Return Qty", width: 120 },
    // Created At
    {
      field: "created_at",
      headerName: "Created At",
      width: 180,
      renderCell: (params) => formatDateTime(params.value),
    },
    // Created By
    { field: "created_by", headerName: "Created By", width: 150 },
    // Actions (Edit & Delete)
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params) =>
        editRowId === params.row.id ? (
          <>
            <IconButton onClick={() => handleSave(params.row.id)}>
              <SaveIcon color="primary" />
            </IconButton>
            <IconButton onClick={handleCancelClick}>
              <CancelIcon color="warning" />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton onClick={() => handleEditClick(params.row)}>
              <EditIcon color="primary" />
            </IconButton>
            <IconButton onClick={() => handleDelete(params.row.id)}>
              <DeleteIcon color="error" />
            </IconButton>
          </>
        ),
    },
  ];

  return (
    <Box sx={{ height: 600, padding: 3 }}>
      {error && <Box sx={{ color: "red", mb: 2 }}>Error: {error}</Box>}
      <DataGrid
        rows={submittedRTOs}
        columns={columns}
        getRowId={(row) => row.id}
        pageSize={10}
        rowsPerPageOptions={[10, 20, 50]}
        disableSelectionOnClick
        loading={loading}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default SubmittedRTOsPage;
