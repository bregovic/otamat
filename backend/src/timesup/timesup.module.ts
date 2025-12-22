import { Module } from '@nestjs/common';
import { TimesUpService } from './timesup.service';
import { TimesUpGateway } from './timesup.gateway';

import { TimesUpAdminController } from './timesup.controller';

@Module({
    controllers: [TimesUpAdminController],
    providers: [TimesUpService, TimesUpGateway],
    exports: [TimesUpService]
})
export class TimesUpModule { }
