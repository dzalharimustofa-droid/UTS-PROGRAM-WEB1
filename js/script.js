// ===== Utilitas =====
const $ = (selector, root = document) => root.querySelector(selector);
const rupiah = (nilai) => `Rp ${Number(nilai).toLocaleString("id-ID")}`;
const halaman = document.body.dataset.page;
const isAdmin = sessionStorage.getItem("role")?.toLowerCase() === "admin";
const escapeHTML = (nilai) => String(nilai).replace(/[&<>"']/g, (karakter) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[karakter]);

function ambil(kunci, nilaiDefault) {
  try {
    const nilai = localStorage.getItem(kunci);
    return nilai === null ? nilaiDefault : JSON.parse(nilai);
  } catch (error) {
    console.error(`Data "${kunci}" tidak dapat dibaca.`, error);
    return nilaiDefault;
  }
}

function simpan(kunci, nilai) {
  try {
    localStorage.setItem(kunci, JSON.stringify(nilai));
    return true;
  } catch (error) {
    console.error(`Data "${kunci}" tidak dapat disimpan.`, error);
    alert("Perubahan tidak dapat disimpan di browser ini. Periksa ruang penyimpanan dan coba lagi.");
    return false;
  }
}

function angkaHarga(nilai) {
  if (typeof nilai === "number") return nilai;
  const angka = Number(String(nilai ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(angka) ? angka : 0;
}

function normalisasiBuku(buku) {
  return {
    ...buku,
    kode: String(buku.kode || buku.kodeBarang || "").trim().toUpperCase(),
    judul: String(buku.judul || buku.namaBarang || buku.nama || "").trim(),
    kategori: String(buku.kategori || buku.jenisBarang || "Buku").trim(),
    harga: angkaHarga(buku.harga),
    stok: Number(buku.stok) || 0
  };
}

const katalogTersimpan = ambil("katalogBuku", null);
let katalog = Array.isArray(katalogTersimpan)
  ? katalogTersimpan.map(normalisasiBuku).filter((buku) => buku.kode && buku.judul)
  : dataKatalogBuku.map(normalisasiBuku);
katalog = katalog.map((buku) => {
  const bukuDefault = dataKatalogBuku.find((item) =>
    item.kodeBarang === buku.kode || item.namaBarang === buku.judul);
  return { ...buku, cover: buku.cover || (bukuDefault && bukuDefault.cover) };
}).filter((buku) => buku.cover);
const migrasiKatalogLengkap = "migrasiKatalogLengkap";
if (Array.isArray(katalogTersimpan) && !ambil(migrasiKatalogLengkap, false)) {
  dataKatalogBuku.forEach((bukuDefault) => {
    const bukuTersimpan = katalog.find((buku) => buku.kode === bukuDefault.kodeBarang);
    if (!bukuTersimpan) {
      katalog.push(normalisasiBuku(bukuDefault));
    } else {
      bukuTersimpan.cover = bukuDefault.cover;
    }
  });
  if (simpan("katalogBuku", katalog)) {
    simpan(migrasiKatalogLengkap, true);
  }
} else if (!Array.isArray(katalogTersimpan) ||
  JSON.stringify(katalog) !== JSON.stringify(katalogTersimpan)) {
  simpan("katalogBuku", katalog);
}

function tanggalLokal() {
  const sekarang = new Date();
  const bagian = [sekarang.getFullYear(), sekarang.getMonth() + 1, sekarang.getDate()];
  return `${bagian[0]}-${String(bagian[1]).padStart(2, "0")}-${String(bagian[2]).padStart(2, "0")}`;
}

const tahapPengiriman = ["Pesanan dibuat", "Diproses", "Dalam perjalanan", "Selesai"];

function bukaModal(judul, isi) {
  tutupModal();
  const latar = document.createElement("div");
  latar.className = "modal-bg";
  latar.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="judul-modal">
    <button class="tutup" type="button" aria-label="Tutup">&times;</button>
    <h2 id="judul-modal">${escapeHTML(judul)}</h2>${isi}</div>`;
  latar.addEventListener("click", (event) => {
    if (event.target === latar || event.target.classList.contains("tutup")) tutupModal();
  });
  document.body.appendChild(latar);
  const fokus = $("input, a.btn, button.btn", latar);
  if (fokus) fokus.focus();
  return latar;
}

function tutupModal() {
  const modal = $(".modal-bg");
  if (modal) modal.remove();
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") tutupModal();
});

const tombolLogout = $("#logout");
if (tombolLogout) tombolLogout.onclick = () => {
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("role");
  location.href = "index.html";
};

if (halaman !== "login" && !sessionStorage.getItem("user")) {
  location.href = "index.html";
}
if (halaman === "admin" && !isAdmin) {
  location.href = "dashboard.html";
}

if (isAdmin) {
  const nav = $("header.atas nav");
  if (nav && !$('a[href="admin.html"]', nav)) {
    const tautanAdmin = document.createElement("a");
    tautanAdmin.href = "admin.html";
    tautanAdmin.textContent = "Admin";
    nav.insertBefore(tautanAdmin, tombolLogout);
  }
}

// ===== LOGIN =====
if (halaman === "login") {
  if (sessionStorage.getItem("user")) location.href = "dashboard.html";
  const semuaUser = () => {
    const penggunaBaru = ambil("userBaru", []);
    return dataPengguna.concat(Array.isArray(penggunaBaru) ? penggunaBaru : []);
  };

  $("#formLogin").addEventListener("submit", (event) => {
    event.preventDefault();
    const email = $("#email").value.trim().toLowerCase();
    const password = $("#password").value;
    const user = semuaUser().find((item) =>
      item.email.toLowerCase() === email && item.password === password);
    if (!user) {
      alert("Email atau password yang Anda masukkan salah.");
      return;
    }
    sessionStorage.setItem("user", user.nama);
    sessionStorage.setItem("role", (user.role || "customer").toLowerCase());
    location.href = "dashboard.html";
  });

  $("#lupa").onclick = () => {
    const modal = bukaModal("Lupa password", `<form id="form-lupa">
      <label for="email-lupa">Email terdaftar<input type="email" id="email-lupa" required></label>
      <p class="galat" id="galat-lupa" role="alert"></p>
      <button class="btn" type="submit">Periksa email</button></form>`);
    $("#form-lupa", modal).onsubmit = (event) => {
      event.preventDefault();
      const email = $("#email-lupa", modal).value.trim().toLowerCase();
      const ada = semuaUser().some((user) => user.email.toLowerCase() === email);
      $("#galat-lupa", modal).textContent = ada
        ? "Akun ditemukan. Fitur pengiriman email memerlukan layanan backend."
        : "Email tidak terdaftar.";
    };
  };

  $("#daftar").onclick = () => {
    const modal = bukaModal("Daftar akun baru", `<form id="form-daftar">
      <label for="nama-daftar">Nama lengkap<input id="nama-daftar" required autocomplete="name"></label>
      <label for="email-daftar">Email<input type="email" id="email-daftar" required autocomplete="email"></label>
      <label for="password-daftar">Password (minimal 6 karakter)<input type="password" id="password-daftar" minlength="6" required autocomplete="new-password"></label>
      <p class="galat" id="galat-daftar" role="alert"></p><button class="btn" type="submit">Daftar</button></form>`);
    $("#form-daftar", modal).onsubmit = (event) => {
      event.preventDefault();
      const nama = $("#nama-daftar", modal).value.trim();
      const email = $("#email-daftar", modal).value.trim().toLowerCase();
      const password = $("#password-daftar", modal).value;
      const galat = $("#galat-daftar", modal);
      if (!nama || password.length < 6) {
        galat.textContent = "Nama wajib diisi dan password minimal 6 karakter.";
        return;
      }
      if (semuaUser().some((user) => user.email.toLowerCase() === email)) {
        galat.textContent = "Email sudah terdaftar.";
        return;
      }
      const penggunaTersimpan = ambil("userBaru", []);
      const penggunaBaru = Array.isArray(penggunaTersimpan) ? penggunaTersimpan : [];
      penggunaBaru.push({ nama, email, password });
      if (simpan("userBaru", penggunaBaru)) {
        alert("Pendaftaran berhasil. Silakan masuk.");
        tutupModal();
      }
    };
  };
}

// ===== DASHBOARD =====
if (halaman === "dashboard") {
  const jam = new Date().getHours();
  const sapaan = jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" : jam < 18 ? "Selamat sore" : "Selamat malam";
  $("#greeting").textContent = `${sapaan}, ${sessionStorage.getItem("user")}`;
  $("#tgl").textContent = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  const riwayatTersimpan = ambil("riwayat", []);
  const pesanan = Array.isArray(riwayatTersimpan) ? riwayatTersimpan : [];
  const jumlahBuku = katalog.reduce((total, buku) => total + Number(buku.stok || 0), 0);
  const nilaiTransaksi = pesanan.reduce((total, item) => total + Number(item.total || 0), 0);
  const statistik = $("#statistik");
  if (statistik) {
    statistik.innerHTML = `<article class="stat"><span>Total judul</span><strong>${katalog.length}</strong></article>
      <article class="stat"><span>Stok tersedia</span><strong>${jumlahBuku}</strong></article>
      <article class="stat"><span>Total pesanan</span><strong>${pesanan.length}</strong></article>
      <article class="stat"><span>Nilai transaksi</span><strong>${rupiah(nilaiTransaksi)}</strong></article>`;
  }
  const katalogDashboard = $("#katalogDashboard");
  if (katalogDashboard) {
    katalogDashboard.replaceChildren();
    katalog.forEach((buku) => {
      const kode = buku.kode || buku.kodeBarang || "";
      const bukuAsli = dataKatalogBuku.find((item) =>
        (kode && (item.kode === kode || item.kodeBarang === kode)) ||
        item.namaBarang === (buku.judul || buku.namaBarang));
      const judul = buku.judul || buku.namaBarang || buku.nama || "Buku tanpa judul";
      const sampul = buku.cover || (bukuAsli && bukuAsli.cover);
      const kartu = document.createElement("article");
      kartu.className = "kartu-buku";

      const areaSampul = document.createElement("div");
      areaSampul.className = "area-sampul";
      const tampilkanPlaceholder = () => {
        const placeholder = document.createElement("span");
        placeholder.className = "sampul-placeholder";
        placeholder.textContent = "Sampul tidak tersedia";
        areaSampul.replaceChildren(placeholder);
      };
      if (sampul) {
        const gambar = document.createElement("img");
        gambar.src = sampul;
        gambar.alt = `Sampul buku ${judul}`;
        gambar.loading = "lazy";
        gambar.addEventListener("error", tampilkanPlaceholder, { once: true });
        areaSampul.appendChild(gambar);
      } else {
        tampilkanPlaceholder();
      }

      const detail = document.createElement("div");
      detail.className = "detail-buku";
      const nama = document.createElement("h3");
      nama.textContent = judul;
      const kategori = document.createElement("p");
      kategori.textContent = buku.kategori || buku.jenisBarang || "Buku";
      detail.append(nama, kategori);
      kartu.append(areaSampul, detail);
      katalogDashboard.appendChild(kartu);
    });
  }
  if (isAdmin) {
    const menuAdmin = document.createElement("a");
    menuAdmin.href = "admin.html";
    menuAdmin.textContent = "Pemantauan Admin";
    $(".menu").prepend(menuAdmin);
  }

  $("#laporan").onclick = () => bukaModal("Laporan pemesanan", `<div class="ringkasan">
    <p>Jumlah pesanan: <strong>${pesanan.length}</strong></p>
    <p>Total nilai pemesanan: <strong>${rupiah(nilaiTransaksi)}</strong></p>
    <p>Buku terjual: <strong>${pesanan.reduce((total, order) =>
    total + (Array.isArray(order.item)
      ? order.item.reduce((count, item) => count + Number(item.qty || 0), 0)
      : 0), 0)}</strong></p></div>`);

  $("#history").onclick = () => {
    const baris = pesanan.map((item) => `<tr><td>${escapeHTML(item.no)}</td>
      <td>${escapeHTML(item.tanggal)}</td><td>${escapeHTML(item.nama)}</td><td>${rupiah(item.total)}</td></tr>`).join("");
    bukaModal("History transaksi", pesanan.length
      ? `<div class="gulir"><table><thead><tr><th>No. DO</th><th>Tanggal</th><th>Pemesan</th><th>Total</th></tr></thead><tbody>${baris}</tbody></table></div>`
      : "<p>Belum ada transaksi. Buat pesanan di halaman Pemesanan.</p>");
  };
}

// ===== STOK =====
if (halaman === "stok") {
  const tbody = $("#tbStok");
  const cari = $("#cariStok");
  const simpanKatalog = () => simpan("katalogBuku", katalog);
  function catatPenambahanStok(buku, jumlah) {
    if (jumlah <= 0) return true;
    const dataCatatan = ambil("catatanStok", []);
    const catatan = Array.isArray(dataCatatan) ? dataCatatan : [];
    catatan.unshift({
      id: `STK${Date.now()}`,
      kode: buku.kode,
      judul: buku.judul,
      jumlah,
      oleh: sessionStorage.getItem("user") || "Pengguna",
      waktu: new Date().toISOString()
    });
    return simpan("catatanStok", catatan);
  }

  function renderStok() {
    tbody.replaceChildren();
    const kataKunci = cari ? cari.value.trim().toLowerCase() : "";
    katalog.filter((buku) => `${buku.kode} ${buku.judul} ${buku.kategori}`.toLowerCase().includes(kataKunci))
      .forEach((buku) => {
        const tr = document.createElement("tr");
        const stokClass = buku.stok === 0 ? "habis" : buku.stok < 10 ? "tipis" : "";
        const bukuAsli = dataKatalogBuku.find((item) =>
          (item.kode || item.kodeBarang) === buku.kode ||
          item.namaBarang === buku.judul);
        const sampul = buku.cover || (bukuAsli && bukuAsli.cover);
        const selSampul = document.createElement("td");
        if (sampul) {
          const gambar = document.createElement("img");
          gambar.className = "sampul";
          gambar.src = sampul;
          gambar.alt = `Sampul buku ${buku.judul}`;
          selSampul.appendChild(gambar);
        } else {
          selSampul.innerHTML = '<span class="sampul" aria-hidden="true">B</span>';
        }
        tr.append(selSampul);
        tr.insertAdjacentHTML("beforeend", `<td>${escapeHTML(buku.kode)}</td><td>${escapeHTML(buku.judul)}</td>
          <td>${escapeHTML(buku.kategori)}</td><td>${rupiah(buku.harga)}</td>
          <td class="${stokClass}">${buku.stok === 0 ? "Habis" : buku.stok}</td>
          <td><div class="aksi-tabel"><button class="btn kecil restok" type="button">Tambah stok</button>
            <button class="btn kecil hapus" type="button">Hapus</button></div></td>`);
            $(".restok", tr).onclick = () => {
              const modal = bukaModal(`Tambah stok: ${buku.judul}`, `<form id="form-restok">
                <label for="jumlah-restok">Jumlah yang ditambahkan<input id="jumlah-restok" type="number" min="1" step="1" required></label>
                <p class="galat" id="galat-restok" role="alert"></p>
                <button class="btn" type="submit">Simpan penambahan</button></form>`);
              $("#form-restok", modal).onsubmit = (event) => {
                event.preventDefault();
                const jumlah = Number($("#jumlah-restok", modal).value);
                const galatRestok = $("#galat-restok", modal);
                if (!Number.isSafeInteger(jumlah) || jumlah < 1 || !Number.isSafeInteger(buku.stok + jumlah)) {
                  galatRestok.textContent = "Jumlah stok harus berupa bilangan bulat lebih dari 0.";
                  return;
                }
                const stokSebelumnya = buku.stok;
                buku.stok += jumlah;
                if (!simpanKatalog()) {
                  buku.stok = stokSebelumnya;
                  return;
                }
                if (!catatPenambahanStok(buku, jumlah)) {
                  buku.stok = stokSebelumnya;
                  simpanKatalog();
                  return;
                }
                tutupModal();
                renderStok();
              };
            };
            $(".hapus", tr).onclick = () => {
          if (!confirm(`Hapus "${buku.judul}" dari katalog?`)) return;
          const index = katalog.findIndex((item) => item.kode === buku.kode);
          katalog.splice(index, 1);
          if (simpanKatalog()) renderStok();
          else katalog.splice(index, 0, buku);
        };
        tbody.appendChild(tr);
      });
    const jumlah = $("#jumlahHasil");
    if (jumlah) jumlah.textContent = `${tbody.rows.length} dari ${katalog.length} buku`;
  }

  if (cari) cari.addEventListener("input", renderStok);
  renderStok();

  $("#formStok").addEventListener("submit", (event) => {
    event.preventDefault();
    const galat = $("#galat");
    galat.textContent = "";
    const buku = {
      kode: $("#kode").value.trim().toUpperCase(),
      judul: $("#judul").value.trim(),
      kategori: $("#kategori").value.trim(),
      harga: Number($("#harga").value),
      stok: Number($("#jumlah").value)
    };
    if (!buku.kode || !buku.judul || !buku.kategori) {
      galat.textContent = "Semua kolom wajib diisi.";
      return;
    }
    if (!Number.isFinite(buku.harga) || buku.harga <= 0 ||
      !Number.isSafeInteger(buku.stok) || buku.stok < 0) {
      galat.textContent = "Harga harus lebih dari 0 dan stok berupa bilangan bulat minimal 0.";
      return;
    }
    if (katalog.some((item) => item.kode.toLowerCase() === buku.kode.toLowerCase())) {
      galat.textContent = "Kode buku sudah digunakan.";
      return;
    }
    katalog.push(buku);
    if (simpanKatalog()) {
      if (!catatPenambahanStok(buku, buku.stok)) {
        katalog.pop();
        simpanKatalog();
        return;
      }
      renderStok();
      event.target.reset();
      $("#kode").focus();
    } else {
      katalog.pop();
    }
  });
}

// ===== PEMANTAUAN ADMIN =====
if (halaman === "admin" && isAdmin) {
  const pencarian = $("#cariAktivitas");
  const tbody = $("#tbAktivitas");

  function renderAdmin() {
    const dataCatatan = ambil("catatanStok", []);
    const catatan = Array.isArray(dataCatatan) ? dataCatatan : [];
    const stokTotal = katalog.reduce((total, buku) => total + Number(buku.stok || 0), 0);
    const judulMenipis = katalog.filter((buku) => Number(buku.stok) > 0 && Number(buku.stok) < 10).length;
    const unitDitambahkan = catatan.reduce((total, item) => total + Number(item.jumlah || 0), 0);
    $("#adminStatistik").innerHTML = `<article class="stat"><span>Jenis buku</span><strong>${katalog.length}</strong></article>
      <article class="stat"><span>Total stok saat ini</span><strong>${stokTotal}</strong></article>
      <article class="stat"><span>Stok menipis</span><strong>${judulMenipis}</strong></article>
      <article class="stat"><span>Unit tercatat ditambahkan</span><strong>${unitDitambahkan}</strong></article>`;

    const kataKunci = pencarian.value.trim().toLowerCase();
    const hasil = catatan.filter((item) =>
      `${item.kode} ${item.judul} ${item.oleh}`.toLowerCase().includes(kataKunci));
    tbody.replaceChildren();
    hasil.forEach((item) => {
      const baris = document.createElement("tr");
      const waktu = new Date(item.waktu);
      baris.innerHTML = `<td>${escapeHTML(waktu.toLocaleString("id-ID"))}</td>
        <td>${escapeHTML(item.kode)}</td><td>${escapeHTML(item.judul)}</td>
        <td class="stok-ditambah">+${Number(item.jumlah)}</td><td>${escapeHTML(item.oleh)}</td>`;
      tbody.appendChild(baris);
    });
    $("#statusAktivitas").textContent = catatan.length
      ? `Menampilkan ${hasil.length} dari ${catatan.length} catatan penambahan stok`
      : "Belum ada catatan penambahan stok. Catatan akan muncul saat stok baru ditambahkan dari menu Stok.";
    $("#tanpaAktivitas").hidden = catatan.length > 0;
  }

  pencarian.addEventListener("input", renderAdmin);
  window.addEventListener("storage", (event) => {
    if (event.key === "katalogBuku" && event.newValue) {
      try {
        const katalogBaru = JSON.parse(event.newValue);
        if (Array.isArray(katalogBaru)) katalog = katalogBaru;
      } catch (error) {
        console.error("Perubahan katalog lintas tab tidak dapat dibaca.", error);
      }
    }
    if (event.key === "katalogBuku" || event.key === "catatanStok") renderAdmin();
  });
  renderAdmin();
}

// ===== CHECKOUT =====
if (halaman === "checkout") {
  let keranjang = [];
  const pilihan = $("#pilihBuku");

  function renderPilihan() {
    const kodeTerpilih = pilihan.value;
    pilihan.replaceChildren(new Option("Pilih buku...", ""));
    katalog.filter((buku) => buku.stok > 0).forEach((buku) => {
      pilihan.add(new Option(`${buku.judul} (${rupiah(buku.harga)} · stok ${buku.stok})`, buku.kode));
    });
    if ([...pilihan.options].some((option) => option.value === kodeTerpilih)) pilihan.value = kodeTerpilih;
  }

  function renderKeranjang() {
    const tbody = $("#tbKeranjang");
    tbody.replaceChildren();
    keranjang.forEach((item, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${escapeHTML(item.judul)}</td><td>${rupiah(item.harga)}</td>
        <td><input class="qty" type="number" min="1" max="${item.maks}" value="${item.qty}"
          aria-label="Jumlah ${escapeHTML(item.judul)}"></td>
        <td>${rupiah(item.harga * item.qty)}</td>
        <td><button class="btn kecil hapus" type="button">Hapus</button></td>`;
      $(".qty", tr).onchange = (event) => {
        const jumlah = Number(event.target.value);
        if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > item.maks) {
          alert(`Jumlah harus antara 1 dan ${item.maks} (stok tersedia).`);
        } else {
          item.qty = jumlah;
        }
        renderKeranjang();
      };
      $(".hapus", tr).onclick = () => {
        keranjang.splice(index, 1);
        renderKeranjang();
      };
      tbody.appendChild(tr);
    });
    $("#kosong").hidden = keranjang.length > 0;
    $("#totalBayar").textContent = rupiah(keranjang.reduce((total, item) => total + item.harga * item.qty, 0));
  }

  $("#tambahItem").onclick = () => {
    const buku = katalog.find((item) => item.kode === pilihan.value && item.stok > 0);
    if (!buku) {
      alert("Pilih buku yang stoknya tersedia.");
      return;
    }
    const itemAda = keranjang.find((item) => item.kode === buku.kode);
    if (itemAda) {
      if (itemAda.qty >= buku.stok) {
        alert("Jumlah buku sudah mencapai stok yang tersedia.");
        return;
      }
      itemAda.qty += 1;
    } else {
      keranjang.push({ kode: buku.kode, judul: buku.judul, harga: buku.harga, qty: 1, maks: buku.stok });
    }
    renderKeranjang();
  };

  $("#formPesan").addEventListener("submit", (event) => {
    event.preventDefault();
    const galat = $("#galat");
    galat.textContent = "";
    const pemesan = {
      nama: $("#nama").value.trim(),
      email: $("#emailP").value.trim(),
      telp: $("#telp").value.trim(),
      alamat: $("#alamat").value.trim(),
      bayar: $("#bayar").value
    };
    if (!pemesan.nama || !/^\S+@\S+\.\S+$/.test(pemesan.email)) {
      galat.textContent = "Isi nama dan email dengan benar.";
      return;
    }
    if (!keranjang.length) {
      galat.textContent = "Keranjang masih kosong. Tambahkan minimal satu buku.";
      return;
    }
    if (!/^(08|\+628?)\d{8,12}$/.test(pemesan.telp)) {
      galat.textContent = "Nomor telepon tidak valid (contoh: 081234567890).";
      return;
    }
    if (pemesan.alamat.length < 10 || !pemesan.bayar) {
      galat.textContent = pemesan.alamat.length < 10
        ? "Alamat pengiriman minimal 10 karakter."
        : "Pilih metode pembayaran.";
      return;
    }

    const dataKatalogTerbaru = ambil("katalogBuku", katalog);
    const katalogTerbaru = Array.isArray(dataKatalogTerbaru)
      ? dataKatalogTerbaru.map(normalisasiBuku)
      : katalog;
    for (const item of keranjang) {
      const bukuTerbaru = katalogTerbaru.find((buku) => buku.kode === item.kode);
      if (!bukuTerbaru || bukuTerbaru.stok < item.qty) {
        galat.textContent = `Stok "${item.judul}" berubah. Perbarui keranjang sebelum melanjutkan.`;
        katalog = katalogTerbaru;
        renderPilihan();
        return;
      }
    }

    const itemPesanan = keranjang.map((item) => ({
      kode: item.kode, judul: item.judul, harga: item.harga, qty: item.qty
    }));
    const pesanan = {
      no: `DO${Date.now()}`,
      tanggal: tanggalLokal(),
      nama: pemesan.nama,
      email: pemesan.email,
      telp: pemesan.telp,
      alamat: pemesan.alamat,
      bayar: pemesan.bayar,
      item: itemPesanan,
      total: itemPesanan.reduce((total, item) => total + item.harga * item.qty, 0),
      status: 1
    };
    katalogTerbaru.forEach((buku) => {
      const item = itemPesanan.find((pesananItem) => pesananItem.kode === buku.kode);
      if (item) buku.stok -= item.qty;
    });
    const riwayatTersimpan = ambil("riwayat", []);
    const riwayat = Array.isArray(riwayatTersimpan) ? riwayatTersimpan : [];
    riwayat.push(pesanan);
    const katalogSebelumnya = katalog;
    if (!simpan("katalogBuku", katalogTerbaru)) return;
    if (!simpan("riwayat", riwayat)) {
      simpan("katalogBuku", katalogSebelumnya);
      return;
    }
    katalog = katalogTerbaru;
    const modal = bukaModal("Pesanan berhasil", `<p>Terima kasih, ${escapeHTML(pemesan.nama)}. Simpan nomor Delivery Order:</p>
      <p class="nomor">${escapeHTML(pesanan.no)}</p>
      <p>Total: <strong>${rupiah(pesanan.total)}</strong> via ${escapeHTML(pemesan.bayar)}</p>
      <a class="btn" href="tracking.html">Lacak pesanan</a>`);
    keranjang = [];
    event.target.reset();
    renderPilihan();
    renderKeranjang();
    if (modal) $(".btn", modal).focus();
  });

  renderPilihan();
  renderKeranjang();
}

