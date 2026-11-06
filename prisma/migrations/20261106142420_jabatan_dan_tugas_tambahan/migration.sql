-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "jabatan" TEXT NOT NULL DEFAULT 'GURU',
    "tahunSertifikasi" INTEGER,
    "sertifikasiBaru" BOOLEAN NOT NULL DEFAULT false,
    "tugasLabPerpus" BOOLEAN NOT NULL DEFAULT false,
    "tugasTbq" BOOLEAN NOT NULL DEFAULT false,
    "tugasRohis" BOOLEAN NOT NULL DEFAULT false,
    "tugasImtaq" BOOLEAN NOT NULL DEFAULT false,
    "tugasInklusi" BOOLEAN NOT NULL DEFAULT false,
    "tugasWakasek" BOOLEAN NOT NULL DEFAULT false,
    "tugasOsis" BOOLEAN NOT NULL DEFAULT false,
    "tugasWaliKelas" BOOLEAN NOT NULL DEFAULT false,
    "tugasPiket" BOOLEAN NOT NULL DEFAULT false,
    "tugasGuruWali" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Guru" ("aktif", "asalSekolah", "dibuatPada", "email", "hashSandi", "id", "nama", "nip", "sertifikasiBaru", "statusPegawai", "tahunSertifikasi", "tugasImtaq", "tugasInklusi", "tugasLabPerpus", "tugasRohis", "tugasTbq") SELECT "aktif", "asalSekolah", "dibuatPada", "email", "hashSandi", "id", "nama", "nip", "sertifikasiBaru", "statusPegawai", "tahunSertifikasi", "tugasImtaq", "tugasInklusi", "tugasLabPerpus", "tugasRohis", "tugasTbq" FROM "Guru";
DROP TABLE "Guru";
ALTER TABLE "new_Guru" RENAME TO "Guru";
CREATE UNIQUE INDEX "Guru_nip_key" ON "Guru"("nip");
CREATE UNIQUE INDEX "Guru_email_key" ON "Guru"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
