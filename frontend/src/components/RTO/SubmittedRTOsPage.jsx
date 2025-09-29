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
  return format(date, "yyyy-MM-dd");
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
  let user = {};
  try {
    const storedUser = localStorage.getItem("user");
    user = storedUser ? JSON.parse(storedUser) : {};
  } catch (err) {
    console.error("Failed to parse user from localStorage:", err);
    user = {};
  }
  const userRole = user.role || localStorage.getItem("role") || "user";
  console.log("User role:", userRole);

  const handleEditClick = (row) => {
    setEditRowId(row.id);
    setEditData({ ...row });
  };

  const handleCancelClick = () => {
    setEditRowId(null);
    setEditData({});
  };

  const handleChange = (key, value) => {
    // Trim text-based fields to prevent whitespace issues
    const trimmedValue = ["awb_id", "sku_code", "product_title", "order_id", "ticket_id", "comments"].includes(key)
      ? value.trim()
      : value;
    setEditData((prev) => ({ ...prev, [key]: trimmedValue }));
  };

  const handleSave = async (id) => {
    if (!token) return alert("Not logged in");

    // Validate awb_id
    if (!editData.awb_id || editData.awb_id.trim() === "") {
      setSnackbar({
        open: true,
        message: "AWB ID is required",
        severity: "error",
      });
      return;
    }

    // Validate claim_raised and ticket_id
    if (editData.item_condition === "Good") {
      editData.claim_raised = null;
      editData.ticket_id = null;
    } else {
      if (!editData.claim_raised || !editData.ticket_id) {
        setSnackbar({
          open: true,
          message: "Claim Raised and Ticket ID are required when condition is not good",
          severity: "error",
        });
        return;
      }
    }

    const payload = {
      ...editData,
      return_date: editData.return_date ? editData.return_date.split("T")[0] : null,
      order_date: editData.order_date ? editData.order_date.split("T")[0] : null,
    };

    console.log("Payload sent to backend:", payload);
    console.log("AWB ID in payload:", payload.awb_id);

    try {
      const response = await axios.put(`${API_URL}/api/rto/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Backend response:", response.data);
      fetchSubmittedRTOs();
      setEditRowId(null);
      setEditData({});
      setSnackbar({ open: true, message: "RTO updated successfully", severity: "success" });
    } catch (err) {
      console.error("Update error:", err.response?.data, err.response?.status);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed to update record",
        severity: "error",
      });
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
            onKeyPress={(e) => handleKeyPress(e, params.row.id)}
            fullWidth
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
    {
      field: "awb_id",
      headerName: "AWB ID",
      width: 130,
      renderCell: (params) =>
        editRowId === params.row.id ? (
          <TextField
            value={editData.awb_id || ""}
            onChange={(e) => handleChange("awb_id", e.target.value)}
            size="small"
            onBlur={() => handleSave(params.row.id)}
            onKeyPress={(e) => handleKeyPress(e, params.row.id)}
            fullWidth
          />
        ) : (
          params.value
        ),
    },
    {
      field: "return_date",
      headerName: "Return Date",
      width: 150,
      renderCell: (params) => formatDate(params.value),
    },
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
            fullWidth
          />
        ) : (
          params.value
        ),
    },
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
            fullWidth
          />
        ) : (
          params.value
        ),
    },
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
            fullWidth
          />
        ) : (
          params.value
        ),
    },
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
            fullWidth
          />
        ) : (
          formatDate(params.value)
        ),
    },
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
            onKeyPress={(e) => handleKeyPress(e, params.row.id)}
            fullWidth
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
            fullWidth
          />
        ) : (
          params.value
        ),
    },
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
            fullWidth
          />
        ) : (
          params.value
        ),
    },
    { field: "return_qty", headerName: "Return Qty", width: 120 },
    {
      field: "created_at",
      headerName: "Created At",
      width: 180,
      renderCell: (params) => formatDateTime(params.value),
    },
    { field: "created_by", headerName: "Created By", width: 150 },
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
            {["admin", "superadmin"].includes(userRole) && (
              <IconButton onClick={() => handleDelete(params.row.id)}>
                <DeleteIcon color="error" />
              </IconButton>
            )}
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
        onRowDoubleClick={(params) => {
          setEditRowId(params.row.id);
          setEditData({ ...params.row });
        }}
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