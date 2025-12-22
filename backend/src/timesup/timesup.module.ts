import { Module } from '@nestjs/common';
import { TimesUpService } from './timesup.service';
import { TimesUpGateway } from './timesup.gateway';

@Module({
    providers: [TimesUpService, TimesUpGateway],
    exports: [TimesUpService]
})
export class TimesUpModule { }
