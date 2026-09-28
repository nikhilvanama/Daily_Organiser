import { Body, Controller, Post } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AiService, QuickAddMode } from './ai.service';

class QuickAddDto {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  text: string;

  // Set when the user typed a /command — forces the target instead of guessing
  @IsOptional()
  @IsIn(['plan', 'journal', 'trip', 'buy'])
  mode?: QuickAddMode;
}

// Protected by the global JwtAuthGuard like every other controller —
// only signed-in users can spend AI quota.
@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  // POST /api/ai/quick-add — parse a sentence into a plan draft.
  // The frontend then creates the task through the normal POST /api/tasks flow.
  @Post('quick-add')
  quickAdd(@Body() dto: QuickAddDto) {
    return this.ai.quickAdd(dto.text, dto.mode);
  }
}
