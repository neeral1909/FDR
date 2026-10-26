import React, { useEffect, useState } from "react";
import QRCode from "qrcode.react";
import { Html5QrcodeScanner } from "html5-qrcode";
import "./FDRDocumentTools.css";
const API_URL = "http://localhost:5000/api";

function FDRDocumentTools({ fdr, token }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [scanResult, setScanResult] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [file]);

  useEffect(() => {
    if (!scanOpen) return;

    const scanner = new Html5QrcodeScanner(
      "fdr-qr-reader",
      {
        fps: 10,
        qrbox: { width: 220, height: 220 },
      },
      false
    );

    scanner.render(
      (decodedText) => {
        setScanResult(decodedText);
        setMessage("QR code scanned successfully.");
        setError("");
        scanner.clear().catch(() => {});
        setScanOpen(false);
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [scanOpen]);

  function selectFile(event) {
    const selectedFile = event.target.files?.[0];

    setMessage("");
    setError("");
    setFile(null);

    if (!selectedFile) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Select a JPG, PNG, WEBP, or PDF file.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("The file must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  }

  async function uploadDocument() {
    if (!file) {
      setError("Please select a document first.");
      return;
    }

    if (!fdr?._id) {
      setError("Save the FDR record before uploading its document.");
      return;
    }

    if (!token) {
      setError("Please log in again.");
      return;
    }

    const formData = new FormData();
    formData.append("document", file);
    formData.append("fdrId", fdr._id);

    setUploading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/fdrs/${fdr._id}/documents`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Document upload failed. Check that the backend upload route exists."
        );
      }

      setMessage("Document uploaded successfully.");
      setFile(null);
    } catch (err) {
      setError(err.message || "Could not upload the document.");
    } finally {
      setUploading(false);
    }
  }

  const qrValue = fdr?._id
    ? `FDR-ID:${fdr._id}`
    : "";

  return (
    <section className="fdr-tools">
      <div className="fdr-tool-card">
        <h3>FDR QR Code</h3>

        <p>
          Generate a QR code that identifies this FDR record.
        </p>

        {qrValue ? (
          <>
            <div className="fdr-qr">
              <QRCode value={qrValue} size={190} />
            </div>

            <p className="fdr-tool-note">
              FDR Number: {fdr.fdrNumber}
            </p>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                const canvas = document.querySelector(
                  ".fdr-qr canvas"
                );

                if (!canvas) {
                  setError("QR code is not ready yet.");
                  return;
                }

                const link = document.createElement("a");
                link.download = `FDR-${fdr.fdrNumber}-QR.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
              }}
            >
              Download QR Code
            </button>
          </>
        ) : (
          <p>Save the FDR record before generating its QR code.</p>
        )}

        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setScanResult("");
            setScanOpen((previous) => !previous);
          }}
        >
          {scanOpen ? "Close Scanner" : "Scan QR Code"}
        </button>

        {scanOpen && (
          <div
            id="fdr-qr-reader"
            className="fdr-qr-reader"
          />
        )}

        {scanResult && (
          <div className="fdr-tool-note">
            <strong>Scanned value:</strong>
            <p>{scanResult}</p>
            <p>
              A successful scan identifies the QR content; it does
              not independently prove that the FDR is genuine.
            </p>
          </div>
        )}
      </div>

      <div className="fdr-tool-card">
        <h3>Upload FDR Document</h3>

        <p>
          Select a photograph, scanned receipt, or PDF document.
        </p>

        <label
          htmlFor="fdr-document-upload"
          className="secondary-button"
        >
          Choose Document
        </label>

        <input
          id="fdr-document-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={selectFile}
          style={{ display: "block", marginTop: 12 }}
        />

        {preview && file?.type.startsWith("image/") && (
          <div className="fdr-document-preview">
            <img src={preview} alt="Selected FDR document preview" />
          </div>
        )}

        {file && (
          <p className="fdr-tool-note">
            Selected: {file.name}
          </p>
        )}

        <button
          type="button"
          className="primary-button"
          disabled={!file || uploading}
          onClick={uploadDocument}
        >
          {uploading
            ? "Uploading..."
            : "Upload Document"}
        </button>

        {message && (
          <p className="fdr-success">{message}</p>
        )}

        {error && (
          <p className="fdr-error">{error}</p>
        )}

        <p className="fdr-tool-note">
          Maximum file size: 5 MB. Documents must be stored and
          accessed through an authenticated backend.
        </p>
      </div>
    </section>
  );
}

export default FDRDocumentTools;