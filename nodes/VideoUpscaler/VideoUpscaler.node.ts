import { randomUUID } from 'crypto';
import {
  NodeApiError,
  NodeConnectionTypes,
  NodeOperationError,
  type IDataObject,
  type IExecuteFunctions,
  type INodeExecutionData,
  type INodeType,
  type INodeTypeDescription,
  type JsonObject,
} from 'n8n-workflow';

const DEFAULT_BASE_URL = 'https://videoupscaler.co/api/v1';
const WAIT_CHUNK_SECONDS = 45;

export function buildUpscaleOps(additionalFields: IDataObject): IDataObject | undefined {
  const ops: IDataObject = {};
  if (additionalFields.engine && additionalFields.engine !== 'flashvsr') {
    ops.engine = additionalFields.engine;
  }
  if (typeof additionalFields.denoise === 'number' && additionalFields.denoise > 0) {
    ops.denoise = additionalFields.denoise;
  }
  if (additionalFields.deinterlace === true) {
    ops.deinterlace = true;
  }
  if (additionalFields.deflicker === true) {
    ops.deflicker = true;
  }
  if (additionalFields.stabilize === true) {
    ops.stabilize = true;
  }
  if (additionalFields.faceRestore === true) {
    ops.faceRestore = true;
  }
  if (typeof additionalFields.fpsMultiplier === 'number' && additionalFields.fpsMultiplier > 1) {
    ops.fpsMultiplier = additionalFields.fpsMultiplier;
    if (additionalFields.slowMotion === true) {
      ops.slowMotion = true;
    }
  }
  if (additionalFields.hdr && additionalFields.hdr !== 'none') {
    ops.hdr = additionalFields.hdr;
  }
  return Object.keys(ops).length > 0 ? ops : undefined;
}

