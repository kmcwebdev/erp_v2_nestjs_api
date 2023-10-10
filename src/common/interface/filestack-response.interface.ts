export interface FilestackResponse {
  _file: {
    name: string;
    size: number;
    type: string;
    slice: () => Blob;
  };
  _sanitizeOptions?: unknown;
  status: string;
  handle: string;
  url: string;
  container?: string;
  key?: string;
  uploadTags?: unknown;
  workflows?: unknown;
}
