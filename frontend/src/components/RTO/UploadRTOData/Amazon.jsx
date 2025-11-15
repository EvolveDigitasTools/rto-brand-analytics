import React, { useState } from "react";

const Amazon = () => {
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState([]);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progressKnown, setProgressKnown] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [stats, setStats] = useState({ processed: 0, inserted: 0, duplicates: 0 });
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const API_URL = process.env.REACT_APP_API_URL;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setSuccess(false);
    setErrorMsg("");
    setProgress(0);
    setStatusMsg("");
    setFileData([]);

    const isCSV = /\.csv$/i.test(selectedFile.name);
    if (isCSV) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const rows = text
          .split(/\r?\n/)
          .filter((r) => r.trim().length)
          .map((row) => row.split(","));
        setFileData(rows);
      };
      reader.readAsText(selectedFile);
    }
  };

  const parseSSE = (buffer) => {
    const events = [];
    const blocks = buffer.split("\n\n");
    for (const block of blocks) {
      if (!block.trim()) continue;
      const lines = block.split("\n");
      let eventName = "message";
      let dataRaw = "";
      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventName = line.replace("event:", "").trim();
        } else if (line.startsWith("data:")) {
          const d = line.replace("data:", "").trim();
          dataRaw += d;
        }
      }
      if (dataRaw) {
        try {
          const data = JSON.parse(dataRaw);
          events.push({ event: eventName, data });
        } catch {
          // ignore parse errors
        }
      }
    }
    return events;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      alert("Please select a file first.");
      return;
    }

    setUploading(true);
    setSuccess(false);
    setErrorMsg("");
    setStatusMsg("Uploading...");
    setProgressKnown(false);
    setProgress(0);
    setStats({ processed: 0, inserted: 0, duplicates: 0 });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/api/rto-upload?source=amazon`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok || !response.body) {
        throw new Error("Upload failed to start.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });

        const lastSep = buf.lastIndexOf("\n\n");
        if (lastSep === -1) continue;

        const chunk = buf.slice(0, lastSep + 2);
        buf = buf.slice(lastSep + 2);

        const events = parseSSE(chunk);
        for (const { event, data } of events) {
          if (event === "progress") {
            setStats({
              processed: data.processed ?? 0,
              inserted: data.inserted ?? 0,
              duplicates: data.duplicates ?? 0,
            });
            if (data.message) setStatusMsg(data.message);
          } else if (event === "done") {
            setStats({
              processed: data.processed ?? 0,
              inserted: data.inserted ?? 0,
              duplicates: data.duplicates ?? 0,
            });
            setStatusMsg("Upload complete.");
            setProgressKnown(true);
            setProgress(100);
            setSuccess(true);
            setUploading(false);
          } else if (event === "error") {
            setErrorMsg(data?.message || "Upload error.");
            setStatusMsg("Upload error.");
            setUploading(false);
            setProgressKnown(true);
            setProgress(0);
          }
        }
      }

      if (!success && !errorMsg) {
        setProgressKnown(true);
        setProgress(100);
        setSuccess(true);
        setStatusMsg("Upload complete.");
        setUploading(false);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setErrorMsg(error.message || "Error uploading file.");
      setStatusMsg("Upload error.");
      setUploading(false);
      setProgressKnown(true);
      setProgress(0);
    }
  };

  const resetForm = () => {
    setFile(null);
    setFileData([]);
    setFileName("");
    setUploading(false);
    setSuccess(false);
    setErrorMsg("");
    setStatusMsg("");
    setProgressKnown(false);
    setProgress(0);
    setStats({ processed: 0, inserted: 0, duplicates: 0 });
  };

  return (
    <div className="amazonn-wrapper">
      <h1 className="amazonn-heading">Amazon RTO Data Upload</h1>

      <div className="amazonn-container">
        <form onSubmit={handleSubmit} className="amazonn-form">
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileChange}
            disabled={uploading}
            className="amazonn-file"
          />

          <button
            type="submit"
            disabled={!file || uploading}
            className="amazonn-btn"
            style={{
              cursor: !file || uploading ? "not-allowed" : "pointer",
              opacity: !file || uploading ? 0.7 : 1,
            }}
          >
            {uploading ? "Uploading..." : "Submit"}
          </button>

          {(success || errorMsg) && (
            <button
              type="button"
              onClick={resetForm}
              style={{
                border: "1px solid #ccc",
                padding: "10px 16px",
                borderRadius: 6,
                cursor: "pointer",
                background: "#fff",
              }}
            >
              Reset
            </button>
          )}
        </form>
      </div>

      {(uploading || success || errorMsg) && (
        <div style={{ width: "95%", margin: "20px auto 0", textAlign: "left" }}>
          <div style={{ marginBottom: 6, fontSize: 14 }}>
            {statusMsg || (uploading ? "Uploading..." : "")}
          </div>

          <div
            style={{
              position: "relative",
              height: 12,
              borderRadius: 8,
              background: "#eee",
              overflow: "hidden",
            }}
          >
            {!progressKnown && uploading ? (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: "40%",
                  animation: "move 1.2s linear infinite",
                  background:
                    "repeating-linear-gradient(45deg, #8fd6e5, #8fd6e5 10px, #b8e6f0 10px, #b8e6f0 20px)",
                }}
              />
            ) : (
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: "#3498db",
                  transition: "width 300ms ease",
                }}
              />
            )}
          </div>

          <div style={{ marginTop: 8, fontSize: 13, color: "#444" }}>
            Processed: <b>{stats.processed}</b> &nbsp;|&nbsp; Inserted:{" "}
            <b>{stats.inserted}</b> &nbsp;|&nbsp; Duplicates:{" "}
            <b>{stats.duplicates}</b> {progressKnown && ` | ${progress}%`}
          </div>

          {success && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 6,
                background: "#eaf6fc",
                border: "1px solid #b8d9f0",
                color: "#216e9b",
                fontSize: 14,
              }}
            >
              ✅ Amazon RTO upload completed successfully.
            </div>
          )}
          {errorMsg && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 6,
                background: "#fdecea",
                border: "1px solid #f5c2c0",
                color: "#a42824",
                fontSize: 14,
              }}
            >
              ❌ {errorMsg}
            </div>
          )}
        </div>
      )}

      {fileData.length > 0 && (
        <div
          style={{
            marginTop: "30px",
            width: "95%",
            marginInline: "auto",
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "15px",
            overflowX: "auto",
          }}
        >
          <h3>Preview: {fileName}</h3>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                {fileData[0].map((col, index) => (
                  <th
                    key={index}
                    style={{
                      border: "1px solid #ccc",
                      padding: "8px",
                      backgroundColor: "#f5f5f5",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fileData.slice(1, 6).map((row, rIndex) => (
                <tr key={rIndex}>
                  {row.map((cell, cIndex) => (
                    <td
                      key={cIndex}
                      style={{
                        border: "1px solid #ccc",
                        padding: "8px",
                        textAlign: "left",
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {fileData.length > 6 && (
            <p style={{ marginTop: "10px", color: "#555" }}>
              Showing first 5 rows...
            </p>
          )}
        </div>
      )}

      <style>
        {`
          @keyframes move {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(150%); }
          }
        `}
      </style>
    </div>
  );
};

export default Amazon;
