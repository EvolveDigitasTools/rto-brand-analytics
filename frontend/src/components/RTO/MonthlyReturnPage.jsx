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
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";

const MonthlyReturnData = () => {
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [search, setSearch] = useState("");
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

  const [detailRows, setDetailRows] = useState([]);
  const [detailColumns, setDetailColumns] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [popupLoading, setPopupLoading] = useState(false);

  const token = localStorage.getItem("token");
  const API_URL = process.env.REACT_APP_API_URL;

  // Fetch API
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/api/monthly-rto-data?year=${year}&month=${month}`,
        { headers: { Authorization: `Bearer ${token}` } }
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
  }, [year, month]);

  // Search Filter
  useEffect(() => {
    if (!search.trim()) return setFilteredRows(rows);

    const q = search.toLowerCase();
    setFilteredRows(
      rows.filter(
        (r) =>
          r.sku_code?.toLowerCase().includes(q) ||
          r.product_title?.toLowerCase().includes(q) ||
          r.total_orders?.toString().includes(q)
      )
    );
  }, [search, rows]);

  // Table Columns
  const columns = [
    // {
    //   field: "sn",
    //   headerName: "S.No",
    //   width: 70,
    //   renderCell: (params) => {
    //     const api = params.api;
    //     const sortedRowIds = api.getSortedRowIds ? api.getSortedRowIds() : [];
    //     const rowIndex = sortedRowIds.indexOf(params.id);
    //     const page = api.state.pagination.paginationModel.page;
    //     const pageSize = api.state.pagination.paginationModel.pageSize;
    //     return sortedRowIds.length - (page * pageSize + rowIndex);
    //   },
    // },
    {
      field: "sn",
      headerName: "S.No",
      width: 70,
      renderCell: (params) => {
        const api = params.api;
        const sortedRowIds = api.getSortedRowIds ? api.getSortedRowIds() : [];
        const rowIndex = sortedRowIds.indexOf(params.id);

        return rowIndex + 1;
      },
    },
    { field: "sku_code", headerName: "SKU Code", width: 250 },
    { field: "product_title", headerName: "Title", width: 380 },
    { field: "total_orders", headerName: "Total Orders", width: 120 },
    { field: "total_rto_qty", headerName: "Total Return Qty", width: 150 },
    { field: "rto_percentage", headerName: "RTO %", width: 80 },
    {
      field: "created_at",
      headerName: "Created At",
      width: 160,
      renderCell: (params) =>
        params.value ? new Date(params.value).toLocaleString() : "-",
    },
    { field: "created_by", headerName: "Created By", width: 130 },
  ];

  // Row Click → Show Popup
  const handleRowClick = async (params) => {
    const row = params.row;

    // Open popup instantly
    setPopupLoading(true);
    setOpenDialog(true);
    setDetailRows([]);
    setDetailColumns([]);

    try {
      const res = await axios.get(
        `${API_URL}/api/monthly-rto-breakdown?sku=${row.sku_code}&year=${year}&month=${month}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const breakdown = res.data.data || [];

      let badConditionExists = false;

      const breakdownWithSN = breakdown.map((item, i) => {
        if (
          item.damaged > 0 ||
          item.missing > 0 ||
          item.wrong_return > 0 ||
          item.used > 0
        ) {
          badConditionExists = true;
        }
        return { id: i + 1, sn: i + 1, ...item };
      });

      const dynamic = [
        { field: "sn", headerName: "S.N.", width: 70 },
        { field: "marketplaces", headerName: "Marketplace", width: 120 },
        { field: "pickup_partner", headerName: "Pickup Partner", width: 120 },
        { field: "sku_code", headerName: "SKU", width: 300 },
        { field: "total_rto_qty", headerName: "RTO Qty", width: 120 },
      ];

      const conditionFields = [
        { key: "good", label: "Good" },
        { key: "damaged", label: "Damaged" },
        { key: "missing", label: "Missing" },
        { key: "wrong_return", label: "Wrong Return" },
        { key: "used", label: "Used" },
      ];

      for (const c of conditionFields) {
        if (breakdown.some((b) => b[c.key] > 0)) {
          dynamic.push({
            field: c.key,
            headerName: c.label,
            width: 120,
          });
        }
      }

      if (badConditionExists) {
        dynamic.push({
          field: "ticket_id",
          headerName: "Ticket ID",
          width: 150,
        });
      }

      // Set data AFTER API returns
      setDetailRows(breakdownWithSN);
      setDetailColumns(dynamic);
    } catch (err) {
      console.error("Breakdown fetch error:", err);
    }

    setPopupLoading(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        {/* Header */}
        <Box
          sx={{
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Typography variant="h5" fontWeight={600}>
            Monthly Return Data ({filteredRows.length})
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              select
              size="small"
              label="Month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <MenuItem key={i} value={String(i + 1).padStart(2, "0")}>
                  {String(i + 1).padStart(2, "0")}
                </MenuItem>
              ))}
            </TextField>

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

            <TextField
              size="small"
              placeholder="Search SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1 }} /> }}
            />

            <Tooltip title="Refresh">
              <IconButton onClick={fetchHistory} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Table */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", height: 300 }}>
            <CircularProgress />
          </Box>
        ) : (
          <div style={{ height: 600, width: "100%" }}>
            <DataGrid
              rows={filteredRows}
              columns={columns}
              getRowId={(r) => r.id}
              pageSize={10}
              rowsPerPageOptions={[10, 20, 50]}
              disableSelectionOnClick
              onRowClick={handleRowClick}
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
                  ":hover": { cursor: "pointer" },
                },
              }}
            />
          </div>
        )}

        {/* Popup Dialog */}
        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle sx={{ m: 0, p: 2, fontWeight: "600" }}>
            Detailed Information
            <IconButton
              aria-label="close"
              onClick={() => setOpenDialog(false)}
              sx={{
                position: "absolute",
                right: 8,
                top: 8,
                backgroundColor: "#cd0826",
                color: "#fff",
                "&:hover": {
                  backgroundColor: "#000",
                  color: "#fff",
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers>
            <div style={{ height: 350, width: "100%" }}>
              {popupLoading ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : detailRows.length > 0 ? (
                <DataGrid
                  rows={detailRows}
                  columns={detailColumns}
                  hideFooter
                  getRowId={(r) => r.id}
                  sx={{
                    borderRadius: 2,
                    "& .MuiDataGrid-columnHeaders": {
                      backgroundColor: "#f1f1f1",
                      fontWeight: 600,
                    },
                  }}
                />
              ) : (
                <Typography>No detailed data found.</Typography>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Snackbar */}
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
