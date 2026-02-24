
export const CLAIM_STATUS_OPTIONS = [
  "Pending",
  "Barang Ada (Belum Diclaim)",
  "Siap Claim",
  "Sudah Claim",
  "Hilang di Kurir",
  "Hilang di Konveksi",
  "Refund Tanpa Barang",
  "Foto Tidak Jelas",
  "Penipuan",
  "Konfirmasi ke Konveksi",
  "Tandai Dulu",
  "Observasi",
  "Resi Batal",
  "Lainnya"
];

export const DATE_FILTER_COLUMNS = [
  "Waktu Pesanan Dibuat",
  "Tanggal Pesanan Dibuat",
  "Waktu Pengiriman Diatur",
  "Waktu Pengiriman Pengembalian Barang Selesai",
  "Waktu Upload"
];

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'Pending': return 'bg-gray-400 border-gray-400 text-white font-medium hover:bg-gray-500 hover:border-gray-500';
    case 'Barang Ada (Belum Diclaim)': return 'bg-emerald-500 border-emerald-500 text-white font-bold shadow-sm shadow-emerald-500/30 hover:bg-emerald-600 hover:border-emerald-600';
    case 'Siap Claim': return 'bg-sky-500 border-sky-500 text-white font-bold shadow-sm shadow-sky-500/30 hover:bg-sky-600 hover:border-sky-600';
    case 'Sudah Claim': return 'bg-teal-600 border-teal-600 text-white font-bold shadow-sm shadow-teal-600/30 hover:bg-teal-700 hover:border-teal-700';
    case 'Hilang di Kurir': return 'bg-red-600 border-red-600 text-white font-bold shadow-sm shadow-red-600/30 hover:bg-red-700 hover:border-red-700';
    case 'Hilang di Konveksi': return 'bg-orange-500 border-orange-500 text-white font-bold shadow-sm shadow-orange-500/30 hover:bg-orange-600 hover:border-orange-600';
    case 'Refund Tanpa Barang': return 'bg-fuchsia-600 border-fuchsia-600 text-white font-bold shadow-sm shadow-fuchsia-600/30 hover:bg-fuchsia-700 hover:border-fuchsia-700';
    case 'Penipuan': return 'bg-rose-600 border-rose-600 text-white font-bold shadow-sm shadow-rose-600/30 hover:bg-rose-700 hover:border-rose-700';
    case 'Tandai Dulu': return 'bg-blue-600 border-blue-600 text-white font-bold shadow-sm shadow-blue-600/30 hover:bg-blue-700 hover:border-blue-700';
    case 'Observasi': return 'bg-purple-600 border-purple-600 text-white font-bold shadow-sm shadow-purple-600/30 hover:bg-purple-700 hover:border-purple-700';
    case 'Foto Tidak Jelas': return 'bg-slate-600 border-slate-600 text-white font-bold shadow-sm shadow-slate-600/30 hover:bg-slate-700 hover:border-slate-700';
    case 'Konfirmasi ke Konveksi': return 'bg-cyan-600 border-cyan-600 text-white font-bold shadow-sm shadow-cyan-600/30 hover:bg-cyan-700 hover:border-cyan-700';
    case 'Resi Batal': return 'bg-zinc-600 border-zinc-600 text-white font-bold shadow-sm shadow-zinc-600/30 hover:bg-zinc-700 hover:border-zinc-700';
    default: return 'bg-gray-400 border-gray-400 text-white font-medium';
  }
};
