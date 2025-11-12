import React, { useContext, useState, useEffect, useRef, useMemo } from "react";
import { 
  Dialog, DialogTitle, 
  DialogContent, DialogActions, 
  Button, Typography, Table, 
  TableHead, TableRow, TableCell, 
  TableBody, Box, TextField, 
  IconButton, Snackbar, 
  Alert, MenuItem, CircularProgress 
} from "@mui/material";
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
  return format(date, "dd MMM yyyy");
};

const formatDateTime = (dateString) => {
  if (!dateString) return "-";
  const date = parseISO(dateString);
  if (!isValid(date)) return "-";
  return format(date, "dd MMM yyyy HH:mm");
};

const SubmittedRTOsPage = () => {
  const { 
    submittedRTOs, 
    setSubmittedRTOs, 
    loading, error, 
    fetchSubmittedRTOs, 
    isAuthenticated, 
    setIsAuthenticated 
  } = useContext(RTOContext);
  const [editRowId, setEditRowId] = useState(null);
  const [editData, setEditData] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [openPopup, setOpenPopup] = useState(false);
  const [selectedRowsData, setSelectedRowsData] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [isPolling, setIsPolling] = useState(false);
  const prevRTOsRef = useRef(submittedRTOs);
  const API_URL = process.env.REACT_APP_API_URL;
  const token = localStorage.getItem("token");

  const user = useMemo(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : {};
    } catch (err) {
      console.error("Failed to parse user from localStorage:", err);
      return {};
    }
  }, []);

  const userRole = user.role || localStorage.getItem("role") || "user";
  // console.log("User role:", userRole);

