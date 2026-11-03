import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
  Icon,
} from 'n8n-workflow';

export class VideoUpscalerApi implements ICredentialType {
  name = 'videoUpscalerApi';

  displayName = 'VideoUpscaler API';

  icon: Icon = {
    light: 'file:videoupscaler.svg',
    dark: 'file:videoupscaler.dark.svg',
  };

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

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/account',
      method: 'GET',
    },
  };
}
