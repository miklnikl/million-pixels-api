import { PrismaService } from '../prisma/prisma.service.js';

async function main() {
  const email = process.argv[2];
  if (!email || process.argv.length !== 3) {
    console.error('Usage: npm run admin:promote -- user@example.com');
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaService();
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
      select: { email: true },
    });
    console.log(`Administrator role assigned to ${user.email}`);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      console.error(
        'No registered user with this email. Register the account first.',
      );
    } else {
      console.error(
        'Unable to assign the administrator role. Check the database connection and migrations.',
      );
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

await main();
