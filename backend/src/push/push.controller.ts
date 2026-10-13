import { Body, Controller, Get, Post } from '@nestjs/common';
import { PushService } from './push.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Protected by the global JwtAuthGuard — subscriptions always belong to a user.
@Controller('push')
export class PushController {
  constructor(private push: PushService) {}

  // The VAPID public key the browser needs to create a subscription
  @Get('public-key')
  publicKey() {
    return this.push.publicKey();
  }

  @Post('subscribe')
  subscribe(@CurrentUser('id') userId: string, @Body() body: { subscription: any }) {
    return this.push.subscribe(userId, body?.subscription);
  }

  @Post('unsubscribe')
  unsubscribe(@CurrentUser('id') userId: string, @Body() body: { endpoint: string }) {
    return this.push.unsubscribe(userId, body?.endpoint ?? '');
  }

  @Post('test')
  test(@CurrentUser('id') userId: string) {
    return this.push.sendTest(userId);
  }
}
