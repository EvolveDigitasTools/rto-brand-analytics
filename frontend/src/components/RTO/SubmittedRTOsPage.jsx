import React, { useContext } from "react";
import { Box } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { RTOContext } from "../../Context/RTOContext";
import { format, parseISO, isValid } from "date-fns";

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = parseISO(dateString);
  if (!isValid(date)) return "-";
  return format(date, "dd MMM yyyy"); // e.g. 02 Sep 2025
};
const formatDateTime = (dateString) => {
  if (!dateString) return "-";
  const date = parseISO(dateString);
  if (!isValid(date)) return "-";
  return format(date, "dd MMM yyyy HH:mm"); // e.g. 17 Sep 2025 10:21
};

const SubmittedRTOsPage = () => {
  const { submittedRTOs, loading, error } = useContext(RTOContext);

  // Log rows for debugging
  console.log("SubmittedRTOs in DataGrid:", submittedRTOs);

  const safeDate = (dateValue) => {
    if (!dateValue || dateValue === "NULL" || dateValue === "") {
      console.log("Invalid dateValue:", dateValue);
      return "-";
    }
    // Log valid date for debugging
    console.log("Valid dateValue:", dateValue);
    return dateValue;
  };

  const columns = [
    { field: "id", headerName: "ID", width: 80 },
    { field: "pickup_partner", headerName: "Pickup Partner", width: 150 },
    { field: "awb_id", headerName: "AWB ID", width: 130 },
    {
      field: "return_date",
      headerName: "Return Date",
      width: 150,
      renderCell: (params) => formatDate(params.value),
    },
    { field: "sku_code", headerName: "SKU Code", width: 150 },
    { field: "product_title", headerName: "Product Title", width: 250 },
    { field: "order_id", headerName: "Order ID", width: 130 },
    {
      field: "order_date",
      headerName: "Dispatched Date",
      width: 150,
      renderCell: (params) => formatDate(params.value),
    },
    { field: "item_condition", headerName: "Item Condition", width: 150 },
    { field: "claim_raised", headerName: "Claim Raised", width: 120 },
    { field: "ticket_id", headerName: "Ticket ID", width: 130 },
    { field: "comments", headerName: "Comments", width: 250 },
    { field: "return_qty", headerName: "Return Qty", width: 120 },
    {
      field: "created_at",
      headerName: "Created At",
      width: 180,
      renderCell: (params) => formatDate(params.value),
    },
  ];

  console.log("SubmittedRTOs in DataGrid:", submittedRTOs);
  submittedRTOs.forEach(row => {
    console.log("Row dates:", {
      order_date: row.order_date,
      return_date: row.return_date,
      created_at: row.created_at,
    });
  });

  return (
    <Box sx={{ height: 600, width: "100%", padding: 3 }}>
      {error && <Box sx={{ color: "red", mb: 2 }}>Error: {error}</Box>}
      <DataGrid
        rows={submittedRTOs}
        columns={columns}
        getRowId={(row) => row.id}
        pageSize={10}
        rowsPerPageOptions={[10, 20, 50]}
        disableSelectionOnClick
        loading={loading}
      />
    </Box>
  );
};

export default SubmittedRTOsPage;