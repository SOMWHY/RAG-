DROP INDEX "chunks_embedding_idx";--> statement-breakpoint
ALTER TABLE "chunks" ALTER COLUMN "embedding" SET DATA TYPE vector(2048);