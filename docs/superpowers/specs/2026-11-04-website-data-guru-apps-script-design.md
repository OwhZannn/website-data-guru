# Website Data Guru — Rancangan Alternatif: Google Apps Script

Tanggal: 2026-11-04
Status: menunggu keputusan — belum disetujui
Rancangan pasangan: `2026-11-04-website-data-guru-design.md` (jalur server sendiri)

## 0. Ringkas: apakah jalur ini layak?

**Ya, tapi bergantung pada satu hal yang belum bisa saya pastikan dari dokumentasi Google.**

Apps Script menghapus seluruh kebutuhan server: tidak ada Docker, tidak ada HTTPS yang diatur sendiri, tidak ada OAuth refresh token yang bisa kedaluwarsa, tidak ada tagihan. Drive dan basis datanya sudah menyatu. Untuk sekolah yang tidak punya staf IT, ini keuntungan besar.

Tapi ada satu tembok yang harus diuji lebih dulu: **kuota waktu jalan harian untuk akun Gmail biasa adalah 90 menit per hari.** Dokumentasi Google tidak menyatakan bahwa permintaan web app (`doGet`/`doPost`) dibebaskan dari kuota ini. Kalau ternyata tidak dibebaskan, hitungannya seperti ini:

| Perkiraan | Angka |
|---|---|
| Dokumen yang harus masuk | 300 guru × 5 dokumen = 1.500 unggahan |
| Waktu satu permintaan unggah (tulis ke Drive + catat + riwayat) | 3–8 detik |
| Total waktu jalan | **75–200 menit** |
| Kuota harian akun Gmail biasa | **90 menit** |

Artinya: kalau guru mengunggah secara merata selama beberapa hari, kuota ini cukup. Kalau 300 guru menyerbu dalam satu-dua hari menjelang tenggat, sistem akan berhenti di tengah jalan dan guru melihat pesan error. Tambahan lagi, setiap unggah ulang menambah beban.

**Tembok kedua dan ketiga**, keduanya juga berasal dari pemiliknya Gmail biasa dan bukan Google Workspace:

- **Email maksimal 100 penerima per hari.** Anda tidak bisa mengabari 300 guru lewat email dalam sehari. Pemberitahuan harus lewat grup WhatsApp, atau guru memeriksa sendiri di website.
- **Tidak ada domain sendiri.** Alamatnya berupa `script.google.com/macros/s/AKfy.../exec` yang panjang dan sulit diingat, tidak bisa dijadikan `data-guru.sekolah.sch.id`.

**Cara mengujinya murah**: buat web app percobaan, jalankan 50 unggahan berturut-turut, lalu lihat apakah muncul error kuota. Kalau lolos dengan lega, jalur ini yang paling hemat tenaga.

## 1. Kenapa ini dipertimbangkan

- Tidak ada yang perlu dipasang atau dirawat di server mana pun.
- File dokumen masuk ke Drive yang sama dengan yang sudah Anda pakai — tanpa OAuth, tanpa akun layanan.
- Basis datanya berupa Google Sheets, yang bisa **dibuka langsung oleh admin** tanpa aplikasi tambahan. Untuk admin sekolah, melihat datanya di spreadsheet adalah keuntungan nyata, bukan kekurangan.
- Gratis, dan tidak akan tiba-tiba menagih.
- Admin bisa diberi akses edit ke spreadsheet-nya untuk keperluan darurat.

## 2. Bentuk sistemnya

Sama persis dengan rancangan pasangan pada bagian tujuan, bukan tujuan, peran, alur, dan aturan penegakan. Yang berbeda hanya bahan bangunannya.

| Kebutuhan | Di jalur server | Di jalur Apps Script |
|---|---|---|
| Tampilan website | Next.js | `HtmlService` — HTML/CSS/JS biasa, disajikan lewat `doGet` |
| Logika server | Kode Next.js | Fungsi `.gs` di dalam proyek Apps Script |
| Basis data | SQLite + Prisma | Google Sheets, satu sheet per tabel |
| Penyimpanan file | Google Drive via OAuth | Google Drive langsung (`DriveApp`) — tanpa OAuth |
| Akun & sesi | Tabel guru + cookie | Tabel guru + cookie, token sesi disimpan di sheet |
| Kunci anti-tabrakan | Transaksi basis data | `LockService.getScriptLock()` |
| HTTPS | nginx + Let's Encrypt | Sudah otomatis dari Google |
| Biaya | Sewa server | Nol |

