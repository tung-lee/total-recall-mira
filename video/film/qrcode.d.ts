declare module "qrcode" {
  const QRCode: {
    create(text: string, opts?: { errorCorrectionLevel?: "L" | "M" | "Q" | "H" }): { modules: { size: number; data: Uint8Array } };
  };
  export default QRCode;
}
