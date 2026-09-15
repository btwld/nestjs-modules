import { type FileCreateDto } from '../dto/file-create.dto';
import { type FileService } from '../services/file.service';

export class AwsController {
  constructor(private fileService: FileService) {}

  async create(fileDto: FileCreateDto) {
    return this.fileService.push({
      ...fileDto,
      serviceKey: 'my-aws-storage',
    });
  }

  async get(fileId: string) {
    return this.fileService.fetch({
      id: fileId,
    });
  }
}
