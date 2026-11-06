/*
  Warnings:

  - Added the required column `username` to the `Guru` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Guru" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "nip" TEXT,
    "nik" TEXT,
    "email" TEXT,
    "disetujui" BOOLEAN NOT NULL DEFAULT true,
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
-- Guru lama: username = NIP yang sudah ada.
INSERT INTO "new_Guru" ("username", "aktif", "asalSekolah", "dibuatPada", "email", "hashSandi", "id", "jabatan", "nama", "nip", "sertifikasiBaru", "statusPegawai", "tahunSertifikasi", "tugasGuruWali", "tugasImtaq", "tugasInklusi", "tugasLabPerpus", "tugasOsis", "tugasPiket", "tugasRohis", "tugasTbq", "tugasWakasek", "tugasWaliKelas") SELECT "nip", "aktif", "asalSekolah", "dibuatPada", "email", "hashSandi", "id", "jabatan", "nama", "nip", "sertifikasiBaru", "statusPegawai", "tahunSertifikasi", "tugasGuruWali", "tugasImtaq", "tugasInklusi", "tugasLabPerpus", "tugasOsis", "tugasPiket", "tugasRohis", "tugasTbq", "tugasWakasek", "tugasWaliKelas" FROM "Guru";
DROP TABLE "Guru";
ALTER TABLE "new_Guru" RENAME TO "Guru";
CREATE UNIQUE INDEX "Guru_username_key" ON "Guru"("username");
CREATE UNIQUE INDEX "Guru_nip_key" ON "Guru"("nip");
CREATE UNIQUE INDEX "Guru_nik_key" ON "Guru"("nik");
CREATE UNIQUE INDEX "Guru_email_key" ON "Guru"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
