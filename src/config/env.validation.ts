// src/config/env.validation.ts
import * as Joi from 'joi';
export const envValidation = Joi.object({
  EMP_API_KEY: Joi.string().required(),
  EMP_API_USERNAME: Joi.string().required(),
  EMP_API_PASSWORD: Joi.string().required(),
  EMP_API_COMPANY: Joi.string().required(),
  EMP_API_BASE_URL: Joi.string().uri().required(),
  EMP_API_LOGIN_PATH: Joi.string().default('v1/login'),
  EMP_HTTP_TIMEOUT_MS: Joi.number().default(60000),
});
