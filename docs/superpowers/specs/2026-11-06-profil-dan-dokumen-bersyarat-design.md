# Profil Guru dan Dokumen Bersyarat: Rancangan

Tanggal: 2026-11-06 · Status: disetujui (SK kenaikan pangkat khusus PNS)

## Tujuan
1. Setiap guru punya profil: nama, NIP, asal sekolah, status kepegawaian, tahun sertifikasi.
2. Sebagian dokumen hanya wajib bagi guru dengan tugas tambahan tertentu, atau bagi guru sertifikasi baru.
3. Guru yang semua berkasnya sudah SAH mendapat perintah untuk mengunggah berkas itu ke aplikasi SIAGA, supaya bisa mencetak SKMT dan SPTJM.

## Profil guru
| Isian | Bentuk | Catatan |
|---|---|---|
| Nama, NIP | sudah ada | tetap diisi admin lewat impor |
| Asal sekolah | teks | wajib |
| Status kepegawaian | pilihan: PNS / PPPK / Paruh waktu / Non ASN | wajib |
| Tahun sertifikasi | angka 4 digit | wajib |
| Guru sertifikasi baru | centang | |
| Tugas tambahan | centang, boleh lebih dari satu | lihat di bawah |

Tugas tambahan:
- Kepala laboratorium / perpustakaan
- Jam tambahan TBQ
- Pembina Rohis
- Pembina Imtaq / ekskul
- Jam tambahan pembimbing inklusi

**Siapa yang mengisi:** guru mengisi sendiri di halaman "Profil Saya". Admin bisa melihat dan mengubahnya di Detail Guru. Setiap perubahan oleh admin dicatat di riwayat.

**Profil wajib lengkap sebelum mengunggah.** Daftar dokumen wajib bergantung pada profil, jadi sebelum profil lengkap tombol unggah belum muncul. Sebagai gantinya tampil ajakan "Lengkapi profil dulu".

## Dokumen bersyarat
Setiap butir di daftar dokumen sebuah periode mendapat satu isian baru, **Berlaku untuk**:
`Semua guru` · `PNS` · `Kepala lab/perpus` · `TBQ` · `Rohis` · `Imtaq/ekskul` · `Inklusi` · `Sertifikasi baru`

Sebuah dokumen dihitung wajib bagi seorang guru bila syaratnya "Semua guru" atau guru itu memiliki tugas atau tanda yang sesuai. Guru hanya melihat dokumen yang wajib baginya. Progres, status "Lengkap", rekap, dan kotak ringkasan admin hanya menghitung dokumen yang wajib.

Kalau guru kemudian mencabut tugasnya (misalnya tidak lagi pembina Rohis), dokumen yang sudah diunggah tidak dihapus. Dokumen itu hanya tidak dihitung lagi.

### Daftar dokumen baku
Di halaman Daftar Dokumen tiap periode ada tombol **"Isi dengan daftar baku"**. Tombol ini hanya aktif bila periode itu belum punya dokumen sama sekali. Isinya:

| # | Dokumen | Berlaku untuk |
|---|---|---|
| 1 | Jadwal dan tugas guru PAI dari sekolah | Semua guru |
| 2 | Jadwal dan tugas dari aplikasi SIAGA (distempel dan ditandatangani kepala sekolah) | Semua guru |
| 3 | SK kenaikan gaji berkala terakhir | Semua guru |
| 4 | SK kenaikan pangkat terakhir | PNS |
| 5 | Absen dari sekolah | Semua guru |
| 6 | Laporan kepala lab/perpustakaan | Kepala lab/perpus |
| 7 | Sertifikat kepala perpustakaan/lab | Kepala lab/perpus |
| 8 | Laporan TBQ | TBQ |
| 9 | Laporan bimbingan Rohis | Rohis |
| 10 | Bukti pembinaan Imtaq/ekskul | Imtaq/ekskul |
| 11 | Bukti bimbingan inklusi | Inklusi |
| 12 | Sertifikat pembimbing inklusi | Inklusi |
| 13 | Buku rekening | Sertifikasi baru |
| 14 | NUPTK / NPWP / KTP | Sertifikasi baru |
| 15 | Ijazah terakhir (asli atau legalisir) | Sertifikasi baru |
| 16 | Sertifikat pendidik (asli atau legalisir) | Sertifikasi baru |

