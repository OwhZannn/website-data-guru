import type { ReactNode } from 'react'
import Gambar from './Gambar'
import { FAQ, STATUS_DOK, barisDokumenBaku } from './isi'

export type BagianPanduan = {
  id: string
  kode: string
  judul: string
  kategori: string
  ringkasan: string
  konten: ReactNode
}

export const Catatan = ({ jenis, judul, children }: { jenis: 'tips' | 'penting'; judul: string; children: ReactNode }) => (
  <aside className={`panduan-catatan panduan-catatan--${jenis}`}>
    <strong>{judul}</strong>
    {children}
  </aside>
)

const baku = barisDokumenBaku()

export const SEMUA_BAGIAN: BagianPanduan[] = [
  // ==========================================
  // BAGIAN A: GURU
  // ==========================================
  {
    id: 'a1',
    kode: 'A1',
    judul: 'Masuk ke aplikasi',
    kategori: 'Bagian A · Panduan untuk guru',
    ringkasan: 'Tata cara masuk ke aplikasi menggunakan NIP untuk ASN atau NIK untuk Non ASN.',
    konten: (
      <>
        <ol>
          <li>Buka alamat aplikasi yang diberikan admin di peramban (Chrome, Safari, atau lainnya).</li>
          <li>Pada kolom <b>Username</b>, isi <b>NIP</b> bila Anda PNS, PPPK, atau Paruh waktu. Bila Anda Non ASN, isi <b>NIK</b> sesuai KTP.</li>
          <li>Isi <b>Kata sandi</b>. Tekan ikon mata di ujung kolom untuk memastikan ketikan Anda benar.</li>
          <li>Tekan <b>Masuk</b>.</li>
        </ol>
        <Gambar berkas="masuk.webp" alt="Halaman masuk dengan kolom Username dan Kata sandi" lebar={375} tinggi={640} ponsel>
          Gambar A1. Halaman masuk
        </Gambar>
        <Catatan jenis="tips" judul="Tips">
          <p>Spasi atau titik di dalam NIP tidak menjadi masalah. Bila Anda salah memasukkan kata sandi 5 kali, tunggu 15 menit sebelum mencoba lagi.</p>
        </Catatan>
      </>
    ),
  },
  {
    id: 'a2',
    kode: 'A2',
    judul: 'Membuat akun (bila belum punya)',
    kategori: 'Bagian A · Panduan untuk guru',
    ringkasan: 'Langkah mendaftar mandiri jika admin belum membuatkan akun.',
    konten: (
      <>
        <p>Bila admin belum membuatkan akun untuk Anda, Anda bisa mendaftar sendiri.</p>
        <ol>
          <li>Di halaman masuk, tekan <b>Buat akun guru</b>.</li>
          <li>Isi nama lengkap beserta gelar.</li>
          <li>Pilih status kepegawaian. Setelah dipilih, kolom di sebelahnya berubah sendiri: <b>NIP</b> (18 angka) untuk PNS, PPPK, dan Paruh waktu, atau <b>NIK</b> (16 angka) untuk Non ASN.</li>
          <li>Pilih jabatan: Guru atau Kepala sekolah.</li>
          <li>Isi tahun sertifikasi. Asal sekolah boleh diisi sekarang atau nanti.</li>
          <li>Tekan <b>Buat akun</b>.</li>
        </ol>
        <Gambar berkas="daftar.webp" alt="Formulir Buat akun guru" lebar={640} tinggi={996}>
          Gambar A2. Formulir buat akun
        </Gambar>
        <p>Setelah berhasil, muncul kotak hijau berisi username (NIP atau NIK Anda) dan kata sandi 8 angka.</p>
        <Catatan jenis="penting" judul="Penting">
          <ul>
            <li>Catat atau salin kata sandi saat itu juga. Kata sandi hanya tampil sekali.</li>
            <li>Akun baru bisa dipakai setelah disetujui admin. Bila Anda mencoba masuk sebelum disetujui, muncul pesan “Akun Anda sedang menunggu persetujuan admin”.</li>
            <li>Bila muncul pesan “NIP ini sudah terdaftar”, berarti admin sudah membuatkan akun Anda. Mintalah kata sandi kepada admin.</li>
          </ul>
        </Catatan>
      </>
    ),
  },
  {
    id: 'a3',
    kode: 'A3',
    judul: 'Melengkapi profil',
    kategori: 'Bagian A · Panduan untuk guru',
    ringkasan: 'Mengisi identitas kepegawaian dan sekolah agar daftar dokumen wajib terbuka.',
    konten: (
      <>
        <p>Saat pertama kali masuk, Anda diminta melengkapi profil. Tombol unggah baru muncul setelah profil lengkap, karena dokumen yang perlu Anda unggah ditentukan dari jabatan dan status kepegawaian Anda.</p>
        <ol>
          <li>Tekan <b>Lengkapi profil</b>, atau menu <b>Profil &amp; kata sandi</b> di bagian atas.</li>
          <li>Isi asal sekolah, pilih jabatan dan status kepegawaian, lalu isi tahun sertifikasi.</li>
          <li>Centang <b>Guru sertifikasi baru</b> bila Anda baru tersertifikasi. Centang ini menambah empat unggahan: buku rekening, NUPTK/NPWP/KTP, ijazah terakhir, dan sertifikat pendidik.</li>
          <li>Tekan <b>Simpan profil</b>. Anda langsung diarahkan ke halaman Dokumen Saya.</li>
        </ol>
        <Gambar berkas="profil.webp" alt="Halaman Profil Saya" lebar={1280} tinggi={760}>
          Gambar A3. Halaman Profil Saya
        </Gambar>
      </>
    ),
  },
  {
    id: 'a4',
    kode: 'A4',
    judul: 'Mencentang tugas tambahan',
    kategori: 'Bagian A · Panduan untuk guru',
    ringkasan: 'Daftar dokumen otomatis menyesuaikan dengan tugas tambahan yang dicentang.',
    konten: (
      <>
        <p>Di halaman Dokumen Saya, di bawah kartu progres, ada kotak <b>Tugas tambahan</b>. Centang setiap tugas yang Anda jalankan. Laporan untuk tugas itu langsung muncul di daftar dokumen.</p>
        <div className="panduan-tabel">
          <table>
            <thead><tr><th scope="col">Bila Anda mencentang…</th><th scope="col">Dokumen yang muncul</th></tr></thead>
            <tbody>
              <tr><td>Kepala laboratorium / perpustakaan</td><td>Laporan kepala lab/perpustakaan dan sertifikat kepala perpustakaan/lab</td></tr>
              <tr><td>Jam tambahan TBQ</td><td>Laporan TBQ</td></tr>
              <tr><td>Pembina Rohis</td><td>Laporan bimbingan Rohis</td></tr>
              <tr><td>Pembina Imtaq / ekskul</td><td>Bukti pembinaan Imtaq/ekskul</td></tr>
              <tr><td>Jam tambahan pembimbing inklusi</td><td>Bukti bimbingan inklusi dan sertifikat pembimbing inklusi</td></tr>
              <tr><td>Wakil kepala sekolah, Pembina OSIS, Wali kelas, Guru piket, Guru wali</td><td>Laporan sesuai tugas masing-masing</td></tr>
            </tbody>
          </table>
        </div>
        <Catatan jenis="tips" judul="Tips">
          <p>Setiap centang langsung tersimpan; tidak ada tombol simpan. Bila Anda menghapus centang, laporannya hilang dari daftar. Berkas yang sudah terunggah tidak dihapus, hanya tidak dihitung lagi.</p>
        </Catatan>
      </>
    ),
  },
  {
    id: 'a5',
    kode: 'A5',
    judul: 'Mengunggah dokumen',
    kategori: 'Bagian A · Panduan untuk guru',
    ringkasan: 'Petunjuk pengunggahan berkas PDF atau foto JPG hingga status menjadi Menunggu diperiksa.',
    konten: (
      <>
        <Gambar berkas="dokumen.webp" alt="Halaman Dokumen Saya berisi kartu progres, tugas tambahan, dan daftar dokumen" lebar={1280} tinggi={760}>
          Gambar A4. Halaman Dokumen Saya: kartu progres, tugas tambahan, dan daftar dokumen
        </Gambar>
        <ol>
          <li>Pada dokumen yang ingin diunggah, tekan <b>Unggah</b>.</li>
          <li>Pilih berkas dari HP atau komputer, atau seret berkas ke kartu. Di HP Anda juga bisa langsung memotret dokumen.</li>
          <li>Tunggu sampai tulisan <i>Sedang mengunggah…</i> selesai. Status dokumen berubah menjadi <b>Menunggu diperiksa</b>.</li>
        </ol>
        <Gambar berkas="klip-unggah.webp" alt="Klip simulasi memilih berkas, proses unggah, hingga status berubah menjadi Menunggu diperiksa" lebar={670} tinggi={178}>
          Klip A1. Alur mengunggah dokumen sampai selesai (diperbesar dengan kursor interaktif)
        </Gambar>
        <h4>Ketentuan berkas</h4>
        <ul>
          <li>Format PDF atau JPG, satu berkas per dokumen.</li>
          <li>Ukuran paling besar 3 MB. Foto dari HP otomatis diperkecil oleh aplikasi. PDF yang lebih dari 3 MB perlu dipindai ulang dengan resolusi lebih rendah.</li>
          <li>Pastikan tulisan, stempel, dan tanda tangan terlihat jelas.</li>
          <li>Unggahan hanya bisa dilakukan selama masa pengunggahan dibuka oleh admin.</li>
        </ul>
        <p>Sebelum diperiksa, dokumen masih bisa diganti dengan tombol <b>Ganti file</b>. Setelah dinyatakan <b>Sah</b>, dokumen tidak bisa diganti lagi.</p>
      </>
    ),
  },
  {
    id: 'a6',
    kode: 'A6',
    judul: 'Dokumen ditolak: mengunggah ulang',
    kategori: 'Bagian A · Panduan untuk guru',
    ringkasan: 'Melihat catatan alasan penolakan dari admin dan mengunggah perbaikan.',
    konten: (
      <>
        <p>Bila admin menolak dokumen, kartunya berwarna merah dan tampil paling atas di daftar, lengkap dengan alasan penolakan.</p>
        <ol>
          <li>Baca alasan penolakan, lalu perbaiki dokumennya. Misalnya pindai ulang dengan lebih jelas, atau mintakan stempel dan tanda tangan.</li>
          <li>Tekan <b>Unggah ulang</b> dan pilih berkas yang sudah diperbaiki.</li>
          <li>Status kembali menjadi <b>Menunggu diperiksa</b>. Cukup dokumen yang ditolak saja yang perlu diunggah ulang.</li>
        </ol>
      </>
    ),
  },
  {
    id: 'a7',
    kode: 'A7',
    judul: 'Lulus verval: lanjut ke aplikasi SIAGA',
    kategori: 'Bagian A · Panduan untuk guru',
    ringkasan: 'Instruksi lanjutan setelah seluruh dokumen wajib dinyatakan sah.',
    konten: (
      <>
        <p>Bila semua dokumen wajib Anda sudah <b>Sah</b>, kartu progres menunjukkan angka penuh dan muncul kotak hijau “Berkas Anda sudah lulus verval.”</p>
        <ol>
          <li>Masuk ke aplikasi SIAGA.</li>
          <li>Unggah setiap berkas yang sudah dinyatakan sah ke SIAGA.</li>
          <li>Cetak SKMT dan SPTJM dari SIAGA.</li>
        </ol>
        <Catatan jenis="penting" judul="Penting">
          <p>Aplikasi verval ini tidak terhubung langsung ke SIAGA. Pengunggahan ke SIAGA tetap Anda lakukan sendiri di aplikasi SIAGA.</p>
        </Catatan>
      </>
    ),
  },
  {
    id: 'a8',
    kode: 'A8',
    judul: 'Khusus kepala sekolah',
    kategori: 'Bagian A · Panduan untuk guru',
    ringkasan: 'Daftar dokumen khusus bagi guru dengan jabatan Kepala Sekolah.',
    konten: (
      <>
        <p>Bila jabatan di profil Anda adalah <b>Kepala sekolah</b>, daftar dokumen Anda menyesuaikan sendiri:</p>
        <ul>
          <li><b>Tidak diminta:</b> jadwal dan tugas guru PAI dari sekolah, jadwal dan tugas dari SIAGA, dan absen dari sekolah.</li>
          <li><b>Sebagai gantinya:</b> SK sebagai kepala sekolah, program kepala sekolah, dan absen dari aplikasi SIAGA.</li>
          <li>SK kenaikan gaji berkala tetap diminta. SK kenaikan pangkat diminta bila Anda PNS.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'a9',
    kode: 'A9',
    judul: 'Mengganti dan lupa kata sandi',
    kategori: 'Bagian A · Panduan untuk guru',
    ringkasan: 'Mengubah kata sandi mandiri di profil dan prosedur jika lupa sandi.',
    konten: (
      <>
        <p>Kata sandi awal berupa 8 angka. Anda boleh menggantinya kapan saja dengan sandi yang lebih mudah Anda ingat.</p>
        <ol>
          <li>Buka menu <b>Profil &amp; kata sandi</b>, lalu gulir ke bagian <b>Ganti kata sandi</b>.</li>
          <li>Isi kata sandi lama, kata sandi baru (minimal 8 karakter), dan ulangi kata sandi baru.</li>
          <li>Tekan <b>Simpan kata sandi</b>. Perangkat lain yang sedang masuk akan dikeluarkan.</li>
        </ol>
        <p><b>Lupa kata sandi?</b> Hubungi admin. Admin akan membuatkan kata sandi baru (8 angka) yang bisa langsung Anda pakai.</p>
      </>
    ),
  },

  // ==========================================
  // BAGIAN B: ADMIN
  // ==========================================
  {
    id: 'b1',
    kode: 'B1',
    judul: 'Masuk dan beranda admin',
    kategori: 'Bagian B · Panduan untuk admin',
    ringkasan: 'Navigasi beranda admin, kartu ringkasan progres, dan antrean pemeriksaan.',
    konten: (
      <>
        <p>Admin masuk dengan <b>email</b> dan kata sandi di halaman masuk yang sama dengan guru. Setelah masuk, menu ada di sisi kiri (di ponsel, buka lewat tombol menu): Beranda, Antrean, Guru, Periode, Alasan penolakan, dan Admin.</p>
        <Gambar berkas="admin-beranda.webp" alt="Beranda admin berisi progres periode, status per dokumen, antrean, dan aktivitas" lebar={1280} tinggi={720}>
          Gambar B1. Beranda admin: progres periode, antrean pemeriksaan, dan aktivitas terbaru
        </Gambar>
        <p>Beranda menampilkan guru yang punya dokumen <b>Menunggu diperiksa</b>. Tekan nama guru untuk langsung memeriksa. Halaman <b>Antrean</b> memuat daftar lengkapnya, yang terlama di atas.</p>
      </>
    ),
  },
  {
    id: 'b2',
    kode: 'B2',
    judul: 'Menyiapkan periode verval',
    kategori: 'Bagian B · Panduan untuk admin',
    ringkasan: 'Membuka periode, mengatur syarat dokumen, dan menyalin dari periode lampau.',
    konten: (
      <>
        <p>Setiap putaran verval adalah satu periode. Hanya satu periode yang bisa dibuka pada satu waktu.</p>
        <ol>
          <li>Buka menu <b>Periode</b>, isi nama periode (misalnya <i>Verval Sertifikasi 2027</i>), lalu tekan <b>Buat periode</b>.</li>
          <li>Tekan <b>Daftar dokumen</b> pada periode itu. Untuk periode yang masih kosong, tekan <b>Isi dengan daftar baku</b> untuk memasukkan 24 dokumen standar (lihat Lampiran).</li>
          <li>Bila perlu, tambah dokumen, ubah nama, ubah urutan, atau ubah <b>Berlaku untuk</b> setiap dokumen.</li>
          <li>Kembali ke halaman Periode dan tekan <b>Buka</b>. Mulai saat itu guru bisa mengunggah.</li>
        </ol>
        <Gambar berkas="admin-periode.webp" alt="Halaman Periode dengan tombol Buka, Tutup periode, Daftar dokumen, dan rekap" lebar={1280} tinggi={720}>
          Gambar B2. Halaman Periode
        </Gambar>
        <h4>Tentang “Berlaku untuk”</h4>
        <p>Pilihan ini menentukan siapa yang wajib mengunggah dokumen tersebut, misalnya Semua guru, PNS, Kepala sekolah, Selain kepala sekolah, TBQ, atau Sertifikasi baru. Guru hanya melihat dokumen yang berlaku baginya, dan progresnya hanya menghitung dokumen itu.</p>
        <p>Dokumen tidak pernah dihapus, hanya <b>Nonaktifkan</b> (disembunyikan dari guru). Berkas yang sudah diunggah tetap tersimpan.</p>
        <Catatan jenis="tips" judul="Tips">
          <p>Daftar dokumen dari periode sebelumnya bisa disalin lewat kolom <b>Salin dokumen</b> pada tabel periode.</p>
        </Catatan>
      </>
    ),
  },
  {
    id: 'b3',
    kode: 'B3',
    judul: 'Menambah akun guru',
    kategori: 'Bagian B · Panduan untuk admin',
    ringkasan: 'Tambah satu per satu atau impor massal melalui file CSV/Excel.',
    konten: (
      <>
        <p>Ada tiga cara guru mendapatkan akun. Semua cara memberikan kata sandi awal berupa 8 angka acak yang hanya tampil sekali.</p>
        <h4>a. Tambah satu guru</h4>
        <ol>
          <li>Menu <b>Guru</b> → tombol <b>Tambah guru</b>.</li>
          <li>Isi nama, status kepegawaian, NIP (ASN) atau NIK (Non ASN), jabatan, dan tahun sertifikasi.</li>
          <li>Tekan <b>Tambah guru</b>. Kotak hijau menampilkan username dan kata sandi. Tekan <b>Salin</b>, lalu berikan kepada guru yang bersangkutan.</li>
        </ol>
        <Gambar berkas="admin-tambah-guru.webp" alt="Formulir Tambah guru" lebar={1280} tinggi={720}>
          Gambar B3. Formulir tambah guru
        </Gambar>
        <h4>b. Impor banyak guru sekaligus</h4>
        <ol>
          <li>Menu <b>Guru</b> → tombol <b>Impor guru</b>.</li>
          <li>Tempelkan daftar guru, satu guru per baris, dengan urutan kolom berikut:</li>
        </ol>
        <pre className="panduan-kode-blok" tabIndex={0}>{`Nama;NIP;NIK;Status Kepegawaian;Tahun Sertifikasi
Siti Rahmawati, S.Pd.I.;198701012010012001;;PNS;2014
Ahmad Fauzi;198502022023211002;;PPPK;2019
Nur Hasanah;;5201014507900001;Non ASN;2021`}</pre>
        <ul>
          <li>Status ditulis: PNS, PPPK, Paruh waktu, atau Non ASN. Kolom yang tidak dipakai dikosongkan (misalnya NIK untuk PNS).</li>
          <li>Dari Excel: susun kolom sesuai urutan di atas, simpan sebagai CSV, lalu pilih berkasnya atau salin dan tempel isinya.</li>
          <li>Tekan <b>Impor</b>. Hasilnya menampilkan jumlah akun yang dibuat, dilewati (sudah terdaftar), dan ditolak beserta alasannya, serta daftar username dan kata sandi. Tekan <b>Salin semua</b> dan simpan baik-baik.</li>
        </ul>
        <h4>c. Guru mendaftar sendiri</h4>
        <p>Guru dapat membuat akun sendiri dari tautan <b>Buat akun guru</b> di halaman masuk. Akun seperti ini harus disetujui admin lebih dulu (lihat B4).</p>
      </>
    ),
  },
  {
    id: 'b4',
    kode: 'B4',
    judul: 'Menyetujui pendaftaran guru',
    kategori: 'Bagian B · Panduan untuk admin',
    ringkasan: 'Verifikasi dan persetujuan akun guru yang mendaftar mandiri.',
    konten: (
      <>
        <p>Bila ada guru yang mendaftar sendiri, menu Guru menampilkan pemberitahuan kuning “N pendaftaran guru menunggu persetujuan”. Pendaftaran ini juga tampil paling atas di daftar guru.</p>
        <ul>
          <li>Periksa nama dan NIP/NIK. Bila benar, tekan <b>Setujui</b>. Guru langsung bisa masuk dengan kata sandi yang ia catat saat mendaftar.</li>
          <li>Bila data tidak dikenal atau keliru, tekan <b>Tolak</b>. Akun itu dihapus, dan guru bisa mendaftar ulang dengan data yang benar.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'b5',
    kode: 'B5',
    judul: 'Mencari guru di daftar',
    kategori: 'Bagian B · Panduan untuk admin',
    ringkasan: 'Filter status guru, pencarian multi-kolom, dan pengaturan pagination.',
    konten: (
      <>
        <Gambar berkas="admin-guru.webp" alt="Daftar guru dengan kotak ringkasan, pencarian, dan pilihan jumlah per halaman" lebar={1280} tinggi={720}>
          Gambar B4. Daftar guru dengan kotak ringkasan, pencarian, dan pilihan jumlah per halaman
        </Gambar>
        <ul>
          <li>Kotak ringkasan menghitung guru per status: Lengkap, Ada yang ditolak, Perlu dicek, Belum mulai. Tekan salah satu kotak untuk menampilkan guru dengan status itu saja.</li>
          <li>Pencarian menerima nama, NIP, NIK, atau nama sekolah.</li>
          <li>Pilih 20, 50, atau 100 guru per halaman. Pindah halaman dengan nomor di bawah tabel.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'b6',
    kode: 'B6',
    judul: 'Memeriksa dokumen (verval)',
    kategori: 'Bagian B · Panduan untuk admin',
    ringkasan: 'Alur pratinjau berkas Drive, mengesahkan, dan menolak dengan alasan terstandar.',
    konten: (
      <>
        <ol>
          <li>Tekan nama guru di daftar, antrean, atau beranda untuk membuka <b>Detail Guru</b>.</li>
          <li>Pada dokumen <b>Menunggu diperiksa</b>, periksa berkas langsung melalui penampil dokumen atau unduh berkas (tombol <b>Unduh</b>).</li>
          <li>Bila sesuai ketentuan, tekan <b>Sahkan</b>.</li>
          <li>Bila tidak sesuai, tekan <b>Tolak</b>, tulis alasan penolakan yang jelas (atau pilih alasan siap pakai), lalu tekan <b>Kirim penolakan</b>. Alasan ini tampil di halaman guru.</li>
        </ol>
        <Gambar berkas="admin-detail-guru.webp" alt="Detail Guru: profil, progres, dan dokumen yang diminta" lebar={1280} tinggi={720}>
          Gambar B5. Detail Guru: profil, progres, dan dokumen yang diminta
        </Gambar>
        <Gambar berkas="klip-periksa.webp" alt="Tampilan dokumen yang diperiksa dalam penampil dokumen" lebar={610} tinggi={445}>
          Gambar B6. Tampilan dokumen yang diperiksa dalam penampil dokumen
        </Gambar>
        <h4>Menulis alasan penolakan</h4>
        <p>Sebutkan apa yang kurang dan apa yang harus dilakukan guru, misalnya “Stempel terpotong, mohon pindai ulang seluruh halaman” atau “Tanda tangan kepala sekolah belum ada”. Daftar alasan siap pakai diatur di menu <b>Alasan penolakan</b>.</p>
        <p>Keputusan yang sudah dibuat bisa dibatalkan dengan <b>Batalkan keputusan</b> disertai alasan. Dokumen kembali berstatus menunggu, dan semua perubahan tercatat di riwayat dokumen.</p>
        <p>Bila semua dokumen wajib seorang guru sudah sah, statusnya menjadi <b>Lengkap</b> dan guru tersebut otomatis mendapat perintah melanjutkan ke SIAGA.</p>
      </>
    ),
  },
  {
    id: 'b7',
    kode: 'B7',
    judul: 'Mengoreksi profil dan tugas guru',
    kategori: 'Bagian B · Panduan untuk admin',
    ringkasan: 'Admin dapat memperbaiki profil guru atau tugas tambahan langsung dari halaman detail.',
    konten: (
      <>
        <p>Di Detail Guru, tekan <b>Koreksi profil dan tugas</b> untuk mengubah asal sekolah, jabatan, status kepegawaian, tahun sertifikasi, tanda sertifikasi baru, dan tugas tambahan guru. Daftar dokumen wajib guru langsung menyesuaikan, dan setiap koreksi tercatat di riwayat profil.</p>
      </>
    ),
  },
  {
    id: 'b8',
    kode: 'B8',
    judul: 'Atur ulang sandi dan menonaktifkan guru',
    kategori: 'Bagian B · Panduan untuk admin',
    ringkasan: 'Reset password 8 angka instan dan manajemen status keaktifan akun guru.',
    konten: (
      <>
        <ul>
          <li><b>Atur ulang sandi:</b> setelah dikonfirmasi, aplikasi membuat kata sandi baru 8 angka. Kotak hijau di bagian atas halaman menampilkan username dan kata sandi barunya. Sandi lama langsung tidak berlaku.</li>
          <li><b>Nonaktifkan:</b> guru langsung keluar dan tidak bisa masuk sampai diaktifkan kembali. Berkas dan riwayatnya tidak dihapus. Guru nonaktif tidak dihitung di ringkasan maupun rekap.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'b9',
    kode: 'B9',
    judul: 'Menutup periode dan mengunduh rekap',
    kategori: 'Bagian B · Panduan untuk admin',
    ringkasan: 'Kunci unggahan periode verval dan ekspor rekapitulasi data format Excel (XLSX) atau CSV.',
    konten: (
      <>
        <ol>
          <li>Di menu <b>Periode</b>, tekan <b>Tutup periode</b>, lalu baca peringatannya dan tekan <b>Ya, tutup periode</b>.</li>
          <li>Setelah ditutup, guru tidak bisa lagi mengunggah. Admin tetap bisa memeriksa dokumen yang masuk dan mengunduh rekap. Periode bisa dibuka lagi kapan saja.</li>
          <li>Tekan <b>Rekap XLSX</b> (Excel) atau <b>Rekap CSV</b>. Rekap memuat NIP, NIK, nama, asal sekolah, jabatan, status kepegawaian, tahun sertifikasi, jumlah dokumen sah dan wajib, status, dan tanggal.</li>
        </ol>
      </>
    ),
  },
  {
    id: 'b10',
    kode: 'B10',
    judul: 'Mengelola akun admin dan sandi sendiri',
    kategori: 'Bagian B · Panduan untuk admin',
    ringkasan: 'Menambah admin pengelola baru dan memperbarui password admin yang sedang aktif.',
    konten: (
      <>
        <p>Di menu <b>Admin</b>, isi nama lengkap dan email, lalu tekan <b>Tambah admin</b>. Kata sandi awal tampil sekali; berikan kepada admin baru. Admin lain bisa dinonaktifkan, tetapi Anda tidak bisa menonaktifkan akun Anda sendiri.</p>
        <p>Untuk mengganti kata sandi Anda sendiri, buka <b>Akun saya</b> dari menu profil di sudut kanan atas, lalu isi bagian <b>Ganti kata sandi</b>.</p>
      </>
    ),
  },

  // ==========================================
  // LAMPIRAN
  // ==========================================
  {
    id: 'l1',
    kode: 'L1',
    judul: 'Daftar dokumen baku dan siapa yang wajib mengunggah',
    kategori: 'Lampiran · Rujukan cepat',
    ringkasan: 'Tabel 24 dokumen standar verval dan peruntukannya bagi setiap kelompok guru.',
    konten: (
      <>
        <div className="panduan-tabel">
          <table>
            <thead><tr><th scope="col">No</th><th scope="col">Dokumen</th><th scope="col">Wajib bagi</th></tr></thead>
            <tbody>
              {baku.map((d) => <tr key={d.no}><td>{d.no}</td><td>{d.nama}</td><td>{d.wajib}</td></tr>)}
            </tbody>
          </table>
        </div>
        <p className="redup teks-sm">Admin dapat mengubah daftar ini untuk setiap periode di menu Periode → Daftar dokumen.</p>
      </>
    ),
  },
  {
    id: 'l2',
    kode: 'L2',
    judul: 'Arti status dokumen',
    kategori: 'Lampiran · Rujukan cepat',
    ringkasan: 'Penjelasan status Belum diunggah, Menunggu diperiksa, Ditolak, dan Sah.',
    konten: (
      <>
        <div className="panduan-tabel">
          <table>
            <thead><tr><th scope="col">Status</th><th scope="col">Artinya</th><th scope="col">Yang perlu dilakukan guru</th></tr></thead>
            <tbody>
              {STATUS_DOK.map(([s, a, t]) => <tr key={s}><td><b>{s}</b></td><td>{a}</td><td>{t}</td></tr>)}
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: 'l3',
    kode: 'L3',
    judul: 'Pertanyaan yang sering diajukan',
    kategori: 'Lampiran · Rujukan cepat',
    ringkasan: 'Solusi untuk kendala login, berkas unggahan, dan integrasi SIAGA.',
    konten: (
      <>
        <div className="panduan-faq">
          {FAQ.map(([t, j]) => (
            <details key={t}>
              <summary>{t}</summary>
              <p>{j}</p>
            </details>
          ))}
        </div>
      </>
    ),
  },
]

export const KAMUS_BAGIAN: Record<string, BagianPanduan> = Object.fromEntries(
  SEMUA_BAGIAN.map((b) => [b.id, b]),
)

export function ambilBagian(slug: string): BagianPanduan | undefined {
  return KAMUS_BAGIAN[slug.toLowerCase()]
}

export function sebelumDanSesudah(slug: string): { sebelumnya?: BagianPanduan; berikutnya?: BagianPanduan } {
  const i = SEMUA_BAGIAN.findIndex((b) => b.id === slug.toLowerCase())
  if (i === -1) return {}
  return {
    sebelumnya: i > 0 ? SEMUA_BAGIAN[i - 1] : undefined,
    berikutnya: i < SEMUA_BAGIAN.length - 1 ? SEMUA_BAGIAN[i + 1] : undefined,
  }
}
