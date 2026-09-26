import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule } from './auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { PixelBlocksModule } from '../pixel-blocks/pixel-blocks.module.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('Authentication and ownership over HTTP', () => {
  let app: INestApplication;
  const users = new Map<string, Record<string, unknown>>();
  const sessions = new Map<string, { userId: string; expiresAt: Date }>();
  const blocks = new Map<string, Record<string, unknown>>();
  const prisma = {
    user: {
      findUnique: vi.fn(async ({ where }) => users.get(where.email) ?? null),
      create: vi.fn(async ({ data }) => {
        const user = {
          ...data,
          id: `owner-${users.size + 1}`,
          role: 'USER',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        users.set(data.email, user);
        const { passwordHash: _, ...publicUser } = user;
        return publicUser;
      }),
    },
    session: {
      create: vi.fn(async ({ data }) => {
        sessions.set(data.tokenHash, data);
        return data;
      }),
      findUnique: vi.fn(async ({ where }) => {
        const session = sessions.get(where.tokenHash);
        if (!session) return null;
        const user = [...users.values()].find(
          (user) => user.id === session.userId,
        );
        if (!user) return null;
        const { passwordHash: _, ...publicUser } = user;
        return { ...session, user: publicUser };
      }),
      deleteMany: vi.fn(async ({ where }) => {
        sessions.delete(where.tokenHash);
        return { count: 1 };
      }),
    },
    pixelBlock: {
      findMany: vi.fn(async ({ where } = {}) =>
        [...blocks.values()].filter((block) => block.id !== where?.id?.not),
      ),
      findUnique: vi.fn(async ({ where }) => blocks.get(where.id) ?? null),
      create: vi.fn(async ({ data }) => {
        const block = { ...data, id: 'block-1' };
        blocks.set(block.id, block);
        return block;
      }),
      update: vi.fn(async ({ where, data }) => {
        const updated = { ...blocks.get(where.id), ...data };
        blocks.set(where.id, updated);
        return updated;
      }),
      delete: vi.fn(async ({ where }) => {
        blocks.delete(where.id);
      }),
    },
  };
  const credentials = {
    email: 'user@example.com',
    password: 'strong-password',
  };
  const block = {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    contentType: 'TEXT',
    colors: ['#000000'],
  };

  beforeEach(async () => {
    users.clear();
    sessions.clear();
    blocks.clear();
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      imports: [AuthModule, UsersModule, PixelBlocksModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });

  it('allows public reads but rejects anonymous writes and session lookup', async () => {
    await request(app.getHttpServer()).get('/pixel-blocks').expect(200);
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer())
      .post('/pixel-blocks')
      .send(block)
      .expect(401);
    await request(app.getHttpServer())
      .put('/pixel-blocks/block-1')
      .send(block)
      .expect(401);
    await request(app.getHttpServer())
      .delete('/pixel-blocks/block-1')
      .send({})
      .expect(401);
  });

  it('registers, persists the session, assigns ownership, and revokes on logout', async () => {
    const server = app.getHttpServer();
    const agent = request.agent(server);
    const registered = await agent.post('/users').send(credentials).expect(201);
    expect(registered.body.passwordHash).toBeUndefined();
    const cookies = registered.headers['set-cookie'] as unknown as string[];
    expect(cookies[0]).toContain('HttpOnly');
    expect(cookies[0]).toContain('SameSite=Lax');
    const cookie = cookies[0].split(';')[0];
    await agent
      .get('/auth/me')
      .expect(200)
      .expect(({ body }) => expect(body.id).toBe('owner-1'));
    const created = await agent
      .post('/pixel-blocks')
      .send({ ...block, userId: 'forged-owner' })
      .expect(201);
    expect(created.body.userId).toBe('owner-1');
    await agent
      .put('/pixel-blocks/block-1')
      .send({ ...block, x: 2 })
      .expect(200);
    await agent.delete('/pixel-blocks/block-1').send({}).expect(204);
    await agent.post('/auth/logout').send({}).expect(204);
    await request(server).get('/auth/me').set('Cookie', cookie).expect(401);
    await agent.get('/auth/me').expect(401);
  });

  it('signs in, rejects invalid credentials, and forbids changes to another owner or legacy block', async () => {
    const server = app.getHttpServer();
    await request(server).post('/users').send(credentials).expect(201);
    await request(server).post('/users').send(credentials).expect(409);
    await request(server)
      .post('/auth/login')
      .send({ ...credentials, password: 'wrong-password' })
      .expect(401);
    const agent = request.agent(server);
    await agent.post('/auth/login').send(credentials).expect(200);
    for (const userId of ['another-owner', null]) {
      blocks.set('block-1', { ...block, id: 'block-1', userId });
      await agent.get('/pixel-blocks/block-1').expect(200);
      await agent.put('/pixel-blocks/block-1').send(block).expect(403);
      await agent.delete('/pixel-blocks/block-1').send({}).expect(403);
    }
  });

  it('rejects expired sessions and cross-origin or form mutations', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/users').send(credentials).expect(201);
    await agent
      .post('/pixel-blocks')
      .set('Origin', 'https://other.example')
      .send(block)
      .expect(403);
    await agent.post('/auth/logout').type('form').send({}).expect(403);
    for (const session of sessions.values()) session.expiresAt = new Date(0);
    await agent.get('/auth/me').expect(401);
    await agent.post('/pixel-blocks').send(block).expect(401);
  });
  it('does not allow role escalation through registration', async () => {
    const agent = request.agent(app.getHttpServer());
    const registered = await agent
      .post('/users')
      .send({ ...credentials, role: 'ADMIN' })
      .expect(201);
    expect(registered.body.role).toBe('USER');
    expect(prisma.user.create.mock.calls[0][0].data.role).toBeUndefined();
    const me = await agent.get('/auth/me').expect(200);
    expect(me.body.role).toBe('USER');
    blocks.set('block-1', { ...block, id: 'block-1', userId: null });
    await agent
      .put('/pixel-blocks/block-1')
      .send({ ...block, role: 'ADMIN' })
      .expect(403);
  });

  it('allows admin creation and ownership transfer to an existing account, then respects demotion', async () => {
    const server = app.getHttpServer();
    const admin = request.agent(server);
    const owner = request.agent(server);
    await admin.post('/users').send(credentials).expect(201);
    await owner
      .post('/users')
      .send({ ...credentials, email: 'owner@example.com' })
      .expect(201);
    users.get(credentials.email)!.role = 'ADMIN';
    const me = await admin.get('/auth/me').expect(200);
    expect(me.body.role).toBe('ADMIN');
    await admin.post('/pixel-blocks').send(block).expect(201);
    expect(blocks.get('block-1')!.userId).toBe('owner-1');
    await admin.delete('/pixel-blocks/block-1').send({}).expect(204);
    await admin
      .post('/pixel-blocks')
      .send({ ...block, ownerEmail: 'owner@example.com' })
      .expect(201);
    expect(blocks.get('block-1')!.userId).toBe('owner-2');
    await owner.put('/pixel-blocks/block-1').send(block).expect(200);
    await owner
      .put('/pixel-blocks/block-1')
      .send({ ...block, ownerEmail: credentials.email })
      .expect(403);
    await admin
      .put('/pixel-blocks/block-1')
      .send({ ...block, ownerEmail: 'missing@example.com' })
      .expect(404);
    expect(blocks.get('block-1')!.userId).toBe('owner-2');
    await admin
      .put('/pixel-blocks/block-1')
      .send({ ...block, ownerEmail: credentials.email })
      .expect(200);
    await owner.put('/pixel-blocks/block-1').send(block).expect(403);
    await admin
      .put('/pixel-blocks/block-1')
      .send({ ...block, ownerEmail: 'owner@example.com' })
      .expect(200);
    users.get(credentials.email)!.role = 'USER';
    await admin.put('/pixel-blocks/block-1').send(block).expect(403);
    await admin.delete('/pixel-blocks/block-1').send({}).expect(403);
  });

  it('allows admins to edit and delete legacy and other users blocks without assigning ownership', async () => {
    const admin = request.agent(app.getHttpServer());
    await admin.post('/users').send(credentials).expect(201);
    users.get(credentials.email)!.role = 'ADMIN';
    for (const userId of [null, 'other-owner']) {
      blocks.set('block-1', { ...block, id: 'block-1', userId });
      const updated = await admin
        .put('/pixel-blocks/block-1')
        .send(block)
        .expect(200);
      expect(updated.body.userId).toBe(userId);
      await admin.delete('/pixel-blocks/block-1').send({}).expect(204);
    }
  });

  it('validates owner email and refuses admin creation for unknown users', async () => {
    const admin = request.agent(app.getHttpServer());
    await admin.post('/users').send(credentials).expect(201);
    users.get(credentials.email)!.role = 'ADMIN';
    for (const ownerEmail of [null, '', 'invalid']) {
      await admin
        .post('/pixel-blocks')
        .send({ ...block, ownerEmail })
        .expect(400);
    }
    await admin
      .post('/pixel-blocks')
      .send({ ...block, ownerEmail: 'missing@example.com' })
      .expect(404);
    expect(prisma.pixelBlock.create).not.toHaveBeenCalled();
  });
});
