-- CreateTable
CREATE TABLE "Luminaria" (
    "id" SERIAL NOT NULL,
    "sector" TEXT NOT NULL,
    "potencia" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'encendida',
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Luminaria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Luminaria_sector_idx" ON "Luminaria"("sector");
