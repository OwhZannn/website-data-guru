# Website Data Guru

Aplikasi untuk guru mengunggah dokumen ke Google Drive sekolah dan admin memverifikasinya. Panduan ini untuk admin yang memasang aplikasi di server Linux sekolah.

## 1. Prasyarat server

- Linux (Ubuntu/Debian disarankan) dengan akses `sudo`.
- Docker dan Docker Compose plugin (`docker compose`).
- Nginx dan Certbot (`apt install nginx certbot python3-certbot-nginx`).
- Node.js 22 dan `sqlite3` (`apt install sqlite3`) di server, untuk skrip admin dan cadangan.
- Nama domain yang mengarah ke IP server, port 80 dan 443 terbuka.

Ambil kode ke server (misal `/opt/website-data-guru`), lalu jalankan sekali: `npm ci && npx prisma generate`.

## 2. Mengisi `.env`

```
cp .env.example .env
```

| Variabel | Arti |
|---|---|
| `DATABASE_URL` | Lokasi basis data SQLite. Di Docker otomatis `file:/app/data/prod.db`. Untuk menjalankan skrip di server, pakai jalur absolut, mis. `file:/opt/website-data-guru/data/prod.db`. |
| `GOOGLE_CLIENT_ID` | ID klien OAuth (Google Cloud Console, jenis "Desktop app"). |
| `GOOGLE_CLIENT_SECRET` | Rahasia klien OAuth. |
| `GOOGLE_REFRESH_TOKEN` | Diisi dari langkah 3. |
| `DRIVE_FOLDER_ID` | ID folder Drive induk (bagian akhir URL folder). **Folder harus milik akun Gmail yang sama** dengan yang menyetujui OAuth di langkah 3; aplikasi hanya dapat mengakses berkas yang dibuatnya sendiri (scope `drive.file`). |
| `DRIVE_PALSU` | Hanya untuk tes otomatis. Kosongkan. Diabaikan di produksi. |
| `BERKAS_DB`, `DIR_CADANGAN` | Opsional, untuk skrip cadangan (bawaan `data/prod.db` dan `data/cadangan`). |

Jangan pernah memasukkan `.env` ke git (sudah ada di `.gitignore`).

## 3. Mendapatkan refresh token Google

> **PERINGATAN PENTING:** di Google Cloud Console (OAuth consent screen) status aplikasi **HARUS "In production" (Published)**, bukan "Testing". Pada status Testing, refresh token **mati sudah 7 hari** dan unggahan guru berhenti tanpa pemberitahuan. Buat tokennya SETELAH aplikasi dipublikasikan.

1. Isi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` di `.env`.
2. `set -a; . ./.env; set +a; node scripts/oauth.mjs` lalu buka URL yang dicetak, setujui dengan akun Gmail pemilik folder Drive.
3. Salin parameter `code` dari URL tujuan: `node scripts/oauth.mjs KODE`.
4. Tempel hasilnya ke `GOOGLE_REFRESH_TOKEN` di `.env`.

## 4. Menjalankan aplikasi

```
mkdir -p data && sudo chown 1000:1000 data   # kontainer berjalan sebagai uid 1000
docker compose up -d --build
docker compose logs -f
```

Migrasi basis data berjalan otomatis saat kontainer mulai. Aplikasi hanya mendengarkan di `127.0.0.1:3000`; akses publik lewat nginx.

## 5. Membuat admin pertama

```
set -a; . ./.env; set +a
export DATABASE_URL=file:$PWD/data/prod.db
node scripts/buat-admin.mjs "Nama Lengkap" email@sekolah.sch.id
```

Sandi acak dicetak **sekali saja**; catat dan minta admin menggantinya setelah masuk.

**Lewat lingkungan (tanpa SSH, cocok untuk Komodo):** isi `ADMIN_EMAIL`, `ADMIN_SANDI` (min. 8 karakter), dan `ADMIN_NAMA` (opsional), lalu deploy. Admin dibuat saat kontainer mulai bila belum ada; yang sudah ada tidak diubah. Setelah berhasil masuk, hapus `ADMIN_SANDI` dari lingkungan. Bila lupa sandi, isi `ADMIN_RESET=1` bersama sandi baru sekali jalan, lalu hapus keduanya.

### Akun guru

- **Admin** masuk memakai **email**. **Guru** masuk memakai **username**: NIP untuk PNS, PPPK, dan Paruh waktu, atau NIK untuk Non ASN.
- Akun guru dibuat dengan tiga cara. Setiap cara memberi kata sandi awal **8 angka acak** yang tampil sekali:
  - admin menambahkan satu per satu di menu Guru, tombol **Tambah guru**;
  - admin mengimpor banyak guru sekaligus di menu Guru, tombol **Impor guru**, dengan format `Nama;NIP;NIK;Status Kepegawaian;Tahun Sertifikasi`;
  - guru mendaftar sendiri di `/daftar` (tautan "Buat akun guru" di halaman masuk). Akun ini baru bisa dipakai setelah admin menekan **Setujui** di menu Guru.
- Pendaftaran dibatasi 30 kali per 15 menit per alamat IP. Batasnya longgar karena guru satu sekolah sering mendaftar dari WiFi yang sama.
- Guru mengganti kata sandinya sendiri di menu **Profil**. Admin bisa membuat kata sandi baru lewat **Atur ulang sandi**.
- Guru yang terdaftar sebelum pembaruan ini memakai NIP-nya sebagai username. Isian NIP lama dipakai apa adanya.

## 6. Nginx dan HTTPS

> **Penting: situs wajib dibuka lewat HTTPS melalui nginx.** Dalam image produksi (`NODE_ENV=production`) cookie sesi bertanda `secure`, sehingga peramban tidak menyimpannya bila situs dibuka lewat HTTP biasa, misalnya `http://IP-LAN:3000` sebelum sertifikat terbit. Gejalanya: setelah menekan "Masuk", pengguna diam-diam dikembalikan ke halaman `/masuk` tanpa pesan galat. Ini bukan sandi salah; bukalah `https://domain-sekolah.sch.id`.

