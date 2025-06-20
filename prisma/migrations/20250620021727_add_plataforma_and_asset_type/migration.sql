-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "assetType" TEXT,
ADD COLUMN     "plataforma" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_assetType_idx" ON "Transaction"("assetType");
