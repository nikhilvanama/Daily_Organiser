import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import { JournalService } from './journal.service';
import { UpsertJournalDto } from './dto/upsert-journal.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('journal')
export class JournalController {
  constructor(private journalService: JournalService) {}

  // List all of the user's entries (most recent first, capped at 100).
  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.journalService.findAll(userId);
  }

  // Fetch a single date's entry. Returns null when not yet written.
  @Get(':date')
  findByDate(@CurrentUser('id') userId: string, @Param('date') date: string) {
    return this.journalService.findByDate(userId, date);
  }

  // Upsert today's (or any date's) entry. Idempotent — the client always PUTs.
  @Put(':date')
  upsert(
    @CurrentUser('id') userId: string,
    @Param('date') date: string,
    @Body() dto: UpsertJournalDto,
  ) {
    return this.journalService.upsert(userId, date, dto);
  }

  @Delete(':date')
  remove(@CurrentUser('id') userId: string, @Param('date') date: string) {
    return this.journalService.remove(userId, date);
  }
}
