/*
  Warnings:

  - A unique constraint covering the columns `[codigo]` on the table `Luminaria` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Luminaria" ADD COLUMN     "codigo" TEXT,
ADD COLUMN     "direccion" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Luminaria_codigo_key" ON "Luminaria"("codigo");
