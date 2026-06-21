import QRCode from "qrcode";

export async function renderQrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
  });
}
