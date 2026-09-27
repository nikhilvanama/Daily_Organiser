import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

// AiModule — natural-language helpers backed by the Gemini API.
// Requires GEMINI_API_KEY in the environment; endpoints answer 503 without it.
@Module({
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
