/**
 * Unit tests for S3Loader.load(): request shape, body handling, format
 * selection and AWS error mapping.
 */

import { S3Loader } from './s3.loader';
import { AWSServiceError, ConfigurationLoadError } from '../errors';

jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn();
  const mockCredentials = jest.fn();
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
      config: { credentials: mockCredentials },
    })),
    GetObjectCommand: jest.fn().mockImplementation((input) => input),
    __mockSend: mockSend,
    __mockCredentials: mockCredentials,
  };
});

const sdk = () => require('@aws-sdk/client-s3');
const mockSend = () => sdk().__mockSend as jest.Mock;
const mockCredentials = () => sdk().__mockCredentials as jest.Mock;

const body = (text: string) => ({ Body: { transformToString: jest.fn().mockResolvedValue(text) } });

function awsError(name: string): Error {
  const e = new Error(`${name} happened`);
  e.name = name;
  return e;
}

describe('S3Loader', () => {
  const saved = process.env['AWS_REGION'];

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env['AWS_REGION'];
  });

  afterAll(() => {
    if (saved === undefined) delete process.env['AWS_REGION'];
    else process.env['AWS_REGION'] = saved;
  });

  it('names itself after the object URL', () => {
    expect(new S3Loader({ bucket: 'b', key: 'k/app.env' }).getName()).toBe('S3Loader(s3://b/k/app.env)');
  });

  it('gets the configured object in the configured (or AWS_REGION) region', async () => {
    mockSend().mockResolvedValue(body('{}'));
    await new S3Loader({ bucket: 'cfg', key: 'app.json', region: 'ca-central-1' }).load();
    expect(sdk().S3Client).toHaveBeenLastCalledWith({ region: 'ca-central-1' });
    expect(mockSend().mock.calls[0][0]).toEqual({ Bucket: 'cfg', Key: 'app.json' });

    process.env['AWS_REGION'] = 'ap-south-1';
    await new S3Loader({ bucket: 'cfg', key: 'app.json' }).load();
    expect(sdk().S3Client).toHaveBeenLastCalledWith({ region: 'ap-south-1' });
  });

  it('auto-detects JSON', async () => {
    mockSend().mockResolvedValue(body('  {"PORT": 8080, "DEBUG": false}\n'));
    await expect(new S3Loader({ bucket: 'b', key: 'k' }).load()).resolves.toEqual({ PORT: 8080, DEBUG: false });
  });

  it('auto-detects .env content (values kept literally, ECS env-file style)', async () => {
    mockSend().mockResolvedValue(body('# comment\nPORT=8080\nNAME="my app"\n'));
    await expect(new S3Loader({ bucket: 'b', key: 'k' }).load()).resolves.toEqual({ PORT: '8080', NAME: '"my app"' });
  });

  it('honours an explicit format over detection', async () => {
    mockSend().mockResolvedValue(body('A=1'));
    await expect(new S3Loader({ bucket: 'b', key: 'k', format: 'env' }).load()).resolves.toEqual({ A: '1' });
    mockSend().mockResolvedValue(body('[1,2,3]'));
    await expect(new S3Loader({ bucket: 'b', key: 'k', format: 'json' }).load()).resolves.toEqual({
      CONFIG_VALUE: [1, 2, 3],
    });
  });

  it('rejects malformed JSON with a ConfigurationLoadError naming the object', async () => {
    mockSend().mockResolvedValue(body('{"broken": '));
    const err = await new S3Loader({ bucket: 'b', key: 'k' }).load().catch((e) => e);
    expect(err).toBeInstanceOf(ConfigurationLoadError);
    expect(err.message).toMatch(/Failed to parse JSON from s3:\/\/b\/k/);
  });

  it.each([
    ['no Body', {}],
    ['an empty body', body('')],
    ['a whitespace-only body', body('  \n\t ')],
  ])('returns {} for %s', async (_label, response) => {
    mockSend().mockResolvedValue(response);
    await expect(new S3Loader({ bucket: 'b', key: 'k' }).load()).resolves.toEqual({});
  });

  it.each(['NoSuchKey', 'NoSuchBucket'])('treats %s as empty configuration', async (name) => {
    mockSend().mockRejectedValue(awsError(name));
    await expect(new S3Loader({ bucket: 'b', key: 'k' }).load()).resolves.toEqual({});
  });

  it('maps AccessDenied to an AWSServiceError with a permissions hint', async () => {
    mockSend().mockRejectedValue(awsError('AccessDenied'));
    const err = await new S3Loader({ bucket: 'b', key: 'k' }).load().catch((e) => e);
    expect(err).toBeInstanceOf(AWSServiceError);
    expect(err.message).toMatch(/Access denied when retrieving s3:\/\/b\/k/);
  });

  it('wraps any other failure, including non-Error rejections', async () => {
    mockSend().mockRejectedValue(awsError('SlowDown'));
    await expect(new S3Loader({ bucket: 'b', key: 'k' }).load()).rejects.toThrow(
      /Failed to retrieve s3:\/\/b\/k: SlowDown happened/,
    );
    mockSend().mockRejectedValue('ECONNRESET');
    await expect(new S3Loader({ bucket: 'b', key: 'k' }).load()).rejects.toBeInstanceOf(AWSServiceError);
  });

  it('reports availability from the credential chain', async () => {
    mockCredentials().mockResolvedValueOnce({});
    await expect(new S3Loader({ bucket: 'b', key: 'k' }).isAvailable()).resolves.toBe(true);
    mockCredentials().mockRejectedValueOnce(new Error('none'));
    await expect(new S3Loader({ bucket: 'b', key: 'k' }).isAvailable()).resolves.toBe(false);
  });
});
