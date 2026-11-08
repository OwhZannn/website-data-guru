-- CreateTable
CREATE TABLE "AlasanTolak" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teks" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "dibuatPada" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed empat alasan bawaan supaya produksi langsung punya preset
INSERT INTO "AlasanTolak" ("id", "teks", "urutan", "aktif", "dibuatPada") VALUES
  ('alasan-01', 'File tidak terbaca',                1, 1, CURRENT_TIMESTAMP),
  ('alasan-02', 'Bukan dokumen yang diminta',         2, 1, CURRENT_TIMESTAMP),
  ('alasan-03', 'Sudah kedaluwarsa',                  3, 1, CURRENT_TIMESTAMP),
  ('alasan-04', 'Tanda tangan/stempel kurang',        4, 1, CURRENT_TIMESTAMP);
