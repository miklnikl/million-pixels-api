import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { SessionService } from '../auth/session.service.js';
import type { Response } from 'express';

it('registers the user and immediately starts a session', async () => {
  const user = { id: 'user-1', email: 'user@example.com' };
  const users = { create: vi.fn().mockResolvedValue(user) };
  const sessions = { create: vi.fn() };
  const controller = new UsersController(
    users as unknown as UsersService,
    sessions as unknown as SessionService,
  );
  const response = {} as Response;
  const data = { email: user.email, password: 'strong-password' };
  await expect(controller.create(data, response)).resolves.toEqual(user);
  expect(users.create).toHaveBeenCalledWith(data);
  expect(sessions.create).toHaveBeenCalledWith(user.id, response);
});
