import { uploadFile, client } from "./client";
import type { ScanResponse, ScanConfirmRequest, Transaction } from "../types";

export const scanApi = {
  /** Upload bill image → returns OCR parsed items */
  scan: (file: File) =>
    uploadFile<ScanResponse>("/scan", file),

  /** Confirm parsed items → saves as a real transaction */
  confirm: (data: ScanConfirmRequest) =>
    client<Transaction>("/scan/confirm", { method: "POST", body: data }),
};