Admin tetap bisa menambah, mengganti nama, menonaktifkan, dan mengubah "Berlaku untuk" setiap dokumen.

Catatan: SK kenaikan pangkat hanya wajib bagi guru berstatus PNS (keputusan pengguna, 2026-11-06).

## Perintah unggah ke SIAGA
Ketika semua dokumen wajib seorang guru sudah SAH ("Lengkap / lulus berkas"), halaman guru menampilkan kotak hijau di paling atas:

> **Berkas Anda sudah lulus verval.**
> Langkah berikutnya: unggah berkas yang sama ke aplikasi SIAGA, lalu cetak SKMT dan SPTJM.
> 1. Masuk ke aplikasi SIAGA.
> 2. Unggah setiap berkas di bawah ini (semuanya sudah dinyatakan sah).
> 3. Cetak SKMT dan SPTJM dari SIAGA.

Di bawahnya tetap ada daftar dokumen yang sah. Website ini tidak terhubung ke SIAGA. Perintah ini hanya petunjuk.

## Perubahan teknis
- Prisma: kolom baru di `Guru` (`asalSekolah`, `statusPegawai`, `tahunSertifikasi`, `sertifikasiBaru`, lima boolean tugas) dan di `DaftarDokumen` (`berlakuUntuk`, bawaan `semua`). Satu migrasi. Data lama tetap sah: semua dokumen lama berlaku untuk semua guru.
- `hitungStatusGuru` menerima profil guru dan menyaring dokumen yang wajib. Fungsi ini dipakai di halaman guru, daftar guru, detail guru, rekap, dan beranda admin.
- Rute baru `/profil` (guru) dan API `/api/profil`. Admin mengubah profil lewat API admin guru yang sudah ada.
- Rekap CSV/XLSX mendapat kolom asal sekolah, status kepegawaian, tahun sertifikasi, dan sertifikasi baru.
- Unggah ditolak di server bila dokumen tidak wajib bagi guru itu atau profilnya belum lengkap.

## Pengujian
- Unit: penyaringan dokumen wajib untuk tiap kombinasi tugas, validasi profil, dan perhitungan "Lengkap".
- E2E: guru melengkapi profil lalu dokumen bersyarat muncul; tugas dicabut maka dokumennya hilang dari hitungan; kotak SIAGA muncul setelah semua sah.
- Semua tes lama tetap lulus.

## Revisi 2026-11-06 (permintaan pengguna)
- **Tugas tambahan dipindah dari profil ke halaman Dokumen Saya.** Setiap centang langsung tersimpan (`/api/tugas`) dan unggahan laporannya muncul atau hilang. Admin mengoreksinya di Detail Guru. Menyimpan profil tidak lagi menyentuh tugas.
- **Tugas baru:** Wakil kepala sekolah, Pembina OSIS, Wali kelas, Guru piket, Guru wali. Masing-masing hanya meminta laporan (tanpa SK), karena tugasnya sudah tercantum di jadwal dan pembagian tugas dari sekolah.
- **Jabatan di profil: Guru / Kepala sekolah.** Syarat baru `guru` (selain kepala sekolah) dan `kepsek`. Kepala sekolah tidak diminta jadwal dan tugas dari sekolah, jadwal dan tugas dari SIAGA, dan absen sekolah. Sebagai gantinya: SK sebagai kepala sekolah, program kepala sekolah, absen dari aplikasi SIAGA.
- Daftar baku kini 24 dokumen. Rekap mendapat kolom Jabatan.
- Halaman Profil Saya diperlebar (860px), huruf dan kontrol diperbesar, kotak pilihan diseragamkan tingginya.