### 2.1 Susunan sheet

- **`Guru`** — id, nama, nip, email, hash sandi, garam, aktif
- **`Admin`** — id, nama, email, hash sandi, garam
- **`Periode`** — id, nama, status (buka/tutup), dibuatPada
- **`DaftarDokumen`** — id, periodeId, nama, urutan, wajib, aktif
- **`DokumenGuru`** — id, periodeId, guruId, dokumenId, fileId, namaFile, tipe, ukuran, status, alasan, diperiksaOleh, diperiksaPada, diunggahPada
- **`Riwayat`** — waktu, periodeId, guruId, dokumenId, aksi, alasan, oleh
- **`Sesi`** — token, pemilikId, tipe, kedaluwarsa
- **`Pengaturan`** — kunci, nilai (mis. admin pertama saat pemasangan)

**Kegiatan berulang ditangani lewat `Periode`.** Daftar dokumen disusun per periode, dan status dokumen guru juga per periode. Jadi baris `DokumenGuru` selalu terikat pada satu periode, dan riwayat periode lama tidak pernah tersentuh saat periode baru dibuka. Status **Terverifikasi** tidak disimpan sebagai kolom — ia dihitung dari keadaan dokumen periode itu, supaya tidak bisa berbeda dari kenyataan.

**Catatan penting soal `Sesi`:** jangan simpan sesi di Properties Service. Untuk akun Gmail biasa, ruang seluruh penyimpanan properti hanya **500 KB** dan satu nilai maksimal 9 KB. Dengan ratusan guru masuk, itu cepat penuh. Simpan di sheet.

### 2.2 Aturan bergaya wajib di jalur ini

- **Setiap penulisan dibungkus `LockService`.** Kalau tidak, dua admin yang menyahkan dua dokumen pada detik yang sama bisa saling menimpa catatan. Ini bukan kehati-hatian berlebih — ini penyebab kerusakan data paling umum di sistem berbasis Sheets.
- **Unggahan diproses dalam satu permintaan yang harus selesai di bawah 6 menit.** Tidak ada pemrosesan latar belakang. Batas 5 MB per file dari rancangan pasangan tetap berlaku, dan sebaiknya diturunkan menjadi 2–3 MB dengan pengecilan gambar di peramban.
- **Kuota 10 panggilan serentak** pada `google.script.run`. Unggahan lebih dari itu akan mengantre, tidak gagal — tapi terasa lambat.
- **Satu deployment dengan URL tetap.** Setiap perubahan kode harus dipasang lewat "Manage deployments" → "Edit" → versi baru, bukan "New deployment", supaya alamatnya tidak berubah dan tidak perlu dibagikan ulang ke 300 guru.

## 3. Kuota yang perlu diketahui (akun Gmail biasa vs Workspace)

| Kuota | Gmail biasa | Workspace |
|---|---|---|
| Waktu jalan per eksekusi | 6 menit | 6 menit |
| **Total waktu jalan trigger per hari** | **90 menit** | **6 jam** |
| Panggilan URL Fetch per hari | 20.000 | 100.000 |
| Baca/tulis Properties per hari | 50.000 | 500.000 |
| Ruang penyimpanan Properties | 500 KB | 500 KB |
| **Penerima email per hari** | **100** | **1.500** |
| Eksekusi serentak | 30 per pengguna / 1.000 per skrip | sama |
| File dibuat per hari | (tidak ada kuota khusus Drive di halaman ini) | — |

