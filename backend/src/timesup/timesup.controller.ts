import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { TimesUpService } from './timesup.service';

@Controller('timesup/admin/cards')
export class TimesUpAdminController {
    constructor(private readonly service: TimesUpService) { }

    @Get()
    async getAll() {
        return this.service.getAllCards();
    }

    @Post()
    async create(@Body() data: { value: string, category: string, level: number }) {
        return this.service.createCard(data);
    }

    @Post('import')
    async import(@Body() data: { cards: any[] }) {
        return this.service.importCards(data.cards);
    }

    @Put(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() data: { value?: string, category?: string, level?: number }) {
        return this.service.updateCard(id, data);
    }

    @Delete(':id')
    async delete(@Param('id', ParseIntPipe) id: number) {
        return this.service.deleteCard(id);
    }
}
