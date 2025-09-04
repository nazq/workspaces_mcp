// app.ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'reflect-metadata';

import { container, inject, injectable } from 'tsyringe';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// AppConfig interface
export interface AppConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  service1: {
    message: string;
  };
  service2: {
    delay: number;
  };
}

// ConfigService
@injectable()
class ConfigService {
  private readonly configFilePath = path.join(__dirname, 'config.json');

  loadConfig(): AppConfig {
    const configData = fs.readFileSync(this.configFilePath, 'utf8');
    return JSON.parse(configData) as AppConfig;
  }
}

// LoggerService
@injectable()
class LoggerService {
  constructor(
    @inject(ConfigService) private readonly configService: ConfigService
  ) {}

  private get config(): AppConfig {
    return this.configService.loadConfig();
  }

  debug(message: string) {
    if (this.config.logLevel === 'debug') {
      console.debug(message);
    }
  }

  info(message: string) {
    if (this.config.logLevel !== 'error') {
      console.info(message);
    }
  }

  warn(message: string) {
    if (this.config.logLevel !== 'error') {
      console.warn(message);
    }
  }

  error(message: string) {
    console.error(message);
  }
}

// Service1
@injectable()
class Service1 {
  constructor(
    @inject(LoggerService) private readonly logger: LoggerService,
    @inject(ConfigService) private readonly configService: ConfigService
  ) {}

  private get config(): AppConfig {
    return this.configService.loadConfig();
  }

  doSomething() {
    this.logger.info(`Service1: ${this.config.service1.message}`);
  }
}

// Service2
@injectable()
class Service2 {
  constructor(
    @inject(LoggerService) private readonly logger: LoggerService,
    @inject(ConfigService) private readonly configService: ConfigService
  ) {}

  private get config(): AppConfig {
    return this.configService.loadConfig();
  }

  async doSomethingAsync() {
    await new Promise((resolve) =>
      setTimeout(resolve, this.config.service2.delay)
    );
    this.logger.info('Service2: Async operation completed');
  }
}

// MainService
@injectable()
class MainService {
  constructor(
    @inject(LoggerService) private readonly logger: LoggerService,
    @inject(Service1) private readonly service1: Service1,
    @inject(Service2) private readonly service2: Service2
  ) {}

  async run() {
    this.logger.info('MainService: Starting...');
    this.service1.doSomething();
    await this.service2.doSomethingAsync();
    this.logger.info('MainService: Completed');
  }
}

// Register services
container.register<ConfigService>(ConfigService, { useClass: ConfigService });
container.register<LoggerService>(LoggerService, { useClass: LoggerService });
container.register<Service1>(Service1, { useClass: Service1 });
container.register<Service2>(Service2, { useClass: Service2 });
container.register<MainService>(MainService, { useClass: MainService });

// Bootstrap function
async function bootstrap() {
  const mainService = container.resolve(MainService);
  await mainService.run();
}

// Run the application
bootstrap().catch(console.error);
