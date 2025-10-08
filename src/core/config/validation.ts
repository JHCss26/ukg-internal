import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  LOG_LEVEL: Joi.string().default('debug'),

  //this is mssql configuration
  MSSQL_HOST: Joi.string().required(),
  MSSQL_PORT: Joi.number().default(1433),
  MSSQL_DB: Joi.string().required(),
  MSSQL_USER: Joi.string().required(),
  MSSQL_PASSWORD: Joi.string().required(),
  MSSQL_ENCRYPT: Joi.boolean().default(false),
  MSSQL_TRUST_CERT: Joi.boolean().default(true),

  EMP_API_BASE_URL: Joi.string().uri().required(),
  EMP_API_KEY: Joi.string().required(),
  EMP_API_USERNAME: Joi.string().required(),
  EMP_API_PASSWORD: Joi.string().required(),
  EMP_API_COMPANY: Joi.string().required(),
  EMP_API_LOGIN_PATH: Joi.string().default('/v1/login'),
  EMP_HTTP_TIMEOUT_MS: Joi.number().default(15000),
});
