import React, { useEffect, useState } from "react";
import axios from "axios";
import { Box, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

const InventoryUpdateHistory = () => {
  const [rows, setRows] = useState([]);
  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/inventory-updates`);
        setRows(res.data.data);
      } catch (err) {
        console.error("Error fetching inventory history:", err);
      }
    };
    fetchHistory();
  }, [API_URL]);

  const columns = [
    { field: "id", headerName: "S.No", width: 70 },
    { field: "sku", headerName: "SKU", width: 150 },
    { field: "effectiveQty", headerName: "Added Qty", width: 120 },
    { field: "awb_number", headerName: "AWB Number", width: 160 },
    { field: "source", headerName: "Source", width: 120 },
    { field: "updatedAt", headerName: "Updated At", width: 200 },
  ];

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h5" gutterBottom>
        Inventory Update History
      </Typography>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={10}
        getRowId={(row) => row.id}
        autoHeight
      />
    </Box>
  );
};

export default InventoryUpdateHistory;
