-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashSandi" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "dibuatPada" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Guru" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "nip" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashSandi" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "dibuatPada" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Periode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "dibuka" BOOLEAN NOT NULL DEFAULT false,
    "dibuatPada" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DaftarDokumen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodeId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "DaftarDokumen_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DokumenGuru" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodeId" TEXT NOT NULL,
    "guruId" TEXT NOT NULL,
    "dokumenId" TEXT NOT NULL,
    "fileId" TEXT,
    "namaFile" TEXT,
    "tipe" TEXT,
    "ukuran" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'BELUM',
    "alasan" TEXT,
    "diperiksaOleh" TEXT,
    "diperiksaPada" DATETIME,
    "diunggahPada" DATETIME,
    CONSTRAINT "DokumenGuru_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DokumenGuru_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "Guru" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DokumenGuru_dokumenId_fkey" FOREIGN KEY ("dokumenId") REFERENCES "DaftarDokumen" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Riwayat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "waktu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodeId" TEXT NOT NULL,
    "guruId" TEXT,
    "dokumenId" TEXT,
    "aksi" TEXT NOT NULL,
    "alasan" TEXT,
    "oleh" TEXT NOT NULL,
    "olehTipe" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Sesi" (
    "token" TEXT NOT NULL PRIMARY KEY,
    "pemilikId" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "kedaluwarsa" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PercobaanMasuk" (
    "kunci" TEXT NOT NULL PRIMARY KEY,
    "gagal" INTEGER NOT NULL DEFAULT 0,
    "sejak" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Guru_nip_key" ON "Guru"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "Guru_email_key" ON "Guru"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DokumenGuru_periodeId_guruId_dokumenId_key" ON "DokumenGuru"("periodeId", "guruId", "dokumenId");
