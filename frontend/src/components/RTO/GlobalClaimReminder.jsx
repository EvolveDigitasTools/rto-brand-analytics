import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";
import { RTOContext } from "../../Context/RTOContext";

const GlobalClaimReminder = () => {
  const API_URL = process.env.REACT_APP_API_URL;
  const { user } = useContext(RTOContext);
  const [pendingRtos, setPendingRtos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [showTicketField, setShowTicketField] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!user?.role || user.role !== "admin") return;

    const fetchPendingNoClaims = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/rto/pending-no-claims`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success && res.data.data.length > 0) {
          const rtos = res.data.data.sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at)
          );
          // Filter: show only those >= 3 days old
          const filtered = rtos.filter(rto => {
            const diff = Math.floor(
              (Date.now() - new Date(rto.created_at)) / (1000 * 60 * 60 * 24)
            );
            return diff >= 3; // show from 3rd day onward
          });

          if (filtered.length > 0) {
            setPendingRtos(filtered);
            setCurrentIndex(0);
            setOpen(true);
          }
        }
      } catch (err) {
        console.error("Error fetching pending claim reminders:", err);
      }
    };

    fetchPendingNoClaims();

    const interval = setInterval(fetchPendingNoClaims, 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, API_URL, token]);

  const handleClose = () => {
    const current = pendingRtos[currentIndex];
    if (!current) return;
    const diffDays = Math.floor(
      (Date.now() - new Date(current.created_at)) / (1000 * 60 * 60 * 24)
    );
    // Allow close only if ≤7 days
    if (diffDays <= 7) setOpen(false);
  };

  const handleNext = () => {
    setShowTicketField(false);
    setTicketId("");
    if (currentIndex < pendingRtos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setOpen(false);
    }
  };

  const handlePrevious = () => {
    setShowTicketField(false);
    setTicketId("");
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  const handleSaveClaim = async () => {
    const current = pendingRtos[currentIndex];
    if (!ticketId.trim()) {
      setSnackbar({ open: true, message: "Ticket ID is required", severity: "error" });
      return;
    }

    try {
      const res = await axios.put(
        `${API_URL}/api/rto/ticket-id/${current.id}`,
        { claim_raised: "Yes", ticket_id: ticketId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setSnackbar({ open: true, message: "Claim updated successfully", severity: "success" });
        setShowTicketField(false);
        setTicketId("");

        // Remove the resolved RTO from the list
        const updatedList = pendingRtos.filter((_, i) => i !== currentIndex);
        setPendingRtos(updatedList);

        if (updatedList.length === 0) {
          setOpen(false);
        } else if (currentIndex >= updatedList.length) {
          setCurrentIndex(updatedList.length - 1);
        }
      }
    } catch (err) {
      console.error("Error updating claim:", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed to update claim",
        severity: "error",
      });
    }
  };

  if (!pendingRtos.length || currentIndex >= pendingRtos.length) return null;

  const current = pendingRtos[currentIndex];
  const diffDays = Math.floor(
    (Date.now() - new Date(current.created_at)) / (1000 * 60 * 60 * 24)
  );

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        disableEscapeKeyDown={diffDays > 7}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            width: 700,
            maxWidth: 700
          }
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: "bold",
            color: diffDays > 7 ? "red" : "orange",
          }}
        >
          ⚠️ Pending Claim Update Required ({currentIndex + 1} of {pendingRtos.length})
        </DialogTitle>

        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            This RTO has <strong>Claim Raised = No</strong> for{" "}
            <strong>{diffDays}</strong> day{diffDays > 1 ? "s" : ""}.
          </Typography>
          <Typography><strong>Marketplace:</strong> {current.marketplaces}</Typography>
          <Typography><strong>Pickup Partner:</strong> {current.pickup_partner}</Typography>          
          <Typography><strong>AWB ID:</strong> {current.awb_id}</Typography>
          <Typography><strong>SKU:</strong> {current.sku_code}</Typography>
          <Typography><strong>Product:</strong> {current.product_title}</Typography>
          <Typography><strong>Created At:</strong> {new Date(current.created_at).toLocaleDateString()}</Typography>

          {showTicketField && (
            <TextField
              fullWidth
              label="Ticket ID (required)"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              sx={{ mt: 3 }}
              required
            />
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: "space-between" }}>
          {currentIndex > 0 && (
            <Button
              variant="contained"
              color="inherit"
              sx={{ width: "150px" }}
              onClick={handlePrevious}
            >
              Previous
            </Button>
          )} 

          {diffDays < 7 && !showTicketField && (
            <Button variant="contained" color="warning" onClick={handleClose}>
              Remind Me Later
            </Button>
          )}         

          {!showTicketField ? (
            <Button
              variant="contained"
              color="primary"
              onClick={() => setShowTicketField(true)}
            >
              Update Claim Now
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              onClick={handleSaveClaim}
            >
              Save Claim Update
            </Button>
          )}

          {currentIndex < pendingRtos.length - 1 && (
            <Button
              variant="contained"
              color="inherit"
              sx={{ width: "150px" }}
              onClick={handleNext}
            >
              Next
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

export default GlobalClaimReminder;
