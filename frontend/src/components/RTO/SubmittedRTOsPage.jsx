import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";

const SubmittedRTOsPage = () => {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const fetchRTOs = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/rto");
        console.log("Fetched RTOs:", res.data);
        if (res.data.success && Array.isArray(res.data.data)) {
          setRows(res.data.data);
        } else {
          setRows([]);
        }
      } catch (err) {
        console.error("Error fetching RTOs:", err);
        setRows([]);
      }
    };

    fetchRTOs();
  }, []);

  const safeDate = (dateValue) => {
  if (!dateValue) return "-";
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false, // optional: use 24h format
    });
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
      valueGetter: (params) => safeDate(params?.row?.order_date),
    },
    {
      field: "return_date",
      headerName: "Return Date",
      width: 130,
      valueGetter: (params) => safeDate(params?.row?.return_date),
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
      valueGetter: (params) => safeDate(params?.row?.created_at),
    },
  ];

  return (
    <Box sx={{ height: 600, width: "100%", padding: 3 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        pageSize={10}
        rowsPerPageOptions={[10, 20, 50]}
        disableSelectionOnClick
      />
    </Box>
  );
};

export default SubmittedRTOsPage;
