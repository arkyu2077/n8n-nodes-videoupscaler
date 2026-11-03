export type IDataObject = Record<string, any>;
export type JsonObject = Record<string, any>;
export type Icon = string | { light: string; dark: string };

export const NodeConnectionTypes = {
  Main: 'main',
} as const;

export class NodeOperationError extends Error {
  constructor(_node: any, error: Error | string, _options?: IDataObject) {
    super(typeof error === 'string' ? error : error.message);
    this.name = 'NodeOperationError';
  }
}

export class NodeApiError extends Error {
  constructor(_node: any, error: JsonObject, _options?: IDataObject) {
    const msg =
      typeof error?.message === 'string'
        ? error.message
        : typeof error?.error === 'string'
          ? error.error
          : 'VideoUpscaler API error';
    super(msg);
    this.name = 'NodeApiError';
  }
}

export interface INodeExecutionData {
  json: IDataObject;
  pairedItem?: { item: number };
}

export interface INodePropertyOptions {
  name: string;
  value: string | number | boolean;
  description?: string;
  action?: string;
}

export interface INodeProperties {
  displayName: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'options' | 'collection';
  default: any;
  required?: boolean;
  description?: string;
  placeholder?: string;
  typeOptions?: Record<string, any>;
  options?: Array<INodePropertyOptions | INodeProperties>;
  displayOptions?: {
    show?: Record<string, Array<string | number | boolean>>;
    hide?: Record<string, Array<string | number | boolean>>;
  };
  noDataExpression?: boolean;
}

export interface IAuthenticateGeneric {
  type: 'generic';
  properties: {
    headers?: Record<string, string>;
  };
}

export interface ICredentialTestRequest {
  request: {
    baseURL: string;
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  };
}

export interface ICredentialType {
  name: string;
  displayName: string;
  icon?: Icon;
  documentationUrl?: string;
  properties: INodeProperties[];
  authenticate?: IAuthenticateGeneric;
  test?: ICredentialTestRequest;
}

export interface INodeTypeDescription {
  displayName: string;
  name: string;
  icon: Icon;
  group: string[];
  version: number;
  subtitle?: string;
  description: string;
  defaults: { name: string };
  inputs: string[];
  outputs: string[];
  usableAsTool?: boolean;
  credentials?: Array<{ name: string; required: boolean }>;
  properties: INodeProperties[];
}

export interface IHttpRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: IDataObject;
  qs?: IDataObject;
  json?: boolean;
  timeout?: number;
}

export interface IExecuteFunctions {
  getNode(): any;
  getInputData(): INodeExecutionData[];
  getNodeParameter(parameterName: string, itemIndex: number, fallbackValue?: any): any;
  getCredentials(type: string, itemIndex?: number): Promise<IDataObject>;
  continueOnFail(): boolean;
  helpers: {
    httpRequestWithAuthentication(
      this: IExecuteFunctions,
      credentialsType: string,
      requestOptions: IHttpRequestOptions
    ): Promise<any>;
  };
}

export interface INodeType {
  description: INodeTypeDescription;
  execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}
