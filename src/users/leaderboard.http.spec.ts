import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UsersModule } from './users.module.js';
import { PrismaService } from '../prisma/prisma.service.js';

it('serves block previews and prices publicly without exposing full emails or user records', async () => {
  const block = {
    width: 3,
    height: 4,
    colors: ['#ff0000'],
    contentType: 'TEXT',
    content: 'Hello',
  };
  const module = await Test.createTestingModule({ imports: [UsersModule] })
    .overrideProvider(PrismaService)
    .useValue({
      pixelBlock: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { ...block, user: { email: 'alice@example.com' } },
          ]),
      },
    })
    .compile();
  const app = module.createNestApplication();
  await app.init();
  try {
    const response = await request(app.getHttpServer())
      .get('/users/leaderboard')
      .expect(200);
    expect(response.body).toEqual([
      {
        rank: 1,
        maskedEmail: 'a***@example.com',
        pixels: 12,
        block: { ...block, priceUsd: 12 },
      },
    ]);
    expect(response.text).not.toContain('alice@example.com');
    expect(response.body[0].block.user).toBeUndefined();
  } finally {
    await app.close();
  }
});
