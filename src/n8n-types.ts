export type IDataObject = Record<string, any>;

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

export interface ICredentialType {
  name: string;
  displayName: string;
  documentationUrl?: string;
  properties: INodeProperties[];
  authenticate?: {
    type: 'generic';
    properties: {
      headers?: Record<string, string>;
    };
  };
  test?: {
    request: {
      baseURL: string;
      url: string;
      method?: string;
    };
  };
}

export interface INodeTypeDescription {
  displayName: string;
  name: string;
  icon: string;
  group: string[];
  version: number;
  subtitle?: string;
  description: string;
  defaults: { name: string };
  inputs: string[];
  outputs: string[];
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
