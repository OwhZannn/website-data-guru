-- CreateIndex
CREATE INDEX "Riwayat_guruId_dokumenId_idx" ON "Riwayat"("guruId", "dokumenId");

-- CreateIndex
CREATE INDEX "Riwayat_periodeId_waktu_idx" ON "Riwayat"("periodeId", "waktu");
