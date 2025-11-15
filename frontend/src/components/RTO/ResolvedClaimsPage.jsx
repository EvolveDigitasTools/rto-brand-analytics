import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
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
import { RTOContext } from "../../Context/RTOContext";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";

const ResolvedClaimsPage = () => {
  const API_URL = process.env.REACT_APP_API_URL;
  const { user } = useContext(RTOContext);
  const [claims, setClaims] = useState([]);
  const [filteredClaims, setFilteredClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [search, setSearch] = useState("");
  const token = localStorage.getItem("token");

  const fetchResolvedClaims = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/rto/resolved-claims`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setClaims(res.data.data);
        setFilteredClaims(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching resolved claims:", err);
      setSnackbar({
        open: true,
        message: "Error fetching resolved claims",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "superadmin") fetchResolvedClaims();
  }, [user]);

  // Filter Search
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
    { field: "awb_id", headerName: "AWB ID", width: 150 },
    { field: "sku_code", headerName: "SKU Code", width: 150 },
    { field: "product_title", headerName: "Product", width: 230 },
    { field: "item_condition", headerName: "Condition", width: 130 },
    { field: "ticket_id", headerName: "Ticket ID", width: 130 },
    {
      field: "claim_raised",
      headerName: "Claim Raised",
      width: 130,
      renderCell: (params) => (
        <span
          style={{
            backgroundColor:
              params.value?.toLowerCase() === "no" ? "#a21717ff" : "#2e7d32",
            color: "#fff",
            padding: "3px 8px",
            borderRadius: "4px",
            fontSize: "0.8rem",
            fontWeight: 500,
          }}
        >
          {params.value || "-"}
        </span>
      ),
    },
    { field: "resolved_by", headerName: "Resolved By", width: 150 },
    {
      field: "resolved_at",
      headerName: "Resolved At",
      width: 150,
      renderCell: (params) =>
        params.value ? new Date(params.value).toLocaleDateString() : "-",
    },
  ];

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
            Resolved Claim Raised RTOs ({filteredClaims.length})
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
              <IconButton onClick={fetchResolvedClaims} color="primary">
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
        ) : filteredClaims.length === 0 ? (
          <Typography sx={{ textAlign: "center", py: 5 }}>
            No resolved claims found.
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

export default ResolvedClaimsPage;
