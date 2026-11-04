# Website Data Guru — Rancangan

Tanggal: 2026-11-04
Status: menunggu persetujuan

## 1. Kenapa ini dibuat

Selama ini, setiap kali ada permintaan kelengkapan berkas, para guru menyerahkan dokumen dalam bentuk hardcopy. Jumlah dokumennya banyak dan gurunya sekitar 300 orang, sehingga pengecekan menumpuk dan memakan waktu lama. Sebuah dokumen baru dianggap sah setelah admin memeriksa satu per satu dan memastikan isinya sesuai dengan yang diminta.

Masalah yang diselesaikan bukan "mendigitalkan kertas", melainkan **menghilangkan penumpukan pemeriksaan dan memberi guru cara tahu apa yang salah tanpa harus menebak atau datang bertanya**.

## 2. Tujuan

- Guru mengunggah dokumen sendiri, dari mana saja, tanpa menyerahkan hardcopy.
- File dokumen tersimpan di Google Drive, bukan menumpuk di server.
- Admin memverifikasi tiap dokumen dan menolak disertai alasan yang terbaca guru.
- Guru tahu persis dokumen mana yang bermasalah dan hanya memperbaiki yang itu.
- Admin bisa melihat sekilas siapa yang belum lengkap, untuk dikejar.
- Kegiatan ini bisa diulang dari waktu ke waktu tanpa kehilangan riwayat yang lama.

## 3. Bukan tujuan

- Menghitung atau memutuskan kelayakan sertifikasi. Sistem hanya mencatat dokumen sah atau tidak; keputusan kelayakan tetap di tangan manusia.
- Terhubung ke SIMPEG, Dapodik, atau sistem dinas lainnya.
- Tanda tangan digital, sertifikat elektronik, atau pengesahan berbadan hukum.
- Chat, pengumuman, atau pesan otomatis (email/WhatsApp) di dalam aplikasi. Guru memeriksa sendiri statusnya di website.
- Aplikasi Android/iOS. Cukup website yang nyaman dibuka di HP.

## 4. Yang membuat ini gagal walau teknisnya jalan

Ini yang harus dihindari, dan lebih penting daripada daftar fitur:

- **Guru bisa menyatakan dokumennya sendiri sah.** Hanya admin yang boleh menyahkan.
- **Dokumen ditolak tanpa alasan.** Setiap penolakan wajib punya alasan tertulis dari admin.
- **Satu dokumen ditolak membuat guru mengulang semuanya.** Dokumen yang sudah sah tidak boleh tersentuh oleh guru.
- **Admin tetap harus membuka file satu per satu untuk tahu mana yang perlu diurus.** Daftar guru harus menunjukkan status tanpa perlu diklik.
- **Alasan penolakan hilang setelah guru mengunggah ulang.** Riwayatnya harus tersimpan.
- **File dokumen hilang atau tidak bisa diakses saat dibutuhkan.**
- **Pindah periode menghapus pekerjaan periode sebelumnya.** Riwayat lama harus tetap bisa dibuka.

## 5. Batasan dan keputusan teknis

**Bagian ini keputusan saya, bukan sesuatu yang Anda setujui** — silakan bantah kalau ada yang tidak cocok.

