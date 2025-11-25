import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { RTOContext } from "../../Context/RTOContext";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";

const PendingClaimsPage = () => {
  const API_URL = process.env.REACT_APP_API_URL;
  const { user } = useContext(RTOContext);
  const [claims, setClaims] = useState([]);
  const [filteredClaims, setFilteredClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRto, setSelectedRto] = useState(null);
  const [ticketId, setTicketId] = useState("");
  const [search, setSearch] = useState("");
  const token = localStorage.getItem("token");

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/rto/pending-claims`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setClaims(res.data.data);
        setFilteredClaims(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching pending claims:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "superadmin") fetchClaims();
  }, [user]);

  // Search Filter
  useEffect(() => {
    if (!search.trim()) {
      setFilteredClaims(claims);
    } else {
      const q = search.toLowerCase();
      setFilteredClaims(
        claims.filter(
          (c) =>
            c.marketplaces?.toLowerCase().includes(q) ||
            c.sku_code?.toLowerCase().includes(q) ||
            c.awb_id?.toLowerCase().includes(q) ||
            c.product_title?.toLowerCase().includes(q) ||
            c.ticket_id?.toLowerCase().includes(q)
        )
      );
    }
  }, [search, claims]);

  // Open Dialog for Mark Resolve
  const handleMarkResolvedClick = (rto) => {
    setSelectedRto(rto);
    setTicketId("");
    setDialogOpen(true);
  };

  // Confirm and Save
  const handleConfirmResolve = async () => {
    if (!ticketId.trim()) {
      setSnackbar({ open: true, message: "Ticket ID is required", severity: "error" });
      return;
    }

    try {
      const res = await axios.put(
        `${API_URL}/api/rto/mark-resolved/${selectedRto.id}`,
        { ticket_id: ticketId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setSnackbar({ open: true, message: "Claim marked as resolved", severity: "success" });
        setClaims((prev) => prev.filter((c) => c.id !== selectedRto.id)); // hide after resolve
        setDialogOpen(false);

        if (window.dispatchEvent) {
          window.dispatchEvent(new Event("refreshRTOs"));
        }
      }
    } catch (err) {
      console.error("Error marking resolved:", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed to resolve claim",
        severity: "error",
      });
    }
  };

  // DataGrid Columns
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
    { field: "marketplaces", headerName: "Marketplace", width: 120 },
    { field: "pickup_partner", headerName: "Pickup Partner", width: 120 },    
    { field: "awb_id", headerName: "AWB ID", width: 150 },
    { field: "sku_code", headerName: "SKU Code", width: 130 },
    { field: "product_title", headerName: "Product", width: 220 },
    { field: "item_condition", headerName: "Condition", width: 130 },
    { field: "ticket_id", headerName: "Ticket ID", width: 130 },
    {
      field: "claim_raised",
      headerName: "Claim Raised",
      width: 120,
      renderCell: (params) => (
        <span
          style={{
            color:
              params.value?.toLowerCase() === "no"
                ? "#a21717ff"
                : params.value?.toLowerCase() === "yes"
                ? "#2e7d32"
                : "#555",
            fontWeight: 600,
          }}
        >
          {params.value || "-"}
        </span>
      ),
    },
    {
      field: "is_claim_resolved",
      headerName: "Status",
      width: 120,
      renderCell: (params) => (
        <span
          style={{
            backgroundColor: params.value ? "#2e7d32" : "#ed6c02",
            color: "#fff",
            padding: "3px 8px",
            borderRadius: "4px",
            fontSize: "0.8rem",
            fontWeight: 500,
          }}
        >
          {params.value ? "Resolved" : "Pending"}
        </span>
      ),
    },
    { field: "created_by", headerName: "Created By", width: 180 },
    {
      field: "created_at",
      headerName: "Created At",
      width: 130,
      renderCell: (params) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 160,
      renderCell: (params) => (
        <Button
          variant="contained"
          color="success"
          size="small"
          onClick={() => handleMarkResolvedClick(params.row)}
        >
          Mark Resolved
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        {/* ✅ Header with Search & Refresh */}
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
            Pending Claim Raised RTOs ({filteredClaims.length})
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
              <IconButton onClick={fetchClaims} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* ✅ Data Table */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
            <CircularProgress />
          </Box>
        ) : filteredClaims.length === 0 ? (
          <Typography sx={{ textAlign: "center", py: 5 }}>
            No pending claims found.
          </Typography>
        ) : (
          <div style={{ height: 600, width: "100%" }}>
            <DataGrid
              rows={filteredClaims}
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

        {/* ✅ Ticket ID Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
          <DialogTitle>Enter Ticket ID</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Ticket ID (required)"
              fullWidth
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} color="warning">
              Cancel
            </Button>
            <Button onClick={handleConfirmResolve} variant="contained" color="primary">
              Confirm & Resolve
            </Button>
          </DialogActions>
        </Dialog>

        {/* ✅ Snackbar Alerts */}
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

export default PendingClaimsPage;
