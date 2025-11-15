import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  Paper,
  TextField,
  IconButton,
  Tooltip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";
import { format, parseISO, isValid } from "date-fns";
import DeleteIcon from "@mui/icons-material/Delete";
import RestoreIcon from "@mui/icons-material/Restore";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";

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
  const [filteredRTOs, setFilteredRTOs] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [search, setSearch] = useState("");
  const API_URL = process.env.REACT_APP_API_URL;
  const token = localStorage.getItem("token");

  // ✅ Fetch Deleted Data
  const fetchDeletedRTOs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/deleted-rtos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setDeletedRTOs(res.data.data);
        setFilteredRTOs(res.data.data);
      }
    } catch (err) {
      console.error("Fetch deleted RTOs error:", err);
      setSnackbar({
        open: true,
        message: "Failed to load deleted RTOs",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedRTOs();
  }, []);

  // ✅ Filter search
  useEffect(() => {
    if (!search.trim()) {
      setFilteredRTOs(deletedRTOs);
    } else {
      const q = search.toLowerCase();
      setFilteredRTOs(
        deletedRTOs.filter(
          (r) =>
            r.marketplaces?.toLowerCase().includes(q) ||
            r.sku_code?.toLowerCase().includes(q) ||
            r.awb_id?.toLowerCase().includes(q) ||
            r.product_title?.toLowerCase().includes(q) ||
            r.ticket_id?.toLowerCase().includes(q)
        )
      );
    }
  }, [search, deletedRTOs]);

  // ✅ Restore Deleted RTO
  const handleRestore = async (id) => {
    try {
      const res = await axios.post(
        `${API_URL}/api/deleted-rtos/restore/${id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.data.success) {
        setSnackbar({
          open: true,
          message: res.data.message,
          severity: "success",
        });
        fetchDeletedRTOs();
      }
    } catch (err) {
      console.error("Restore error:", err);
      setSnackbar({
        open: true,
        message: "Failed to restore RTO",
        severity: "error",
      });
    }
  };

  // ✅ Delete handler
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this RTO permanently?"))
      return;

    try {
      await axios.delete(`${API_URL}/api/deleted-rtos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSnackbar({
        open: true,
        message: "RTO deleted successfully",
        severity: "success",
      });
      fetchDeletedRTOs();
    } catch (err) {
      console.error("Delete error:", err);
      setSnackbar({
        open: true,
        message: "Failed to delete RTO",
        severity: "error",
      });
    }
  };

  // ✅ Table Columns
  const columns = [
    {
      field: "sn",
      headerName: "S.N.",
      width: 70,
      renderCell: (params) =>
        params.api.getSortedRowIds
          ? params.api.getSortedRowIds().indexOf(params.id) + 1
          : "-",
    },
    { field: "marketplaces", headerName: "Marketplace", width: 130 },
    { field: "pickup_partner", headerName: "Pickup Partner", width: 150 },
    { field: "awb_id", headerName: "AWB ID", width: 150 },
    {
      field: "return_date",
      headerName: "Return Date",
      width: 150,
      renderCell: (params) => formatDate(params.value),
    },
    { field: "sku_code", headerName: "SKU Code", width: 150 },
    { field: "product_title", headerName: "Product Title", width: 230 },
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
    },
  ];

  // ✅ Return JSX (same look as ResolvedClaimPage)
  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
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
            Deleted RTO Records ({filteredRTOs.length})
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              size="small"
              variant="outlined"
              placeholder="Search by SKU, AWB, Product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
            <Tooltip title="Refresh">
              <IconButton onClick={fetchDeletedRTOs} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

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
        ) : filteredRTOs.length === 0 ? (
          <Typography sx={{ textAlign: "center", py: 5 }}>
            No deleted RTOs found.
          </Typography>
        ) : (
          <div style={{ height: 600, width: "100%" }}>
            <DataGrid
              rows={filteredRTOs}
              columns={columns}
              getRowId={(row) => row.id}
              pageSize={10}
              rowsPerPageOptions={[10, 20, 50]}
              checkboxSelection
              onRowSelectionModelChange={(ids) => setSelectedRows(ids)}
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
      </Paper>

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

export default DeletedRTOsPage;
