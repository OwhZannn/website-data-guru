-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DaftarDokumen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodeId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "berlakuUntuk" TEXT NOT NULL DEFAULT 'semua',
    CONSTRAINT "DaftarDokumen_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DaftarDokumen" ("aktif", "id", "nama", "periodeId", "urutan") SELECT "aktif", "id", "nama", "periodeId", "urutan" FROM "DaftarDokumen";
DROP TABLE "DaftarDokumen";
ALTER TABLE "new_DaftarDokumen" RENAME TO "DaftarDokumen";
CREATE TABLE "new_Guru" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "nip" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashSandi" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "dibuatPada" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "asalSekolah" TEXT,
    "statusPegawai" TEXT,
    "tahunSertifikasi" INTEGER,
    "sertifikasiBaru" BOOLEAN NOT NULL DEFAULT false,
    "tugasLabPerpus" BOOLEAN NOT NULL DEFAULT false,
    "tugasTbq" BOOLEAN NOT NULL DEFAULT false,
    "tugasRohis" BOOLEAN NOT NULL DEFAULT false,
    "tugasImtaq" BOOLEAN NOT NULL DEFAULT false,
    "tugasInklusi" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Guru" ("aktif", "dibuatPada", "email", "hashSandi", "id", "nama", "nip") SELECT "aktif", "dibuatPada", "email", "hashSandi", "id", "nama", "nip" FROM "Guru";
DROP TABLE "Guru";
ALTER TABLE "new_Guru" RENAME TO "Guru";
CREATE UNIQUE INDEX "Guru_nip_key" ON "Guru"("nip");
CREATE UNIQUE INDEX "Guru_email_key" ON "Guru"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
