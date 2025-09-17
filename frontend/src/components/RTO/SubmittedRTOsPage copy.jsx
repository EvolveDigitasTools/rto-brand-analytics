import React, { useContext } from "react";
import { Box } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { parseISO, parse, format } from "date-fns";
import { RTOContext } from "../../Context/RTOContext"; // Adjust path as needed

const SubmittedRTOsPage = () => {
  const { submittedRTOs, loading, error } = useContext(RTOContext);

  const safeDate = (dateValue) => {
    console.log("Raw date value:", dateValue); // Log for debugging
    if (!dateValue || dateValue === "0000-00-00" || dateValue === "0000-00-00 00:00:00") {
      return "-";
    }
    try {
      let date;
      // Try ISO 8601 first
      date = parseISO(dateValue);
      if (isNaN(date.getTime())) {
        // Try MySQL DATETIME format
        date = parse(dateValue, "yyyy-MM-dd HH:mm:ss", new Date());
      }
      if (isNaN(date.getTime())) {
        // Try DATE format
        date = parse(dateValue, "yyyy-MM-dd", new Date());
      }
      if (isNaN(date.getTime())) {
        console.warn("Invalid date parsed:", dateValue);
        return "-";
      }
      return format(date, "dd-MMM-yyyy HH:mm");
    } catch (err) {
      console.error("Date parse error:", dateValue, err);
      return "-";
    }
  };

  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "pickup_partner", headerName: "Pickup Partner", width: 150 },
    { field: "sku_code", headerName: "SKU Code", width: 150 },
    { field: "product_title", headerName: "Product Title", width: 300 },
    { field: "awb_id", headerName: "AWB ID", width: 130 },
    { field: "order_id", headerName: "Order ID", width: 130 },
    {
      field: "order_date",
      headerName: "Order Date",
      width: 130,
      valueGetter: (params) => (!params || !params.row ? "-" : safeDate(params.row.order_date)),
    },
    {
      field: "return_date",
      headerName: "Return Date",
      width: 130,
      valueGetter: (params) => (!params || !params.row ? "-" : safeDate(params.row.return_date)),
    },
    { field: "item_condition", headerName: "Item Condition", width: 130 },
    { field: "claim_raised", headerName: "Claim Raised", width: 120 },
    { field: "ticket_id", headerName: "Ticket ID", width: 120 },
    { field: "comments", headerName: "Comments", width: 250 },
    { field: "return_qty", headerName: "Return Qty", width: 100 },
    {
      field: "created_at",
      headerName: "Created At",
      width: 180,
      valueGetter: (params) => (!params || !params.row ? "-" : safeDate(params.row.created_at)),
    },
  ];

  return (
    <Box sx={{ height: 600, width: "100%", padding: 3 }}>
      {error && (
        <Box sx={{ color: "red", mb: 2 }}>
          Error: {error}
        </Box>
      )}
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