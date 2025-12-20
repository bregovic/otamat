import { Controller, Post, Get, Param, Res, UploadedFiles, UseInterceptors } from '@nestjs/common';
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
    @Get('image/:id')
    async getCardImage(@Param('id') id: string, @Res() res: any) {
        const card = await this.dixitService.getCard(id);
        if (!card) return res.status(404).send('Not found');

        // Check if data is Base64 URI
        if (card.data.startsWith('data:')) {
            const matches = card.data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                return res.status(500).send('Invalid image data format');
            }

            const type = matches[1];
            const buffer = Buffer.from(matches[2], 'base64');

            res.setHeader('Content-Type', type);
            // Cache control for performance
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            res.send(buffer);
        } else {
            // Fallback for older cards if any (though we import as base64 now)
            res.status(400).send('Image data format not supported');
        }
    }
}
