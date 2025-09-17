// import React, { useContext } from "react";
// import { RTOContext } from "../../Context/RTOContext";
// import {
//   Box,
//   Typography,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   Paper,
// } from "@mui/material";

// const SubmittedRTOsPage = () => {
//   const { submittedRTOs } = useContext(RTOContext);

//   return (
//     <Box sx={{ padding: 3 }}>
//       <Typography variant="h4" mb={3}>
//         Submitted RTOs
//       </Typography>

//       {submittedRTOs.length === 0 ? (
//         <Typography>No RTOs submitted yet.</Typography>
//       ) : (
//         <TableContainer component={Paper}>
//           <Table>
//             <TableHead>
//               <TableRow>
//                 <TableCell><strong>SKU Code</strong></TableCell>
//                 <TableCell><strong>Product Title</strong></TableCell>
//                 <TableCell><strong>AWB ID</strong></TableCell>
//                 <TableCell><strong>Order ID</strong></TableCell>
//                 <TableCell><strong>Order Date</strong></TableCell>
//                 <TableCell><strong>Return Date</strong></TableCell>
//                 <TableCell><strong>Delivery Partner</strong></TableCell>
//                 <TableCell><strong>Item Condition</strong></TableCell>
//                 <TableCell><strong>Claim Raised</strong></TableCell>
//                 <TableCell><strong>Ticket ID</strong></TableCell>
//                 <TableCell><strong>Comments</strong></TableCell>
//               </TableRow>
//             </TableHead>
//             <TableBody>
//               {submittedRTOs.map((rto, rtoIndex) =>
//                 rto.fields.map((f, fieldIndex) => (
//                   <TableRow key={`${rtoIndex}-${fieldIndex}`}>
//                     <TableCell>{rto.skuCode}</TableCell>
//                     <TableCell>{rto.productTitle}</TableCell>
//                     <TableCell>{f.awbId || "-"}</TableCell>
//                     <TableCell>{f.orderId || "-"}</TableCell>
//                     <TableCell>
//                       {f.orderDate ? new Date(f.orderDate).toLocaleDateString() : "-"}
//                     </TableCell>
//                     <TableCell>
//                       {f.returnDate ? new Date(f.returnDate).toLocaleDateString() : "-"}
//                     </TableCell>
//                     <TableCell>{f.courier || "-"}</TableCell>
//                     <TableCell>{f.itemCondition || "-"}</TableCell>
//                     <TableCell>{f.claimRaised || "-"}</TableCell>
//                     <TableCell>{f.ticketId || "-"}</TableCell>
//                     <TableCell>{f.comments || "-"}</TableCell>
//                   </TableRow>
//                 ))
//               )}
//             </TableBody>
//           </Table>
//         </TableContainer>
//       )}
//     </Box>
//   );
// };

// export default SubmittedRTOsPage;


import React, { useEffect, useState } from "react";
import axios from "axios";
import { Box, Typography } from "@mui/material";

const SubmittedRTOsPage = () => {
  const [rtoData, setRtoData] = useState([]);

  useEffect(() => {
    axios.get("/api/rto")
      .then(res => setRtoData(res.data.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" mb={3}>
        Submitted RTOs
      </Typography>

      {rtoData.length === 0 ? (
        <Typography>No RTOs submitted yet.</Typography>
      ) : (
        <pre>{JSON.stringify(rtoData, null, 2)}</pre> // temporary debug, later use table
      )}
    </Box>
  );
};

export default SubmittedRTOsPage;
