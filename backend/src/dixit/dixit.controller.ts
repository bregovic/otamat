import { Controller, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { DixitService } from './dixit.service';

@Controller('dixit')
export class DixitController {
    constructor(private readonly dixitService: DixitService) { }

    @Post('upload')
    @UseInterceptors(FilesInterceptor('files'))
    async uploadCards(@UploadedFiles() files: Array<Express.Multer.File>) {
        return this.dixitService.uploadCards(files.map(f => ({
            buffer: f.buffer,
            originalname: f.originalname
        })));
    }
}
