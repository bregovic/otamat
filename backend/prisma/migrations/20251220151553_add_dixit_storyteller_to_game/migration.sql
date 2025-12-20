-- CreateEnum
CREATE TYPE "DixitPhase" AS ENUM ('LOBBY', 'STORYTELLER_PICK', 'PLAYERS_PICK', 'VOTING', 'SCORING', 'FINISHED');

-- DropForeignKey
ALTER TABLE "GameQuestion" DROP CONSTRAINT "GameQuestion_questionId_fkey";

-- CreateTable
CREATE TABLE "DixitGame" (
    "id" TEXT NOT NULL,
    "pinCode" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'WAITING',
    "phase" "DixitPhase" NOT NULL DEFAULT 'LOBBY',
    "hostId" TEXT NOT NULL,
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deck" TEXT[],
    "storytellerId" TEXT,

    CONSTRAINT "DixitGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DixitPlayer" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT,
    "nickname" TEXT NOT NULL,
    "avatar" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "hand" TEXT[],
    "isStoryteller" BOOLEAN NOT NULL DEFAULT false,
    "submittedCardId" TEXT,
    "votedCardId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DixitPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DixitRound" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "storytellerId" TEXT NOT NULL,
    "clue" TEXT NOT NULL,
    "cardsPlayed" JSONB NOT NULL,
    "votes" JSONB NOT NULL,
    "scores" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DixitRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DixitCard" (
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DixitCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DixitGame_pinCode_key" ON "DixitGame"("pinCode");

-- AddForeignKey
ALTER TABLE "GameQuestion" ADD CONSTRAINT "GameQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DixitGame" ADD CONSTRAINT "DixitGame_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DixitPlayer" ADD CONSTRAINT "DixitPlayer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "DixitGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DixitPlayer" ADD CONSTRAINT "DixitPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DixitRound" ADD CONSTRAINT "DixitRound_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "DixitGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