// Silent polling every 10 seconds for all authenticated users
  useEffect(() => {
    if (!isAuthenticated || !token) {
      // console.warn("Polling skipped: not authenticated or no token", { isAuthenticated, token });
      return;
    }

    // console.log("Polling started for user:", user.email, "Role:", userRole, "API_URL:", API_URL);
    const interval = setInterval(async () => {
      setIsPolling(true);
      let retries = 3;
      while (retries > 0) {
        try {
          const res = await axios.get(`${API_URL}/api/rto`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000,
          });
          // console.log("Polling response:", res.data);
          if (res.data.success && Array.isArray(res.data.data)) {
            const newRows = res.data.data.filter(
              (row) => row && typeof row === "object" && row.hasOwnProperty("id")
            );
            const newIds = newRows.map(row => row.id).sort();
            const prevIds = prevRTOsRef.current.map(row => row.id).sort();
            if (newRows.length !== prevRTOsRef.current.length || JSON.stringify(newIds) !== JSON.stringify(prevIds)) {
              // console.log("Updating RTO data:", newRows.length, "rows");
              setSubmittedRTOs(newRows);
              prevRTOsRef.current = newRows;
            } else {
              console.log("No new data to update");
            }
            break;
          } else {
            // console.warn("Invalid polling response:", res.data);
            retries--;
          }
        } catch (err) {
          // console.error("Polling error:", {
          //   message: err.message,
          //   code: err.code,
          //   status: err.response?.status,
          //   data: err.response?.data,
          //   url: `${API_URL}/api/rto`,
          // });
          if (err.response?.status === 401) {
            setIsAuthenticated(false);
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            localStorage.removeItem("isAuthenticated");
            break;
          } else if (err.response?.status === 403) {
            // console.warn("Polling forbidden for user role:", userRole);
            break;
          }
          retries--;
          if (retries === 0) {
            // console.error("Polling failed after retries");
          } else {
            // console.log(`Retrying polling (${retries} attempts left)...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      setIsPolling(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [isAuthenticated, token, setSubmittedRTOs, setIsAuthenticated]);

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
      // 1️⃣ Find record to archive before deletion
      const recordToDelete = submittedRTOs.find((rto) => rto.id === id);
      if (!recordToDelete) {
        setSnackbar({ open: true, message: "Record not found", severity: "error" });
        return;
      }

      // 2️⃣ Send record to backend 'deleted_rtos' table
      await axios.post(`${API_URL}/api/deleted-rtos`, recordToDelete, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 3️⃣ Delete from main RTO table
      await axios.delete(`${API_URL}/api/rto/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      fetchSubmittedRTOs();
      setSnackbar({ open: true, message: "RTO deleted & archived successfully", severity: "success" });
    } catch (err) {
      console.error("Delete error:", err);
      setSnackbar({ open: true, message: "Failed to delete record", severity: "error" });
    }
  };

  const handleKeyPress = (e, id) => {
    if (e.key === "Enter") handleSave(id);
  };

  const handleClosePopup = (resetSelection = false) => {
    setOpenPopup(false);

    if (resetSelection) {
      setSelectedRows([]);
    }
  };

  const columns = [
    // { field: "id", headerName: "ID", width: 70 }, // Id same as DB
    {
      field: "serialNo",
      headerName: "S.No.",
      width: 70,
      renderCell: (params) => {
        const apiRef = params.api;
        const pagination = apiRef.state.pagination;
        const page = Number(pagination.paginationModel?.page ?? pagination.page ?? 0);
        const pageSize = Number(pagination.paginationModel?.pageSize ?? pagination.pageSize ?? 10);
        const sortedRowIds = apiRef.getSortedRowIds() || [];
        const totalRows = sortedRowIds.length;
        const rowIndex = sortedRowIds.indexOf(params.id);
        // console.log("SerialNo Debug:", { page, pageSize, rowIndex, id: params.id, totalRows, sortedRowIds });
        if (isNaN(page) || isNaN(pageSize) || rowIndex === -1 || isNaN(totalRows)) {
          // console.warn("Invalid serial number calculation:", { page, pageSize, rowIndex, totalRows });
          return "-";
        }
        return totalRows - (page * pageSize + rowIndex);
      },
    },
    { field: "marketplaces", headerName: "Marketplace", width: 120 },
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
      width: 100,
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
  <div className="submit_rto_tablee">
      <Box sx={{ height: 575, padding: 3 }}>
        {error && <Box sx={{ color: "red", mb: 2 }}>Error: {error}</Box>}
        <DataGrid
          rows={submittedRTOs}
          columns={columns}
          getRowId={(row) => row.id}
          pageSize={10}
          rowsPerPageOptions={[10, 20, 50]}
          disableSelectionOnClick
          checkboxSelection={["admin", "superadmin"].includes(userRole)}
          loading={loading && !isPolling}
          // onRowSelectionModelChange={(ids) => setSelectedRows(ids)}
          onRowSelectionModelChange={(selection) => {
            if (!["admin", "superadmin"].includes(userRole)) return;
              setSelectedRows(Array.from(selection.ids || []))}
          }

          onRowDoubleClick={(params) => {
            setEditRowId(params.row.id);
            setEditData({ ...params.row });
          }}
        />
        
        {/* Update Inventory Button */}
        {["admin", "superadmin"].includes(userRole) && (
        <Button
          variant="contained"
          color="primary"
          disabled={updating}
          startIcon={updating && <CircularProgress size={18} color="inherit" />}
          onClick={() => {
            if (selectedRows.length === 0) {
              // ✅ Select only rows with good condition
              const goodRows = submittedRTOs.filter(
                r => r.item_condition === "Good" || r["Item Condition"] === "Good"
              );
              const goodRowIds = goodRows.map(r => r.id);

              if (goodRowIds.length === 0) {
                setSnackbar({
                  open: true,
                  message: "No 'Good' condition records available for update.",
                  severity: "warning",
                });
                return;
              }

              setSelectedRows(goodRowIds);
              setSnackbar({
                open: true,
                message: `Selected ${goodRowIds.length} 'Good' condition records for update.`,
                severity: "info",
              });

              // Continue to popup after short delay
              setTimeout(() => {
                setSelectedRowsData(goodRows);
                setOpenPopup(true);
              }, 100);

              return;
            }

            // ✅ Normal flow for existing selection
            const rowsData = submittedRTOs.filter(r => selectedRows.includes(r.id));
            setSelectedRowsData(rowsData);
            setOpenPopup(true);
          }}
          sx={{ mt: 2 }}
        >
          {selectedRows.length === 0
            ? "Select Good Condition for Update"
            : `Update Inventory (${selectedRows.length})`}
        </Button>
        )}


        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
        </Snackbar>

        <Dialog 
          open={openPopup} 
          onClose={() => handleClosePopup(true)} 
          maxWidth="lg" 
          fullWidth
          
        >
          <DialogTitle>Confirm Inventory Update</DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 1 }}>
              You are about to update inventory for <strong>{selectedRowsData.length}</strong> item(s).
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Please confirm the selected RTOs below before updating inventory.
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>S.N.</TableCell>
                  <TableCell>Marketplace</TableCell>
                  <TableCell>Pickup Partner</TableCell>
                  <TableCell>AWB ID</TableCell>
                  <TableCell>SKU Code</TableCell>
                  <TableCell>Product Title</TableCell>
                  <TableCell>Return Qty</TableCell>
                  <TableCell>Condition</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedRowsData.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{row.marketplaces}</TableCell>
                    <TableCell>{row.pickup_partner}</TableCell>
                    <TableCell>{row.awb_id}</TableCell>
                    <TableCell>{row.sku_code}</TableCell>
                    <TableCell>{row.product_title}</TableCell>
                    <TableCell>{row.return_qty}</TableCell>
                    <TableCell>{row.item_condition}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => handleClosePopup(true)} disabled={updating}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={updating}
              startIcon={updating && <CircularProgress size={18} color="inherit" />}
              onClick={async () => {
                setUpdating(true);
                try {
                  const res = await axios.post(
                    `${API_URL}/api/update-from-rto-multiple`,
                    { selectedIds: selectedRows },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );

                  setSnackbar({
                    open: true,
                    message: res.data.message || "Inventory updated successfully",
                    severity: "success",
                  });

                  setSubmittedRTOs(prev => prev.filter(r => !selectedRows.includes(r.id)));

                  setOpenPopup(false);
                  fetchSubmittedRTOs();
                } catch (err) {
                  console.error("Inventory update error:", err);
                  setSnackbar({
                    open: true,
                    message: err.response?.data?.message || "Failed to update inventory",
                    severity: "error",
                  });
                } finally {
                  setUpdating(false);
                }
              }}
            >
              {updating ? "Processing..." : "Confirm Update"}
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
  </div>
  );
};

export default SubmittedRTOsPage;