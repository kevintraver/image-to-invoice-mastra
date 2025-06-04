export { uploadPdfHandler } from './pdf';
export { uploadInvoiceHandler } from './invoice';
export { healthRoute } from './health';

export type MastraRoute = {
  path: string;
  method: string;
  handler: any; // Will likely be removed once we complete migration
};
