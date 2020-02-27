import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as Joi from '@hapi/joi';
import * as fs from 'fs';

export interface EnvConfig {
  [key: string]: string;
}

@Injectable()
export class ConfigService {
  private readonly envConfig: EnvConfig;

  constructor() {
    const envFile = this.getEnvFile();
    const envFileContent = envFile != null ? fs.readFileSync(envFile) : '';
    const config = dotenv.parse(envFileContent);
    this.envConfig = this.validateInput(config);
  }

  private getEnvFile(): string {
    const env = process.env.NODE_ENV != null ? process.env.NODE_ENV : 'test';
    const file = `${env}.env`;
    if (!fs.existsSync(file)) {
      if (env === 'production') {
        return null;
      }
      throw new Error(`Missing environment file "${file}"`);
    }
    return file;
  }

  /**
   * Ensures all needed variables are set, and returns the validated JavaScript object
   * including the applied default values.
   * See https://docs.nestjs.com/techniques/configuration
   */
  private validateInput(envConfig: EnvConfig): EnvConfig {
    const nodeEnv = process.env.NODE_ENV != null ? process.env.NODE_ENV : 'development';
    const port = process.env.PORT != null ? process.env.PORT : 3000;
    const host = process.env.REDIRECT_HOST != null ? process.env.REDIRECT_HOST : 'http://localhost';
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const sessionSecret = process.env.SESSION_SECRET;
    const expiresDays = process.env.EXPIRES_DAYS != null ? process.env.EXPIRES_DAYS : 1;
    const cookieMaxAge = process.env.COOKIE_MAX_AGE != null ? process.env.COOKIE_MAX_AGE : 1;
    const workDirectory = process.env.WORKDIR != null ? process.env.WORKDIR : '/tmp';

    const envVarsSchema: Joi.ObjectSchema = Joi.object({
      NODE_ENV: Joi.string()
        .valid('development', 'production', 'test', 'provision')
        .default(nodeEnv),
      PORT: Joi.number().default(port),
      REDIRECT_HOST: Joi.string().default(host),
      CLIENT_ID:
        clientId != null
          ? Joi.string().default(clientId)
          : Joi.string().required(),
      CLIENT_SECRET:
        clientSecret != null
          ? Joi.string().default(clientSecret)
          : Joi.string().required(),
      SESSION_SECRET:
        sessionSecret != null
          ? Joi.string().default(sessionSecret)
          : Joi.string().required(),
      EXPIRES_DAYS: Joi.number().default(expiresDays),
      COOKIE_MAX_AGE: Joi.number().default(cookieMaxAge),
      WORKDIR: Joi.string().default(workDirectory),
    });

    const { error, value: validatedEnvConfig } = envVarsSchema.validate(envConfig);
    if (error) {
      throw new Error(`Config validation error: ${error.message}`);
    }
    return validatedEnvConfig;
  }

  public get nodeEnv(): string {
    return this.envConfig.NODE_ENV;
  }

  public get redirectHost(): string {
    return this.envConfig.REDIRECT_HOST;
  }

  public get port(): number {
    return Number(this.envConfig.PORT);
  }

  public get clientId(): string {
    return this.envConfig.CLIENT_ID;
  }

  public get clientSecret(): string {
    return this.envConfig.CLIENT_SECRET;
  }

  public get sessionSecret(): string {
    return this.envConfig.SESSION_SECRET;
  }

  public get expiresDays(): number {
    return Number(this.envConfig.EXPIRES_DAYS);
  }

  public get cookieMaxAge(): number {
    return Number(this.envConfig.COOKIE_MAX_AGE);
  }

  public get workDirectory(): string {
    return this.envConfig.WORKDIR;
  }

  // Name of the GitHub organization that hosts the keyboards repo. This property exists
  // so that we can change the name for e2e tests.
  public get organizationName(): string {
    return 'keymanapp';
  }

  // Name of the `keyboards` repo. This property exists so that we can change the name
  // for e2e tests.
  public get keyboardsRepoName(): string {
    return 'keyboards';
  }
}
