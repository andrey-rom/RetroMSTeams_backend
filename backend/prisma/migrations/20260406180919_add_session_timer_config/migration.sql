-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "collect_grace_at" TIMESTAMP(3),
ADD COLUMN     "collect_timer_seconds" INTEGER,
ADD COLUMN     "vote_timer_seconds" INTEGER;
