import React, { useEffect, useState } from "react";
import { Box, Snackbar, Alert, IconButton } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";
import { format, parseISO, isValid } from "date-fns";
import DeleteIcon from "@mui/icons-material/Delete";
import RestoreIcon from "@mui/icons-material/Restore";

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = parseISO(dateString);
  if (!isValid(date)) return "-";
  return format(date, "dd MMM yyyy");
};

const formatDateTime = (dateString) => {
  if (!dateString) return "-";
  const date = parseISO(dateString);
  if (!isValid(date)) return "-";
  return format(date, "dd MMM yyyy HH:mm");
};

const DeletedRTOsPage = () => {
  const [deletedRTOs, setDeletedRTOs] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const API_URL = process.env.REACT_APP_API_URL;
  const token = localStorage.getItem("token");

  // Get Deleted Data
  const fetchDeletedRTOs = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/deleted-rtos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setDeletedRTOs(res.data.data);
      }
    } catch (err) {
      console.error("Fetch deleted RTOs error:", err);
      setSnackbar({ open: true, message: "Failed to load deleted RTOs", severity: "error" });
    }
  };

  useEffect(() => {
    fetchDeletedRTOs();
  }, []);

  // Restore Deleted RTO
  const handleRestore = async (id) => {
    try {
      const res = await axios.post(`${API_URL}/api/deleted-rtos/restore/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setSnackbar({ open: true, message: res.data.message, severity: "success" });
        fetchDeletedRTOs();
      }
    } catch (err) {
      console.error("Restore error:", err);
      setSnackbar({ open: true, message: "Failed to restore RTO", severity: "error" });
    }
  };

  // Delete handler
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this RTO permanently?")) return;

    try {
      await axios.delete(`${API_URL}/api/deleted-rtos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSnackbar({ open: true, message: "RTO deleted successfully", severity: "success" });
      // Refresh the table
      fetchDeletedRTOs();
    } catch (err) {
      console.error("Delete error:", err);
      setSnackbar({ open: true, message: "Failed to delete RTO", severity: "error" });
    }
  };

  const columns = [
    { field: "id", headerName: "ID", width: 50 },
    {field: "marketplaces", headerName: "Martketplace", width: 150 },
    { field: "pickup_partner", headerName: "Pickup Partner", width: 150 },    
    { field: "awb_id", headerName: "AWB ID", width: 150 },
    { 
        field: "return_date", 
        headerName: "Return Date", 
        width: 150,
        renderCell: (params) => formatDate(params.value),
    },    
    { field: "sku_code", headerName: "SKU Code", width: 150 },
    { field: "product_title", headerName: "Product Title", width: 250 },
    { field: "order_id", headerName: "Order ID", width: 150 },
    { 
        field: "order_date", 
        headerName: "Dispatched Date", 
        width: 150,
        renderCell: (params) => formatDate(params.value),
    },
    { field: "item_condition", headerName: "Condition", width: 130 },
    { field: "claim_raised", headerName: "Claim Raised", width: 120 },
    { field: "ticket_id", headerName: "Ticket ID", width: 130 },
    { field: "return_qty", headerName: "Return Qty", width: 100 },
    { field: "comments", headerName: "Comments", width: 150 },
    {
        field: "created_at",
        headerName: "Created At",
        width: 180,
        renderCell: (params) => formatDateTime(params.value),
    },
    { field: "created_by", headerName: "Created By", width: 150 },
    {
      field: "deleted_at",
      headerName: "Deleted At",
      width: 180,
      renderCell: (params) => formatDateTime(params.value),
    },
    { field: "deleted_by", headerName: "Deleted By", width: 150 },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      sortable: false,
      filterable: false,
    //   hide: rows.length === 0, // Hide the column when there are no rows
      renderCell: (params) => (
    <>
        <IconButton onClick={() => handleRestore(params.row.id)}>
        <RestoreIcon color="primary" />
        </IconButton>
        <IconButton onClick={() => handleDelete(params.row.id)}>
        <DeleteIcon color="error" />
        </IconButton>
    </>
      ),
    }
  ];

  return (
    <div className="submit_rto_tablee">
    <Box sx={{ height: 600, padding: 3 }}>
      <DataGrid
        rows={deletedRTOs}
        columns={columns}
        getRowId={(row) => row.id}
        pageSize={10}
        rowsPerPageOptions={[10, 20, 50]}
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
    </div>
  );
};

export default DeletedRTOsPage;
