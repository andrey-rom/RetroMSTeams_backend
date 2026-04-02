-- CreateEnum
CREATE TYPE "SessionPhase" AS ENUM ('collect', 'vote', 'summary');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('draft', 'active', 'completed', 'archived');

-- CreateTable
CREATE TABLE "template_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "template_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_values" (
    "id" TEXT NOT NULL,
    "template_type_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6264A7',
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "template_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "ms_teams_id" TEXT NOT NULL,
    "ms_channel_id" TEXT NOT NULL,
    "template_type_id" TEXT NOT NULL,
    "current_status" "SessionStatus" NOT NULL DEFAULT 'draft',
    "current_phase" "SessionPhase" NOT NULL DEFAULT 'collect',
    "max_votes_per_user" INTEGER NOT NULL DEFAULT 5,
    "timer_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "report_message_id" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "column_key" TEXT NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "owner_hash" TEXT NOT NULL,
    "votes_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "voter_hash" TEXT NOT NULL,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "template_types_code_key" ON "template_types"("code");

-- CreateIndex
CREATE INDEX "template_values_template_type_id_idx" ON "template_values"("template_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "template_values_template_type_id_value_key" ON "template_values"("template_type_id", "value");

-- CreateIndex
CREATE INDEX "sessions_ms_channel_id_idx" ON "sessions"("ms_channel_id");

-- CreateIndex
CREATE INDEX "sessions_current_status_idx" ON "sessions"("current_status");

-- CreateIndex
CREATE INDEX "cards_session_id_idx" ON "cards"("session_id");

-- CreateIndex
CREATE INDEX "cards_owner_hash_idx" ON "cards"("owner_hash");

-- CreateIndex
CREATE INDEX "votes_voter_hash_idx" ON "votes"("voter_hash");

-- CreateIndex
CREATE UNIQUE INDEX "votes_card_id_voter_hash_key" ON "votes"("card_id", "voter_hash");

-- AddForeignKey
ALTER TABLE "template_values" ADD CONSTRAINT "template_values_template_type_id_fkey" FOREIGN KEY ("template_type_id") REFERENCES "template_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_template_type_id_fkey" FOREIGN KEY ("template_type_id") REFERENCES "template_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
