-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('IMAGE', 'TEXT');

-- CreateTable
CREATE TABLE "PixelBlock" (
    "id" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "contentType" "ContentType",
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PixelBlock_pkey" PRIMARY KEY ("id")
);
