import { Injectable, InternalServerErrorException } from '@nestjs/common';
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
    const config = dotenv.parse(fs.readFileSync(this.getEnvFile()));
    this.envConfig = this.validateInput(config);
  }

  private getEnvFile(): string {
    const env = process.env.NODE_ENV != null ? process.env.NODE_ENV : 'test';
    const file = `${env}.env`;
    if (!fs.existsSync(file)) {
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
    const envVarsSchema: Joi.ObjectSchema = Joi.object({
      NODE_ENV: Joi.string()
        .valid(['development', 'production', 'test', 'provision'])
        .default('development'),
      PORT: Joi.number().default(3000),
      REDIRECT_HOST: Joi.string().default('http://localhost'),
      CLIENT_ID: Joi.string().required(),
      CLIENT_SECRET: Joi.string().required(),
      SESSION_SECRET: Joi.string().required(),
      EXPIRES_DAYS: Joi.number().default(1),
      COOKIE_MAX_AGE: Joi.number().default(1),
    });

    const { error, value: validatedEnvConfig } = Joi.validate(
      envConfig,
      envVarsSchema,
    );
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
}