// ===== TRACKING =====
if (halaman === "tracking") {
  $("#formCari").addEventListener("submit", (event) => {
    event.preventDefault();
    const nomor = $("#noDO").value.trim().toUpperCase();
    const hasil = $("#hasil");
    const galat = $("#galat");
    galat.textContent = "";
    hasil.replaceChildren();
    if (!nomor) {
      galat.textContent = "Masukkan nomor Delivery Order.";
      return;
    }
    const riwayatTersimpan = ambil("riwayat", []);
    const riwayat = Array.isArray(riwayatTersimpan) ? riwayatTersimpan : [];
    const pesanan = riwayat.find((item) => String(item.no || "").toUpperCase() === nomor);
    const dataDemo = Array.isArray(dataTracking) ? dataTracking : Object.values(dataTracking);
    const demoAsli = dataDemo.find((item) =>
      String(item.no || item.nomorDO || "").toUpperCase() === nomor);
    const demo = demoAsli && {
      no: demoAsli.no || demoAsli.nomorDO,
      nama: demoAsli.nama,
      ekspedisi: demoAsli.ekspedisi,
      tanggal: demoAsli.tanggal || demoAsli.tanggalKirim,
      paket: demoAsli.paket,
      total: angkaHarga(demoAsli.total),
      status: demoAsli.perjalanan?.some((item) => item.keterangan.includes("Selesai Antar"))
        ? tahapPengiriman.length
        : /perjalanan/i.test(demoAsli.status) ? 3 : 2,
      statusLabel: demoAsli.status,
      perjalanan: demoAsli.perjalanan || []
    };
    const data = pesanan
      ? {
        no: pesanan.no, nama: pesanan.nama, ekspedisi: "JNE Reguler", tanggal: pesanan.tanggal,
        paket: `Paket Buku (${pesanan.item.length} judul)`, total: pesanan.total, status: pesanan.status || 1
      }
      : demo;
    if (!data) {
      galat.textContent = `Nomor ${nomor} tidak ditemukan. Periksa kembali nomor Delivery Order Anda.`;
      return;
    }

    const status = Math.min(Math.max(Number(data.status), 1), tahapPengiriman.length);
    const langkah = tahapPengiriman.map((tahap, index) =>
      `<li class="${index < status ? "selesai" : ""}">${tahap}</li>`).join("");
    hasil.innerHTML = `<h2>${escapeHTML(data.nama)}</h2>
      <p>Status: <strong>${escapeHTML(data.statusLabel || tahapPengiriman[status - 1])}</strong></p>
      <div class="bar" role="progressbar" aria-label="Progres pengiriman" aria-valuenow="${status}"
        aria-valuemin="1" aria-valuemax="${tahapPengiriman.length}">
        <span style="width:${status / tahapPengiriman.length * 100}%"></span></div>
      <ol class="tahap">${langkah}</ol>
      <div class="gulir"><table><tbody><tr><th>Nomor DO</th><td>${escapeHTML(data.no)}</td></tr>
        <tr><th>Ekspedisi</th><td>${escapeHTML(data.ekspedisi)}</td></tr>
        <tr><th>Tanggal pesan</th><td>${escapeHTML(data.tanggal)}</td></tr>
        <tr><th>Jenis paket</th><td>${escapeHTML(data.paket)}</td></tr>
        <tr><th>Total pembayaran</th><td>${rupiah(data.total)}</td></tr></tbody></table></div>
      ${data.perjalanan?.length ? `<h3>Riwayat perjalanan</h3><ul>${data.perjalanan.map((item) =>
        `<li>${escapeHTML(item.waktu)} — ${escapeHTML(item.keterangan)}</li>`).join("")}</ul>` : ""}`;
  });
}
