/**
 * Verifies that the AWS loaders construct SDK clients that auto-detect credentials
 * via the AWS SDK's default Node provider chain (environment variables, shared
 * config/profile, SSO, web identity, ECS/EKS container, and EC2 IMDS).
 *
 * The clients are created but no request is sent, so this requires neither real
 * credentials nor network access — we only assert that a credentials provider was
 * wired onto the client config.
 */

import { SecretsManagerLoader } from './secrets-manager.loader';
import { SSMParameterStoreLoader } from './ssm-parameter-store.loader';
import { S3Loader } from './s3.loader';

// Expose the protected lazy getClient() for assertions.
class SecretsManagerLoaderProbe extends SecretsManagerLoader {
  client() {
    return this.getClient();
  }
}
class SSMLoaderProbe extends SSMParameterStoreLoader {
  client() {
    return this.getClient();
  }
}
class S3LoaderProbe extends S3Loader {
  client() {
    return this.getClient();
  }
}

describe('AWS credential provider chaining', () => {
  it('Secrets Manager client resolves credentials through the default provider chain', async () => {
    const client = await new SecretsManagerLoaderProbe({ region: 'us-east-1' }).client();
    // The SDK injects @aws-sdk/credential-provider-node's chained provider when no
    // explicit credentials are supplied.
    expect(typeof client.config.credentials).toBe('function');
    expect(typeof client.config.region).toBe('function');
  });

  it('SSM client resolves credentials through the default provider chain', async () => {
    const client = await new SSMLoaderProbe({ region: 'us-east-1' }).client();
    expect(typeof client.config.credentials).toBe('function');
  });

  it('S3 client resolves credentials through the default provider chain', async () => {
    const client = await new S3LoaderProbe({ bucket: 'b', key: 'k', region: 'us-east-1' }).client();
    expect(typeof client.config.credentials).toBe('function');
  });
});