Sumber: [dokumentasi kuota Apps Script](https://developers.google.com/apps-script/guides/services/quotas). Catatan: halaman itu **tidak menyebutkan web app sama sekali** — tidak ada pernyataan bahwa `doGet`/`doPost` dibebaskan dari kuota waktu jalan trigger. Karena itu hitungan di bagian 0 adalah perkiraan yang harus diuji, bukan kepastian.

## 4. Yang hilang dibanding jalur server

- Notifikasi email massal (batas 100 penerima/hari).
- Domain sekolah sendiri.
- Pemrosesan latar belakang untuk unggahan besar.
- Halaman yang bisa diuji otomatis dengan mudah.
- Kelegaan kalau ada lonjakan pengguna di hari terakhir.

## 5. Yang didapat dibanding jalur server

- Nol pemasangan, nol perawatan, nol biaya.
- Tidak ada OAuth refresh token dan tidak ada jebakan "aplikasi Testing mati setelah 7 hari" yang disebut di rancangan pasangan bagian 5.
- Admin bisa membuka datanya langsung di Sheets.
- Bisa dilihat dan diubah isinya tanpa alat apa pun kalau website bermasalah — inilah jaring pengaman terbaiknya.

## 6. Kapan memilih yang mana

**Pilih Apps Script kalau** guru mengunggah secara tersebar selama beberapa hari, tiap guru punya koneksi yang wajar, dan Anda lebih suka tidak mengurus server sama sekali.

**Pilih jalur server sendiri kalau** sebagian besar guru akan mengunggah berdekatan menjelang tenggat, Anda ingin alamat dengan nama sekolah sendiri, atau Anda ingin mengirimi guru email pemberitahuan.

**Jalan tengah:** bangun di Apps Script lebih dulu dengan daftar dokumen yang pendek, uji kuotanya dengan unggahan sungguhan, dan pindah ke jalur server hanya kalau kuotanya jebol. Karena seluruh aturan, alur, dan susunan datanya sama, perpindahan itu tidak membuang pekerjaan berpikir — hanya mengganti bahan bangunan.

## 7. Satu hal yang tidak disarankan

Jangan mencampur keduanya — website di Apps Script dengan basis data di server Anda sendiri. Itu menggabungkan dua kelemahan: kuota Apps Script tetap membatasi, dan server tetap harus dirawat. Pilih satu.

## 8. Yang diserahkan ke pembangun

Sama seperti rancangan pasangan bagian 10, ditambah:

- Cara mengecilkan gambar di sisi peramban sebelum dikirim, karena jalur ini paling sensitif terhadap ukuran file.
- Strategi kalau `LockService` sibuk (menunggu berapa lama, lalu apa).
- Cara mengembalikan data kalau sheet rusak, dan cara memulihkan versi sheet dari riwayat Drive.
- Cara memasang versi baru tanpa mengubah URL yang sudah dibagikan.

## 9. Keputusan yang sudah diambil

Pertanyaan yang diajukan pemeriksa rancangan sudah dijawab, dan jawabannya berlaku untuk kedua jalur:

- **Satu jenis dokumen berisi tepat satu file.** Tidak perlu status per halaman. Mengunggah ulang saat masih menunggu berarti menggantikan file lama.
- **Tidak ada email atau WhatsApp otomatis.** Guru memeriksa sendiri statusnya di website. Di jalur ini itu bukan sekadar pilihan, melainkan keharusan — batas 100 email per hari membuat pemberitahuan massal tidak mungkin.
- **Kegiatan berulang tanpa jadwal tetap.** Karena itu ada konsep `Periode`. Perhatikan efeknya pada kuota: setiap periode baru berarti satu ronde unggahan penuh lagi, jadi tembok 90 menit per hari itu akan Anda temui berkali-kali, bukan sekali.
- **Admin boleh membatalkan keputusan yang keliru**, wajib disertai alasan, dan tercatat di `Riwayat`. Status Terverifikasi ikut menyesuaikan karena dihitung otomatis.

### 9.1 Satu tambahan khusus jalur ini

Karena keputusan boleh dibatalkan dan beberapa admin bekerja bebas, **setiap pembacaan status harus dilakukan di dalam `LockService`**. Di basis data sungguhan, "baca status, lalu putuskan" aman. Di Sheets, antara membaca dan menulis ada jeda yang cukup bagi admin lain untuk menyisipkan perubahannya — dan hasilnya adalah keputusan yang saling menimpa tanpa jejak. Ini titik paling rawan di seluruh rancangan ini.
