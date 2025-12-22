import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { TimesUpService } from './timesup.service';

@Controller('timesup/admin/cards')
export class TimesUpAdminController {
    constructor(private readonly service: TimesUpService) { }

    @Get()
    async getAll() {
        return this.service.getAllCards();
    }

    @Get('categories') // Shortcut for now, technically timesup/admin/cards/categories but handy
    async getCategories() {
        return this.service.getUniqueCategories();
    }

    @Post()
    async create(@Body() data: { value: string, category: string, level: number, description?: string, imageUrl?: string }) {
        return this.service.createCard(data);
    }

    @Post('import')
    async import(@Body() data: { cards: any[] }) {
        return this.service.importCards(data.cards);
    }

    @Post('bulk-delete')
    async bulkDelete(@Body() data: { ids: number[] }) {
        return this.service.bulkDeleteCards(data.ids);
    }

    @Post('bulk-update')
    async bulkUpdate(@Body() data: { ids: number[], level: number }) {
        return this.service.bulkUpdateCards(data.ids, { level: data.level });
    }

    @Put(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() data: { value?: string, category?: string, level?: number, description?: string, imageUrl?: string }) {
        return this.service.updateCard(id, data);
    }

    @Delete(':id')
    async delete(@Param('id', ParseIntPipe) id: number) {
        return this.service.deleteCard(id);
    }
}

@Controller('timesup')
export class TimesUpInfoController {
    constructor(private readonly service: TimesUpService) { }

    @Get('categories')
    async getCategories() {
        return this.service.getUniqueCategories();
    }
}
