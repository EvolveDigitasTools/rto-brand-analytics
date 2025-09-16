import React, { useContext } from "react";
import { RTOContext } from "../../Context/RTOContext";
import { Box, Typography, Button } from "@mui/material";

const SubmittedRTOsPage = () => {
  const { submittedRTOs } = useContext(RTOContext);

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" mb={3}>
        Submitted RTOs
      </Typography>

      {submittedRTOs.length === 0 ? (
        <Typography>No RTOs submitted yet.</Typography>
      ) : (
        submittedRTOs.map((rto, index) => (
          <Box key={index} sx={{ mb: 2, p: 2, border: "1px solid #ccc", borderRadius: 2 }}>
            <Typography><strong>SKU:</strong> {rto.skuCode}</Typography>
            <Typography><strong>Title:</strong> {rto.productTitle}</Typography>
            <Typography>
              <strong>Couriers:</strong>{" "}
              {rto.fields.map((f) => `${f.courier} (${f.returnQty})`).join(", ")}
            </Typography>
            <Typography><strong>Date:</strong> {new Date(rto.date).toLocaleString()}</Typography>
          </Box>
        ))
      )}
    </Box>
  );
};

export default SubmittedRTOsPage;
