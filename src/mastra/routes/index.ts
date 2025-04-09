export { uploadPdfRoute } from './pdf';
export { healthRoute } from './health';

export type MastraRoute = {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';
  handler: (req: any, res: any) => Promise<any> | any;
};
