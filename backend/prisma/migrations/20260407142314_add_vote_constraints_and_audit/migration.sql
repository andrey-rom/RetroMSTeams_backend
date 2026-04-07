-- AlterTable
ALTER TABLE "votes" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Enforce non-negative vote tallies on cards (not expressible as @@check in this Prisma version)
ALTER TABLE "cards" ADD CONSTRAINT "cards_votes_count_nonnegative" CHECK ("votes_count" >= 0);

-- CreateIndex
CREATE INDEX "sessions_creator_id_idx" ON "sessions"("creator_id");

-- CreateIndex
CREATE INDEX "votes_created_at_idx" ON "votes"("created_at");
