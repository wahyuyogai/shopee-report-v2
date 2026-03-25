
import React from 'react';
import { Filter } from 'lucide-react';
import { FilterSelect } from './FilterSelect';

interface FilterSectionProps {
  filters: {
    status: string[];
    toko: string[];
    type: string;
    bulan: string[];
    orderStatus: string[];
    showCancelled: boolean;
    showIsiUlang?: boolean;
    showPenarikan?: boolean;
    resiFilter?: string;
    showInMyBalance?: boolean;
    showInIncome?: boolean;
    showInReturn?: boolean;
    showInNone?: boolean;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    status: string[];
    toko: string[];
    type: string;
    bulan: string[];
    orderStatus: string[];
    showCancelled: boolean;
    showIsiUlang?: boolean;
    showPenarikan?: boolean;
    resiFilter?: string;
    showInMyBalance?: boolean;
    showInIncome?: boolean;
    showInReturn?: boolean;
    showInNone?: boolean;
  }>>;
  filterOptions: {
    toko: string[];
    type: string[];
    bulan: string[];
    orderStatus: string[];
  };
  claimStatusOptions: string[];
  statusCounts?: Record<string, number>; // New prop
  hideCancelled?: boolean;
  hideType?: boolean;
  hideOrderStatus?: boolean;
  hideIsiUlang?: boolean;
  hidePenarikan?: boolean;
  resiFilter?: string;
  setResiFilter?: (val: string) => void;
  showOrderCrossFilters?: boolean;
  feeToggles?: {
    admin: boolean;
    freeShip: boolean;
    promo: boolean;
    premi: boolean;
    tx: boolean;
  };
  setFeeToggles?: React.Dispatch<React.SetStateAction<{
    admin: boolean;
    freeShip: boolean;
    promo: boolean;
    premi: boolean;
    tx: boolean;
  }>>;
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  filters,
  setFilters,
  filterOptions,
  claimStatusOptions,
  statusCounts,
  hideCancelled,
  hideType,
  hideOrderStatus,
  hideIsiUlang,
  hidePenarikan,
  resiFilter,
  setResiFilter,
  showOrderCrossFilters,
  feeToggles,
  setFeeToggles
}) => {
  return (
    <div className="p-5 border-b border-border bg-surface/50">
       <div className="flex items-center gap-2 mb-3 text-brand">
          <Filter size={16} />
          <h3 className="text-xs font-bold uppercase tracking-wider">Kategori Filter</h3>
       </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FilterSelect
            label="Claim Status (Multi)"
            value={filters.status}
            options={claimStatusOptions}
            multiple={true}
            placeholder="Semua Status"
            onChange={(val) => setFilters(prev => ({ ...prev, status: val }))}
            counts={statusCounts}
          />
          <FilterSelect
            label="Nama Toko"
            value={filters.toko}
            options={filterOptions.toko}
            multiple={true}
            placeholder="Semua Toko"
            onChange={(val) => setFilters(prev => ({ ...prev, toko: val }))}
          />
          {!hideType && (
            <FilterSelect
              label="Type Laporan"
              value={filters.type}
              options={filterOptions.type}
              onChange={(val) => setFilters(prev => ({ ...prev, type: val }))}
            />
          )}
          <FilterSelect
            label="Bulan Laporan (Multi)"
            value={filters.bulan}
            options={filterOptions.bulan}
            multiple={true}
            placeholder="Semua Bulan"
            onChange={(val) => setFilters(prev => ({ ...prev, bulan: val }))}
          />
          {!hideOrderStatus && (
            <FilterSelect
              label="Status Pesanan (Multi)"
              value={filters.orderStatus}
              options={filterOptions.orderStatus}
              multiple={true}
              placeholder="Semua Status Pesanan"
              onChange={(val) => setFilters(prev => ({ ...prev, orderStatus: val }))}
            />
          )}

          {resiFilter !== undefined && setResiFilter && (
            <FilterSelect
              label="No. Resi"
              value={resiFilter}
              options={['semua', 'dengan', 'tanpa']}
              onChange={(val) => setResiFilter(val)}
              customLabels={{
                'semua': 'Semua',
                'dengan': 'Dengan No. Resi',
                'tanpa': 'Tanpa No. Resi'
              }}
            />
          )}
          
          {!hideCancelled && (
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-3 px-4 py-3 bg-app/50 border border-border rounded-xl cursor-pointer hover:bg-app transition-all group">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={filters.showCancelled}
                    onChange={(e) => setFilters(prev => ({ ...prev, showCancelled: e.target.checked }))}
                  />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                </div>
                <span className="text-xs font-bold text-text-muted group-hover:text-text-main transition-colors">Tampilkan Batal/Pengembalian</span>
              </label>
            </div>
          )}

          {filters.showIsiUlang !== undefined && !hideIsiUlang && (
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-3 px-4 py-3 bg-app/50 border border-border rounded-xl cursor-pointer hover:bg-app transition-all group">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={filters.showIsiUlang}
                    onChange={(e) => setFilters(prev => ({ ...prev, showIsiUlang: e.target.checked }))}
                  />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                </div>
                <span className="text-xs font-bold text-text-muted group-hover:text-text-main transition-colors">Tampilkan Isi Ulang Saldo</span>
              </label>
            </div>
          )}

          {filters.showPenarikan !== undefined && !hidePenarikan && (
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-3 px-4 py-3 bg-app/50 border border-border rounded-xl cursor-pointer hover:bg-app transition-all group">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={filters.showPenarikan}
                    onChange={(e) => setFilters(prev => ({ ...prev, showPenarikan: e.target.checked }))}
                  />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                </div>
                <span className="text-xs font-bold text-text-muted group-hover:text-text-main transition-colors">Tampilkan Penarikan Dana</span>
              </label>
            </div>
          )}
        </div>

        {showOrderCrossFilters && (
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-3 text-brand">
              <h3 className="text-xs font-bold uppercase tracking-wider">Kelola No. Pesanan (Cross-Check)</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <label className="flex items-center gap-3 px-4 py-3 bg-app/50 border border-border rounded-xl cursor-pointer hover:bg-app transition-all group">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={filters.showInMyBalance}
                    onChange={(e) => setFilters(prev => ({ ...prev, showInMyBalance: e.target.checked }))}
                  />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                </div>
                <span className="text-xs font-bold text-text-muted group-hover:text-text-main transition-colors">Ada di My Balance</span>
              </label>

              <label className="flex items-center gap-3 px-4 py-3 bg-app/50 border border-border rounded-xl cursor-pointer hover:bg-app transition-all group">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={filters.showInIncome}
                    onChange={(e) => setFilters(prev => ({ ...prev, showInIncome: e.target.checked }))}
                  />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                </div>
                <span className="text-xs font-bold text-text-muted group-hover:text-text-main transition-colors">Ada di Income</span>
              </label>

              <label className="flex items-center gap-3 px-4 py-3 bg-app/50 border border-border rounded-xl cursor-pointer hover:bg-app transition-all group">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={filters.showInReturn}
                    onChange={(e) => setFilters(prev => ({ ...prev, showInReturn: e.target.checked }))}
                  />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                </div>
                <span className="text-xs font-bold text-text-muted group-hover:text-text-main transition-colors">Ada di Return</span>
              </label>

              <label className="flex items-center gap-3 px-4 py-3 bg-app/50 border border-border rounded-xl cursor-pointer hover:bg-app transition-all group">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={filters.showInNone}
                    onChange={(e) => setFilters(prev => ({ ...prev, showInNone: e.target.checked }))}
                  />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                </div>
                <span className="text-xs font-bold text-text-muted group-hover:text-text-main transition-colors">Tidak Ada di Manapun</span>
              </label>
            </div>
          </div>
        )}

        {feeToggles && setFeeToggles && (
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3 text-brand">
            <h3 className="text-xs font-bold uppercase tracking-wider">Komponen Biaya Lainnya</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            <label className="flex items-center gap-2 text-sm text-text-main cursor-pointer">
              <input type="checkbox" checked={feeToggles.admin} onChange={(e) => setFeeToggles(prev => ({ ...prev, admin: e.target.checked }))} className="rounded border-border text-brand focus:ring-brand" />
              Admin Shopee 8.25%
            </label>
            <label className="flex items-center gap-2 text-sm text-text-main cursor-pointer">
              <input type="checkbox" checked={feeToggles.freeShip} onChange={(e) => setFeeToggles(prev => ({ ...prev, freeShip: e.target.checked }))} className="rounded border-border text-brand focus:ring-brand" />
              Gratis Ongkir Xtra 5%
            </label>
            <label className="flex items-center gap-2 text-sm text-text-main cursor-pointer">
              <input type="checkbox" checked={feeToggles.promo} onChange={(e) => setFeeToggles(prev => ({ ...prev, promo: e.target.checked }))} className="rounded border-border text-brand focus:ring-brand" />
              Promo Xtra 4.5%
            </label>
            <label className="flex items-center gap-2 text-sm text-text-main cursor-pointer">
              <input type="checkbox" checked={feeToggles.premi} onChange={(e) => setFeeToggles(prev => ({ ...prev, premi: e.target.checked }))} className="rounded border-border text-brand focus:ring-brand" />
              Biaya Premi 0.5%
            </label>
            <label className="flex items-center gap-2 text-sm text-text-main cursor-pointer">
              <input type="checkbox" checked={feeToggles.tx} onChange={(e) => setFeeToggles(prev => ({ ...prev, tx: e.target.checked }))} className="rounded border-border text-brand focus:ring-brand" />
              Biaya Per Transaksi Rp. 1,250
            </label>
          </div>
        </div>
        )}
    </div>
  );
};
