import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";

const InventoryUpdateHistory = () => {
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const API_URL = process.env.REACT_APP_API_URL;

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/inventory-updates`);
      if (res.data.success) {
        setRows(res.data.data);
        setFilteredRows(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching inventory history:", err);
      setSnackbar({
        open: true,
        message: "Error fetching inventory update history",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // ✅ Search filter
  useEffect(() => {
    if (!search.trim()) {
      setFilteredRows(rows);
    } else {
      const q = search.toLowerCase();
      setFilteredRows(
        rows.filter(
          (r) =>
            r.sku?.toLowerCase().includes(q) ||
            r.sku_title?.toLowerCase().includes(q) ||
            r.awb_number?.toLowerCase().includes(q) ||
            r.order_number?.toLowerCase().includes(q) ||
            r.processed_by?.toLowerCase().includes(q) ||
            r.source?.toLowerCase().includes(q)
        )
      );
    }
  }, [search, rows]);

  const columns = [
    {
      field: "sn",
      headerName: "S.No",
      width: 70,
      renderCell: (params) => {
        const api = params.api;
        const sortedRowIds = api.getSortedRowIds ? api.getSortedRowIds() : [];
        if (!sortedRowIds.length) return "-";
        const rowIndex = sortedRowIds.indexOf(params.id);
        if (rowIndex === -1) return "-";
        const page = api.state.pagination.paginationModel.page;
        const pageSize = api.state.pagination.paginationModel.pageSize;
        if (isNaN(page) || isNaN(pageSize)) return "-";
        const totalRows = sortedRowIds.length;
        return totalRows - (page * pageSize + rowIndex);
      },
    },
    { field: "sku", headerName: "SKU", width: 150 },
    { field: "sku_title", headerName: "Title", width: 280 },
    { field: "effectiveQty", headerName: "Added Qty", width: 100 },
    { field: "return_qty", headerName: "Return Qty", width: 100 },
    { field: "awb_number", headerName: "AWB Number", width: 160 },
    { field: "order_number", headerName: "Order Number", width: 160 },
    { field: "processed_by", headerName: "Processed By", width: 160 },
    { field: "source", headerName: "Source", width: 100 },
    {
      field: "updatedAt",
      headerName: "Updated At",
      width: 180,
      renderCell: (params) =>
        params.value ? new Date(params.value).toLocaleString() : "-",
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        {/* ✅ Header Section */}
        <Box
          sx={{
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Typography variant="h5" fontWeight={600}>
            Inventory Update History ({filteredRows.length})
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              size="small"
              variant="outlined"
              placeholder="Search by SKU, AWB, or Processed By..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
            <Tooltip title="Refresh">
              <IconButton onClick={fetchHistory} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* ✅ Data Table */}
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "300px",
            }}
          >
            <CircularProgress />
          </Box>
        ) : filteredRows.length === 0 ? (
          <Typography sx={{ textAlign: "center", py: 5 }}>
            No inventory updates found.
          </Typography>
        ) : (
          <div style={{ height: 600, width: "100%" }}>
            <DataGrid
              rows={filteredRows}
              columns={columns}
              getRowId={(row) => row.id}
              pageSize={10}
              rowsPerPageOptions={[10, 20, 50]}
              disableSelectionOnClick
              sx={{
                backgroundColor: "#fff",
                borderRadius: 2,
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: "#1976d2",
                  color: "#000000ff",
                  fontWeight: "bold",
                },
                "& .MuiDataGrid-row:hover": {
                  backgroundColor: "#f5f5f5",
                },
              }}
            />
          </div>
        )}

        {/* ✅ Snackbar Notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
};

export default InventoryUpdateHistory;
