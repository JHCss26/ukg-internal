import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const SqlConfig = TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (cfg: ConfigService) => ({
    type: 'mssql',
    host: cfg.getOrThrow<string>('MSSQL_HOST'),
  
    database: cfg.getOrThrow<string>('MSSQL_DB'),
    username: cfg.getOrThrow<string>('MSSQL_USER'),
    password: cfg.getOrThrow<string>('MSSQL_PASSWORD'),
    options: {
      encrypt: cfg.getOrThrow<boolean>('MSSQL_ENCRYPT'),
      trustServerCertificate: cfg.getOrThrow<boolean>('MSSQL_TRUST_CERT'),
    },
    autoLoadEntities: true,
    synchronize: false,   // keep false unless you know what you're doing
    logging: false,
  }),
});
