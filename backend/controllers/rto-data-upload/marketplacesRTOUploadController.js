import { uploadMeeshoSSE } from "./meeshoRtoUploadController.js";
import { uploadAmazonSSE } from "./amazonRtoUploadController.js";
import { uploadFlipkartSSE } from "./flipkartRtoUploadController.js";

export const uploadRtoSSE = (req, res) => {
  const { source } = req.query;

  switch (source?.toLowerCase()) {
    case "meesho":
      return uploadMeeshoSSE(req, res);
    case "amazon":
      return uploadAmazonSSE(req, res);
    case "flipkart":
      return uploadFlipkartSSE(req, res);
    default:
      return res.status(400).json({ error: "Invalid marketplace source" });
  }
};
