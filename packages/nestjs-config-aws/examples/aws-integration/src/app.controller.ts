import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { AwsService } from './services/aws.service';
import { MonitoringService } from './services/monitoring.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly awsService: AwsService,
    private readonly monitoringService: MonitoringService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('info')
  getInfo() {
    return this.appService.getApplicationInfo();
  }

  @Get('config')
  getConfig() {
    return this.appService.getConfiguration();
  }

  @Get('health')
  async getHealth() {
    return this.appService.getHealthCheck();
  }

  // AWS Services Endpoints
  @Get('aws')
  async getAwsStatus() {
    return this.awsService.getServicesStatus();
  }

  @Get('aws/s3')
  async getS3Status() {
    return this.awsService.getS3Status();
  }

  @Post('aws/s3/upload')
  async generateS3UploadUrl(@Body() body: { fileName: string; contentType?: string }) {
    return this.awsService.generateS3PresignedUrl(body.fileName, body.contentType);
  }

  @Get('aws/dynamodb')
  async getDynamoDbStatus() {
    return this.awsService.getDynamoDbStatus();
  }

  @Post('aws/dynamodb/query')
  async queryDynamoDb(@Body() body: { tableName: string; key: any }) {
    return this.awsService.queryDynamoDb(body.tableName, body.key);
  }

  @Get('aws/sqs')
  async getSqsStatus() {
    return this.awsService.getSqsStatus();
  }

  @Post('aws/sqs/send')
  async sendSqsMessage(@Body() body: { message: string; attributes?: any }) {
    return this.awsService.sendSqsMessage(body.message, body.attributes);
  }

  @Get('aws/sns')
  async getSnsStatus() {
    return this.awsService.getSnsStatus();
  }

  @Post('aws/sns/publish')
  async publishSnsMessage(@Body() body: { message: string; subject?: string }) {
    return this.awsService.publishSnsMessage(body.message, body.subject);
  }

  @Get('aws/lambda')
  async getLambdaStatus() {
    return this.awsService.getLambdaStatus();
  }

  @Post('aws/lambda/invoke')
  async invokeLambda(@Body() body: { payload?: any }) {
    return this.awsService.invokeLambda(body.payload);
  }

  @Get('aws/cognito')
  async getCognitoStatus() {
    return this.awsService.getCognitoStatus();
  }

  // Monitoring Endpoints
  @Get('monitoring/metrics')
  async getMetrics() {
    return this.monitoringService.getMetrics();
  }

  @Get('monitoring/logs')
  async getLogs() {
    return this.monitoringService.getRecentLogs();
  }

  @Get('monitoring/health')
  async getDetailedHealth() {
    return this.monitoringService.getDetailedHealthCheck();
  }
}