import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect(/Hello World!/);
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('environment');
        expect(res.body).toHaveProperty('port');
      });
  });

  it('/config (GET)', () => {
    return request(app.getHttpServer())
      .get('/config')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('port');
        expect(res.body).toHaveProperty('nodeEnv');
        expect(res.body).toHaveProperty('databaseHost');
        expect(res.body).toHaveProperty('databasePort');
      });
  });

  it('/config/database (GET)', () => {
    return request(app.getHttpServer())
      .get('/config/database')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('host');
        expect(res.body).toHaveProperty('port');
        expect(res.body).toHaveProperty('username');
        // Password should be masked
        if (res.body.password) {
          expect(res.body.password).toBe('***masked***');
        }
      });
  });

  it('/examples (GET)', () => {
    return request(app.getHttpServer())
      .get('/examples')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('examples');
        expect(Array.isArray(res.body.examples)).toBe(true);
      });
  });

  it('/examples/validation (GET)', () => {
    return request(app.getHttpServer())
      .get('/examples/validation')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('examples');
      });
  });

  it('/examples/migration (GET)', () => {
    return request(app.getHttpServer())
      .get('/examples/migration')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('migrations');
      });
  });
});