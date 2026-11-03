import type { ICredentialType, INodeProperties } from '../n8n-types';

export class VideoUpscalerApi implements ICredentialType {
  name = 'videoUpscalerApi';
  displayName = 'VideoUpscaler API';
  documentationUrl = 'https://videoupscaler.co/docs/authentication';

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      placeholder: 'vu_live_...',
      description: 'Create an API key in Settings → API Keys on videoupscaler.co',
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://videoupscaler.co/api/v1',
      required: true,
      description: 'VideoUpscaler API base URL',
    },
  ];

  authenticate = {
    type: 'generic' as const,
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  };

  test = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/account',
      method: 'GET',
    },
  };
}