| Bagian | Pilihan | Alasan |
|---|---|---|
| Bahasa & kerangka | Next.js (App Router) + TypeScript | Satu proyek untuk tampilan dan logika server, mudah dirawat satu orang |
| Basis data | SQLite + Prisma | Satu file, tidak perlu memasang server database terpisah, lebih dari cukup untuk 300 guru |
| Otentikasi | Email + kata sandi, sesi lewat cookie | Guru tidak perlu punya akun Google; akun dibuatkan admin |
| Penyimpanan file | Google Drive sebagai tempat utama | Sesuai permintaan; kapasitas sudah ditanggung langganan Google One |
| Cara akses Drive | OAuth2 dengan refresh token pada akun Gmail pemilik Drive | Anda memakai akun Gmail biasa. Akun layanan tidak bisa dipakai untuk Gmail biasa — itu hanya mungkin kalau Drive-nya milik Google Workspace dengan domain sendiri |
| Penempatan | Docker Compose di server Anda, di belakang nginx + HTTPS (Let's Encrypt) | Guru bisa mengunggah dari rumah |
| Format file | PDF dan JPG saja, maksimal 5 MB per file | Menjaga kuota Drive dan mempercepat unggahan dari HP |
| Cadangan | Basis data SQLite dicadangkan otomatis harian ke Drive | File dokumen sudah di Drive; yang perlu diamankan tinggal datanya |

### Satu jebakan yang harus ditangani sejak awal

Aplikasi OAuth Google dengan status **"Testing"** membuat refresh token kedaluwarsa dalam **7 hari**. Sistem ini harus jalan tanpa diawasi selama masa pengunggahan. Jadi aplikasi OAuth-nya harus **dipublikasikan** (boleh tetap belum terverifikasi — hanya muncul peringatan sekali saat menghubungkan). Kalau ini terlewat, sistem akan berhenti menyimpan ke Drive setelah seminggu tanpa gejala yang jelas.

Catatan: kalau suatu saat sekolah beralih ke Google Workspace dengan domain sendiri, seluruh kerumitan OAuth ini bisa digantikan akun layanan yang jauh lebih tahan lama. Tidak perlu sekarang, tapi pintunya terbuka.

## 6. Peran

**Guru** — punya akun sendiri, satu akun berlaku untuk semua periode. Melihat daftar dokumen yang diminta dan status masing-masing, mengunggah, mengunggah ulang yang ditolak, melihat alasan penolakan dan riwayat unggahannya sendiri.

**Admin** — beberapa orang. Membuka dan menutup masa pengunggahan, membuat dan mengelola periode, membuat akun guru dari daftar, mengubah daftar dokumen, memeriksa dokumen guru mana saja, menyahkan atau menolak disertai alasan, membatalkan keputusan yang keliru, mengunduh rekap.

## 7. Periode

Kegiatan ini berulang dari waktu ke waktu, tanpa jadwal tahunan tetap — admin yang menentukan kapan sebuah periode dibuka.

**Periode** adalah wadah: ia punya nama (misalnya "Verval Sertifikasi 2026"), daftar dokumen yang diminta, dan status buka/tutup.

Yang mengikuti konsep periode:
- **Daftar dokumen** disusun per periode, karena permintaan bisa berbeda tiap kali.
- **Status dokumen guru** juga per periode. Guru yang sudah terverifikasi tahun lalu akan tampil sebagai belum mengunggah di periode baru.
- **Riwayat periode lama tetap tersimpan** dan bisa dibuka kembali. Menutup sebuah periode tidak menghapus apa pun, hanya menghentikan unggahan.

## 8. Alur utama

### 8.1 Menyiapkan sebuah periode
1. Admin membuat periode baru dan memberi namanya.
2. Admin menyusun daftar dokumen yang diminta untuk periode itu. Daftar ini sama untuk semua guru.
3. Admin mengunggah daftar guru (nama, email, NIP) untuk membuatkan akun. Guru yang akunnya sudah ada dari periode sebelumnya tidak dibuat ulang.
4. Admin membuka masa pengunggahan.
5. Guru bisa masuk dan mengunggah. Admin menutupnya kapan saja.

### 8.2 Guru mengunggah
1. Guru masuk, melihat daftar dokumen periode yang sedang berjalan, dengan status: belum diunggah, menunggu diperiksa, sah, atau ditolak.
2. Guru mengunggah satu dokumen. **Satu jenis dokumen berisi tepat satu file** — kalau guru ingin mengganti file yang belum diperiksa, unggahan barunya menggantikan yang lama.
3. File dikirim ke Google Drive ke folder atas nama guru tersebut.
4. Status dokumen itu menjadi **menunggu diperiksa**. Guru tidak bisa mengubahnya lagi sampai admin memutuskan.

### 8.3 Admin memverifikasi
1. Admin membuka daftar guru. Tiap baris menampilkan nama, progres (misalnya 3/5), dan status keseluruhan.
2. Admin memilih satu guru, melihat dokumen-dokumennya, membuka file untuk memeriksa isinya.
3. Untuk tiap dokumen, admin menekan **Sahkan** atau **Tolak**.
4. Kalau menolak, alasan tertulis **wajib** diisi. Sistem menolak menyimpan penolakan tanpa alasan.
5. Keputusan tercatat: siapa adminnya, kapan, dan alasannya.

### 8.4 Guru memperbaiki
1. Guru melihat dokumen tertentu berstatus **ditolak**, beserta alasan dari admin.
2. Guru hanya mengunggah ulang dokumen yang ditolak. Dokumen yang sudah sah tidak tersentuh.
3. Status dokumen itu kembali menjadi **menunggu diperiksa**. Alasan penolakan sebelumnya tetap tersimpan sebagai riwayat.

### 8.5 Admin membatalkan keputusan yang keliru
1. Admin bisa mengubah dokumen yang tadinya **sah** menjadi **ditolak**, atau sebaliknya.
2. Pembatalan juga wajib disertai alasan, dan tercatat siapa yang melakukannya serta kapan.
3. Kalau ini membuat guru yang tadinya terverifikasi menjadi tidak lengkap, statusnya otomatis ikut berubah, dan rekap menyesuaikan diri.

### 8.6 Selesai
1. Kalau seluruh dokumen seorang guru dalam satu periode berstatus **sah**, status guru pada periode itu menjadi **Terverifikasi**. Status ini dihitung otomatis dari keadaan dokumen — bukan tanda yang dipasang manual, supaya tidak bisa berbeda dari kenyataan.
2. Admin bisa mengunduh rekap berisi daftar guru beserta status dan tanggal verifikasinya.

## 9. Aturan yang perlu ditegakkan sistem

- Hanya admin yang boleh mengubah status dokumen menjadi sah.
- Penolakan dan pembatalan keputusan tidak bisa disimpan tanpa alasan.
- Selama masa pengunggahan tertutup, guru tidak bisa mengunggah atau mengunggah ulang; hanya bisa melihat.
- Guru boleh mengunggah atau mengganti file selama status dokumennya **belum diunggah**, **menunggu diperiksa**, atau **ditolak**. Setelah berstatus **sah**, guru tidak bisa menyentuhnya lagi — hanya admin yang bisa mengubahnya lewat pembatalan.
- Menghapus dokumen dari daftar induk bersifat **menonaktifkan**, bukan menghapus permanen — supaya dokumen yang sudah pernah diperiksa tidak hilang dari riwayat.
- Menambah dokumen baru ke daftar periode membuat seluruh guru menampilkan dokumen itu sebagai belum diunggah, dan bisa membuat guru yang tadinya terverifikasi kembali tidak lengkap. Sistem harus **memperingatkan admin** sebelum ini terjadi.
- Satu guru hanya melihat dokumennya sendiri dan hanya periode yang sedang berjalan atau periode lampau yang menyangkut dirinya.
- Admin melihat semua.

## 10. Layar yang dibutuhkan

**Guru:** Masuk · Dokumen Saya (daftar + status + alasan penolakan + riwayat unggahan sendiri) · Unggah/unggah ulang · Ganti kata sandi.

**Admin:** Masuk · Daftar Periode · Daftar Guru (progres + status) · Detail Guru (per dokumen: pratinjau, Sahkan, Tolak + alasan, Batalkan keputusan + alasan) · Kelola Dokumen per periode · Kelola Akun Guru (impor dari daftar, atur ulang kata sandi) · Kelola Admin · Buka/tutup masa pengunggahan · Unduh Rekap.

Bentuk kasar tampilan guru dan tampilan daftar admin sudah dilihat dan disetujui saat pembahasan; mockup-nya tersimpan di `.superpowers/brainstorm/`.

## 11. Keputusan yang saya ambil tanpa menanyakannya

Silakan periksa ini sambil membaca — kalau ada yang tidak sesuai bayangan Anda, tinggal bilang.

- **Tidak ada penguncian guru oleh admin.** Sesuai pilihan "bebas ambil", dua admin bisa memeriksa guru yang sama. Karena keputusan boleh dibatalkan dan semuanya tercatat, bentrokan tidak berakibat fatal. Yang penting: keputusan terakhir yang menang, dan keduanya tampak di riwayat.
- **Guru bisa melihat riwayat unggahannya sendiri**, bukan hanya status terkini. Ini hampir gratis dan mengurangi pertanyaan "kok ditolak lagi?".
- **Admin bisa menambah admin lain** lewat layar Kelola Admin, tanpa perlu menyentuh data langsung. Admin pertama dibuat saat pemasangan.
- **Mengganti file yang masih menunggu diperiksa akan menghapus file lama dari Drive**, tapi versi lama tetap tercatat di riwayat supaya bisa ditelusuri.
- **Guru tidak bisa menghapus akunnya**, dan admin tidak bisa menghapus guru — hanya menonaktifkan, supaya riwayat tetap utuh.

## 12. Yang diserahkan ke pembangun

- Susunan konkret skema basis data dan nama kolomnya, termasuk bagaimana periode mengaitkan guru dan dokumen.
- Pustaka unggah, kompresi gambar di sisi peramban, dan penanganan file besar.
- Penamaan folder dan berkas di Google Drive. Usulan: satu folder per guru (`NIP - Nama`), di dalamnya satu subfolder per periode, berkas diberi nama dokumen dan tanggal unggah.
- Perkakas pengujian dan cara memverifikasi tiap alur di atas.
- Rincian keamanan: pembatasan percobaan masuk, kedaluwarsa sesi, cara aman membagikan kata sandi awal ke guru, dan pencegahan satu guru mengunggah ke akun guru lain.
- Antrean unggah kalau koneksi terputus, dan batas konkret jumlah admin.
- Cara memperbarui daftar guru di tengah proses tanpa menghapus dokumen yang sudah masuk.
- Cara menyalin susunan dokumen dari periode lama ke periode baru, karena itu akan jadi pekerjaan berulang setiap kali periode dibuka.

## 13. Asumsi yang perlu dikonfirmasi sebelum dibangun

- Server Anda bisa diakses dari internet dan punya nama domain, supaya HTTPS dan akses dari rumah bisa jalan.
- Akun Gmail pemilik Drive adalah akun yang akan terus Anda pakai; kalau berhenti berlangganan Google One, Drive turun ke 15 GB dan unggahan bisa gagal.
- Admin bersedia membagikan kata sandi awal ke 300 guru lewat jalur yang aman (misalnya pesan pribadi per guru, bukan pengumuman grup). Karena website tidak mengirim email, ini pekerjaan manual.
