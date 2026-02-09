-- DropIndex
DROP INDEX "Analysis_roundId_key";

-- AlterTable
ALTER TABLE "Analysis" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'bust';
