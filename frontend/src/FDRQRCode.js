import { QRCodeSVG } from "qrcode.react";

export default function FDRQRCode({ fdrId }) {
  if (!fdrId) {
    return <p>FDR record ID is required.</p>;
  }

  return (
    <div>
      <h3>FDR Verification QR</h3>

      <QRCodeSVG
        value={`${window.location.origin}/verify/${encodeURIComponent(fdrId)}`}
        size={200}
        level="H"
      />

      <p>FDR ID: {fdrId}</p>
    </div>
  );
}