export class VideoUpscaler implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'VideoUpscaler',
    name: 'videoUpscaler',
    icon: {
      light: 'file:videoupscaler.svg',
      dark: 'file:videoupscaler.dark.svg',
    },
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Upscale and enhance videos up to 4K with the VideoUpscaler API',
    defaults: {
      name: 'VideoUpscaler',
    },
    usableAsTool: true,
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [
      {
        name: 'videoUpscalerApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Video',
            value: 'video',
          },
          {
            name: 'Task',
            value: 'task',
          },
          {
            name: 'Account',
            value: 'account',
          },
        ],
        default: 'video',
      },
      // Video operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['video'],
          },
        },
        options: [
          {
            name: 'Upscale',
            value: 'upscale',
            description: 'Upscale a video to 1080p, 2K, or 4K',
            action: 'Upscale a video',
          },
        ],
        default: 'upscale',
      },
      // Task operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['task'],
          },
        },
        options: [
          {
            name: 'Get',
            value: 'get',
            description: 'Get the status and output URL of an upscale task',
            action: 'Get a task',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List recent upscale tasks',
            action: 'List tasks',
          },
        ],
        default: 'get',
      },
      // Account operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['account'],
          },
        },
        options: [
          {
            name: 'Get Balance',
            value: 'getBalance',
            description: 'Get your remaining credits and per-second pricing',
            action: 'Get credit balance',
          },
        ],
        default: 'getBalance',
      },
      // Video -> Upscale parameters
      {
        displayName: 'Video URL',
        name: 'videoUrl',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'https://example.com/clip.mp4',
        description: 'Public http(s) URL of the MP4, MOV, or WebM video (up to 500MB)',
        displayOptions: {
          show: {
            resource: ['video'],
            operation: ['upscale'],
          },
        },
      },
      {
        displayName: 'Resolution',
        name: 'resolution',
        type: 'options',
        required: true,
        options: [
          { name: '1080p (Full HD — 1 Credit/s)', value: '1080p' },
          { name: '2K (1440p — 2 Credits/s)', value: '2k' },
          { name: '4K (2160p — 3 Credits/s)', value: '4k' },
        ],
        default: '4k',
        description: 'Target upscale resolution',
        displayOptions: {
          show: {
            resource: ['video'],
            operation: ['upscale'],
          },
        },
      },
      {
        displayName: 'Wait for Completion',
        name: 'waitForCompletion',
        type: 'boolean',
        default: true,
        description: 'Whether to wait until the upscale job finishes and return the completed output_url',
        displayOptions: {
          show: {
            resource: ['video'],
            operation: ['upscale'],
          },
        },
      },
      {
        displayName: 'Max Wait Time (Minutes)',
        name: 'maxWaitMinutes',
        type: 'number',
        default: 15,
        typeOptions: {
          minValue: 1,
          maxValue: 60,
        },
        description: 'Maximum minutes to poll before returning the latest task status',
        displayOptions: {
          show: {
            resource: ['video'],
            operation: ['upscale'],
            waitForCompletion: [true],
          },
        },
      },
      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: {
          show: {
            resource: ['video'],
            operation: ['upscale'],
          },
        },
        options: [
          {
            displayName: 'Deflicker',
            name: 'deflicker',
            type: 'boolean',
            default: false,
          },
          {
            displayName: 'Deinterlace',
            name: 'deinterlace',
            type: 'boolean',
            default: false,
          },
          {
            displayName: 'Denoise Strength',
            name: 'denoise',
            type: 'number',
            default: 0,
            typeOptions: {
              minValue: 0,
              maxValue: 100,
            },
            description: 'Denoise level from 0 (off) to 100 (maximum)',
          },
          {
            displayName: 'Engine',
            name: 'engine',
            type: 'options',
            options: [
              { name: 'General (FlashVSR)', value: 'flashvsr' },
              { name: 'Anime & 2D Animation', value: 'anime' },
            ],
            default: 'flashvsr',
          },
          {
            displayName: 'Face Restoration',
            name: 'faceRestore',
            type: 'boolean',
            default: false,
          },
          {
            displayName: 'Frame Interpolation (FPS Multiplier)',
            name: 'fpsMultiplier',
            type: 'options',
            options: [
              { name: '1x (Original FPS)', value: 1 },
              { name: '2x FPS', value: 2 },
              { name: '4x FPS', value: 4 },
              { name: '8x FPS', value: 8 },
            ],
            default: 1,
          },
          {
            displayName: 'HDR Mode',
            name: 'hdr',
            type: 'options',
            options: [
              { name: 'None (SDR)', value: 'none' },
              { name: 'HDR10', value: 'hdr10' },
              { name: 'HLG', value: 'hlg' },
            ],
            default: 'none',
          },
          {
            displayName: 'Idempotency Key',
            name: 'idempotencyKey',
            type: 'string',
            default: '',
            description: 'Unique key (1–255 ASCII chars) so retries never charge twice',
          },
          {
            displayName: 'Slow Motion',
            name: 'slowMotion',
            type: 'boolean',
            default: false,
          },
          {
            displayName: 'Stabilize Video',
            name: 'stabilize',
            type: 'boolean',
            default: false,
          },
          {
            displayName: 'Webhook URL',
            name: 'webhookUrl',
            type: 'string',
            default: '',
            placeholder: 'https://hooks.zapier.com/hooks/catch/...',
            description: 'Public https:// URL to receive a POST when the task completes or fails',
          },
        ],
      },
      // Task -> Get parameters
      {
        displayName: 'Task ID',
        name: 'taskId',
        type: 'string',
        required: true,
        default: '',
        description: 'Task ID returned when the upscale was created',
        displayOptions: {
          show: {
            resource: ['task'],
            operation: ['get'],
          },
        },
      },
      {
        displayName: 'Wait Seconds',
        name: 'waitSeconds',
        type: 'number',
        default: 0,
        typeOptions: {
          minValue: 0,
          maxValue: 45,
        },
        description: 'Hold the request for up to 45 seconds waiting for the task to finish',
        displayOptions: {
          show: {
            resource: ['task'],
            operation: ['get'],
          },
        },
      },
      // Task -> List parameters
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        default: 50,
        typeOptions: {
          minValue: 1,
          maxValue: 100,
        },
        description: 'Max number of results to return',
        displayOptions: {
          show: {
            resource: ['task'],
            operation: ['list'],
          },
        },
      },
      {
        displayName: 'Page',
        name: 'page',
        type: 'number',
        default: 1,
        typeOptions: {
          minValue: 1,
        },
        description: 'Page number starting at 1',
        displayOptions: {
          show: {
            resource: ['task'],
            operation: ['list'],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const creds = await this.getCredentials('videoUpscalerApi');
    const baseUrl = String(creds.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');

    for (let i = 0; i < items.length; i++) {
      try {
        const resource = this.getNodeParameter('resource', i) as string;
        const operation = this.getNodeParameter('operation', i) as string;

        if (resource === 'video' && operation === 'upscale') {
          const videoUrl = this.getNodeParameter('videoUrl', i) as string;
          const resolution = this.getNodeParameter('resolution', i) as string;
          const waitForCompletion = this.getNodeParameter('waitForCompletion', i, true) as boolean;
          const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

          const idempotencyKey =
            (typeof additionalFields.idempotencyKey === 'string' &&
              additionalFields.idempotencyKey.trim()) ||
            randomUUID();
          const ops = buildUpscaleOps(additionalFields);
          const body: IDataObject = {
            video_url: videoUrl,
            resolution,
            ...(ops ? { ops } : {}),
            ...(typeof additionalFields.webhookUrl === 'string' &&
            additionalFields.webhookUrl.trim()
              ? { webhook_url: additionalFields.webhookUrl.trim() }
              : {}),
          };

          let task = (await this.helpers.httpRequestWithAuthentication.call(
            this,
            'videoUpscalerApi',
            {
              method: 'POST',
              url: `${baseUrl}/upscale`,
              headers: {
                'Idempotency-Key': idempotencyKey,
              },
              body,
              json: true,
              timeout: 300_000,
            }
          )) as IDataObject;

          if (waitForCompletion && task && task.id) {
            const maxWaitMinutes = this.getNodeParameter('maxWaitMinutes', i, 15) as number;
            const deadline = Date.now() + Math.max(1, maxWaitMinutes) * 60_000;
            while (
              (task.status === 'queued' || task.status === 'processing') &&
              Date.now() < deadline
            ) {
              task = (await this.helpers.httpRequestWithAuthentication.call(
                this,
                'videoUpscalerApi',
                {
                  method: 'GET',
                  url: `${baseUrl}/tasks/${encodeURIComponent(String(task.id))}`,
                  qs: { wait: WAIT_CHUNK_SECONDS },
                  json: true,
                  timeout: (WAIT_CHUNK_SECONDS + 15) * 1000,
                }
              )) as IDataObject;
            }
            if (task.status === 'failed') {
              throw new NodeOperationError(
                this.getNode(),
                String(task.error || 'VideoUpscaler task failed'),
                { itemIndex: i }
              );
            }
          }

          returnData.push({ json: task, pairedItem: { item: i } });
        } else if (resource === 'task' && operation === 'get') {
          const taskId = this.getNodeParameter('taskId', i) as string;
          const waitSeconds = this.getNodeParameter('waitSeconds', i, 0) as number;
          const qs: IDataObject = {};
          if (waitSeconds > 0) {
            qs.wait = Math.min(45, Math.max(0, Math.floor(waitSeconds)));
          }
          const task = (await this.helpers.httpRequestWithAuthentication.call(
            this,
            'videoUpscalerApi',
            {
              method: 'GET',
              url: `${baseUrl}/tasks/${encodeURIComponent(taskId)}`,
              qs,
              json: true,
              timeout: 60_000,
            }
          )) as IDataObject;
          returnData.push({ json: task, pairedItem: { item: i } });
        } else if (resource === 'task' && operation === 'list') {
          const limit = this.getNodeParameter('limit', i, 50) as number;
          const page = this.getNodeParameter('page', i, 1) as number;
          const list = (await this.helpers.httpRequestWithAuthentication.call(
            this,
            'videoUpscalerApi',
            {
              method: 'GET',
              url: `${baseUrl}/tasks`,
              qs: { limit, page },
              json: true,
            }
          )) as IDataObject;
          returnData.push({ json: list, pairedItem: { item: i } });
        } else if (resource === 'account' && operation === 'getBalance') {
          const account = (await this.helpers.httpRequestWithAuthentication.call(
            this,
            'videoUpscalerApi',
            {
              method: 'GET',
              url: `${baseUrl}/account`,
              json: true,
            }
          )) as IDataObject;
          returnData.push({ json: account, pairedItem: { item: i } });
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: error instanceof Error ? error.message : String(error) },
            pairedItem: { item: i },
          });
          continue;
        }
        throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
      }
    }

    return [returnData];
  }
}