```
sudo cp deploy/nginx.conf /etc/nginx/sites-available/data-guru
sudo sed -i 's/DOMAIN_ANDA/domain-sekolah.sch.id/g' /etc/nginx/sites-available/data-guru
```

Sebelum sertifikat ada, blok `443` belum bisa dimuat. Terbitkan sertifikat lebih dulu: `sudo certbot certonly --nginx -d domain-sekolah.sch.id`, baru aktifkan:

```
sudo ln -s /etc/nginx/sites-available/data-guru /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Batas unggahan 8 MB dan batas waktu 120 detik sudah diatur di berkas tersebut. Certbot memperbarui sertifikat otomatis.

## 7. Cadangan otomatis (crontab)

Folder `data/` dimiliki uid 1000, jadi cron **harus berjalan sebagai pengguna ber-uid 1000** (cek dengan `id -un 1000`), kalau tidak cadangan gagal tanpa suara:

```
sudo crontab -u $(id -un 1000) -e
```

```
# 02:00 buat salinan lokal (simpan 30 terakhir), 02:15 kirim yang terbaru ke Drive
# (di folder Drive 'Cadangan Basis Data' juga disimpan 30 terbaru; berkas lain di folder itu tidak disentuh)
0 2 * * *  cd /opt/website-data-guru && node scripts/cadangan.mjs >> data/cadangan.log 2>&1
15 2 * * * cd /opt/website-data-guru && set -a && . ./.env && set +a && node scripts/cadangan-ke-drive.mjs >> data/cadangan.log 2>&1
```

Verifikasi cadangan pertama sungguh terbentuk: jalankan sekali dengan tangan sebagai pengguna itu, lalu lihat hasilnya.

```
sudo -u '#1000' bash -c 'cd /opt/website-data-guru && node scripts/cadangan.mjs' && ls data/cadangan
```

Salinan lokal ada di `data/cadangan/prod-YYYY-MM-DD.db`; salinan Drive ada di subfolder "Cadangan Basis Data" (tidak dihapus otomatis; bersihkan manual sesekali). Periksa `data/cadangan.log` secara berkala.

## 8. Memulihkan cadangan

```
cd /opt/website-data-guru
docker compose down
mv data/prod.db data/prod.db.rusak          # simpan dulu, jangan dihapus
rm -f data/prod.db-wal data/prod.db-shm
cp data/cadangan/prod-2026-01-31.db data/prod.db   # pilih tanggal yang diinginkan
sudo chown 1000:1000 data/prod.db
sqlite3 data/prod.db "SELECT COUNT(*) FROM Guru;"   # pastikan masuk akal
docker compose up -d
```

Uji pemulihan ke direktori sementara secara berkala (salin cadangan ke `/tmp`, jalankan `DATABASE_URL=file:/tmp/uji.db npx prisma migrate status` dan satu kueri hitung). Cadangan yang belum pernah diuji bukan cadangan.

## 9. Memperbarui ke versi baru

```
cd /opt/website-data-guru
node scripts/cadangan.mjs        # cadangan dulu
git pull
npm ci && npx prisma generate
docker compose up -d --build     # migrasi berjalan otomatis
```

## 10. Daftar periksa sebelum dibuka

- [ ] Server berarsitektur x86_64/amd64. Image menargetkan `linux-musl-openssl-3.0.x`; build sengaja gagal di arm64.
- [ ] Beranda admin dan halaman Detail Guru tidak menampilkan banner merah "Google Drive bermasalah". Admin yang sudah masuk juga bisa membuka `/api/kesehatan` (`{"drive":"ok","basisData":"ok"}`).
- [ ] Status aplikasi OAuth Google "In production", token dibuat sesudahnya.
- [ ] `DRIVE_FOLDER_ID` milik Gmail yang sama dengan token.
- [ ] `https://domain` terbuka, HTTP dialihkan ke HTTPS. Semua pengguna masuk lewat alamat HTTPS ini, bukan `http://IP:3000` (cookie sesi `secure` tidak tersimpan lewat HTTP, sehingga masuk akan selalu kembali ke `/masuk`).
- [ ] Admin pertama bisa masuk; sandi sudah diganti.
- [ ] Satu guru uji mengunggah dokumen dan berkasnya muncul di Drive.
- [ ] Unggahan PDF/JPG sampai 3 MB berhasil, lebih dari itu ditolak dengan pesan yang jelas.
- [ ] `node scripts/cadangan.mjs` dan `cadangan-ke-drive.mjs` berhasil; satu cadangan sudah diuji pulih.
- [ ] Baris crontab terpasang; `docker compose ps` menunjukkan `restart: unless-stopped` dan server dinyalakan ulang dengan baik.
- [ ] Port 3000 tidak terbuka dari luar (`curl http://IP-SERVER:3000` gagal).
