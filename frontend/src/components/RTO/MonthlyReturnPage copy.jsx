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
  MenuItem,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import { format, parseISO, isValid } from "date-fns";

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = parseISO(dateString);
  if (!isValid(date)) return "-";
  return format(date, "dd MMM yyyy");
};

const MonthlyReturnData = () => {
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [search, setSearch] = useState("");

  // Date filters
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );

  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const token = localStorage.getItem("token");
  const API_URL = process.env.REACT_APP_API_URL;

  // Fetching data with year & month filters
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/api/monthly-rto-data?year=${year}&month=${month}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {
        setRows(res.data.data);
        setFilteredRows(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching Monthly RTO data:", err);
      setSnackbar({
        open: true,
        message: "Error fetching Monthly RTO data",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [year, month]); // auto-refresh on date change

  // Search filter
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
    { field: "marketplaces", headerName: "Marketplace", width: 100 },
    { field: "pickup_partner", headerName: "Pickup Partner", width: 120 },
    { field: "return_date", headerName: "Return Date", width: 100, renderCell: (params) => formatDate(params.value) },
    { field: "sku_code", headerName: "SKU", width: 180 },
    { field: "product_title", headerName: "Title", width: 280 },
    { field: "total_orders", headerName: "Total Orders", width: 100 },
    { field: "total_rto_qty", headerName: "Total RTO Qty", width: 120 },
    { field: "rto_percentage", headerName: "RTO %", width: 70 },    
    { field: "awb_id", headerName: "AWB Id", width: 150 },
    { field: "item_condition", headerName: "Condition", width: 100 },
    { field: "claim_raised", headerName: "Claim Raised", width: 110 },
    { field: "ticket_id", headerName: "Ticket Id", width: 80 },
    // { field: "return_qty", headerName: "Return Qty", width: 100 },
    {
      field: "created_at",
      headerName: "Created At",
      width: 180,
      renderCell: (params) =>
        params.value ? new Date(params.value).toLocaleString() : "-",
    },
    { field: "created_by", headerName: "Created By", width: 160 },
    // { field: "source", headerName: "Source", width: 100 },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        {/* ⭐ Header Section */}
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
            Monthly Return Data ({filteredRows.length})
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* ⭐ Month Filter */}
            <TextField
              select
              size="small"
              label="Month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => {
                const m = String(i + 1).padStart(2, "0");
                return (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                );
              })}
            </TextField>

            {/* ⭐ Year Filter */}
            <TextField
              select
              size="small"
              label="Year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {["2024", "2025", "2026"].map((yr) => (
                <MenuItem key={yr} value={yr}>
                  {yr}
                </MenuItem>
              ))}
            </TextField>

            {/* ⭐ Search */}
            <TextField
              size="small"
              variant="outlined"
              placeholder="Search SKU, AWB, etc..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
            />

            {/* ⭐ Refresh */}
            <Tooltip title="Refresh">
              <IconButton onClick={fetchHistory} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* ⭐ Data Table */}
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

        {/* ⭐ Snackbar */}
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

export default MonthlyReturnData;
