import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';

// PushModule — Web Push reminder notifications (daily routine + 11pm journal).
// Requires VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in the environment.
@Module({
  controllers: [PushController],
  providers: [PushService],
})
export class PushModule {}
