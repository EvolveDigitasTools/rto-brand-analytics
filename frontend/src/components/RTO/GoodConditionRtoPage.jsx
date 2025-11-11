import React, { useEffect, useState } from "react";
import axios from "axios";
import { Box, Button, Snackbar, Alert, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

const GoodConditionRtoPage = () => {
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const API_URL = process.env.REACT_APP_API_URL;
  const token = localStorage.getItem("token");

  // ✅ Fetch all Good condition RTOs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/rto-good`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success && Array.isArray(res.data.data)) {
          setRows(res.data.data);
        }
      } catch (err) {
        console.error("❌ Error fetching Good RTOs:", err);
        setSnackbar({
          open: true,
          message: "Error loading Good RTOs",
          severity: "error",
        });
      }
    };
    fetchData();
  }, [API_URL, token]);

  // ✅ Calculate effective quantity for PK-based SKUs
  const calculateEffectiveQty = (sku, qty) => {
    const match = sku?.match(/-PK(\d+)$/i);
    const multiplier = match ? parseInt(match[1]) : 1;
    return qty * multiplier;
  };

  // ✅ Handle confirmation and update only selected rows
  const handleConfirm = async () => {
  if (!selectedIds || selectedIds.length === 0) {
    return setSnackbar({
      open: true,
      message: "⚠️ Please select at least one record to update.",
      severity: "warning",
    });
  }

  console.log("📤 Sending selected IDs:", selectedIds);

  try {
    const response = await axios.post(
      `${API_URL}/api/update-from-rto-multiple`,
      { selectedIds }, 
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.success) {
      setSnackbar({
        open: true,
        message: response.data.message,
        severity: "success",
      });

      setTimeout(() => {
        window.location.href = "/inventory-update-history";
      }, 1500);
    } else {
      setSnackbar({
        open: true,
        message: response.data.message || "No records updated",
        severity: "info",
      });
    }
  } catch (err) {
    console.error("❌ Error updating inventory:", err);
    setSnackbar({
      open: true,
      message: "Error updating inventory",
      severity: "error",
    });
  }
};

  const columns = [
    { field: "id", headerName: "S.No", width: 70 },
    { field: "marketplaces", headerName: "Marketplace", width: 120 },
    { field: "pickup_partner", headerName: "Pickup Partner", width: 140 },
    { field: "awb_id", headerName: "AWB ID", width: 150 },
    { field: "return_date", headerName: "Return Date", width: 150 },
    { field: "order_date", headerName: "Dispatched Date", width: 150 },
    { field: "sku_code", headerName: "SKU", width: 160 },
    { field: "product_title", headerName: "Product Title", width: 250 },
    { field: "return_qty", headerName: "Qty", width: 90 },
    {
      field: "effective_qty",
      headerName: "Effective Qty",
      width: 130,
      valueGetter: (params) => {
        const sku = params?.row?.sku_code || "";
        const qty = params?.row?.return_qty || 0;
        return calculateEffectiveQty(sku, qty);
      },
    },
  ];

  return (
    <Box sx={{ height: "600px", padding: 3 }}>
      <Typography variant="h5" gutterBottom>
        Good Condition RTOs (Ready for Inventory Update)
      </Typography>

      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={10}
        rowsPerPageOptions={[10, 20, 50]}
        getRowId={(row) => row.id}
        checkboxSelection
        onRowSelectionModelChange={(newSelection) => {
            console.log("✅ Selected row IDs:", newSelection);
            setSelectedIds(newSelection);
        }}
        selectionModel={selectedIds}
        disableSelectionOnClick
        sx={{
            height: "540px",
            border: "1px solid #ddd",
            backgroundColor: "#fff",
        }}
        />


      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
        <Button
          variant="contained"
          color="success"
          onClick={handleConfirm}
          disabled={selectedIds.length === 0}
        >
          Confirm and Update Inventory
        </Button>
      </Box>

      {/* Snackbar Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GoodConditionRtoPage;
