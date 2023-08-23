export interface CdcRequestEnvelope {
  schema: {
    type: 'struct';
    fields: {
      name: string;
      type: string;
      optional: boolean;
      field: {
        type: string;
        fields?: {
          name: string;
          type: string;
          optional: boolean;
          field?: {
            type: string;
          };
        }[];
      };
    }[];
    optional: boolean;
    name: string;
    version: number;
  };
  payload: {
    before: unknown;
    after: unknown;
    source: {
      version: string;
      connector: string;
      name: string;
      ts_ms: number;
      snapshot: string;
      db: string;
      sequence: string[];
      schema: string;
      table: string;
      txId: number;
      lsn: number;
      xmin: null;
    };
    op: 'c';
    ts_ms: number;
    transaction: null;
  };
}
