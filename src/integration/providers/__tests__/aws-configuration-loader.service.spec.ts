import { Test, TestingModule } from '@nestjs/testing';
import { AwsConfigurationLoaderService } from '../aws-configuration-loader.service';
import { IntegrationOptions } from '../../interfaces/integration-options.interface';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

describe('AwsConfigurationLoaderService', () => {
  let service: AwsConfigurationLoaderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AwsConfigurationLoaderService,
        {
          provide: 'INTEGRATION_OPTIONS',
          useValue: {
            enableLogging: false,
            failOnAwsError: false,
            fallbackToLocal: true,
            errorHandling: {
              onAwsUnavailable: 'warn',
              onConfigurationError: 'warn',
              onValidationError: 'warn',
              enableDetailedLogging: false,
            },
          } as IntegrationOptions,
        },
      ],
    }).compile();

    service = module.get<AwsConfigurationLoaderService>(AwsConfigurationLoaderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should load configuration without errors', async () => {
    const config = await service.loadConfiguration();
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });

  it('should load namespaced configuration', async () => {
    const namespaces = ['database', 'api'];
    const config = await service.loadNamespacedConfiguration(namespaces);
    
    expect(config).toBeDefined();
    expect(config['database']).toBeDefined();
    expect(config['api']).toBeDefined();
  });

  it('should check availability without throwing', async () => {
    const isAvailable = await service.isAvailable();
    expect(typeof isAvailable).toBe('boolean');
  });

  it('should get available sources', async () => {
    const sources = await service.getAvailableSources();
    expect(Array.isArray(sources)).toBe(true);
  });
});