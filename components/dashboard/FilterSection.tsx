
import React from 'react';
import { Filter } from 'lucide-react';
import { FilterSelect } from './FilterSelect';

interface FilterSectionProps {
  filters: {
    status: string[];
    toko: string;
    type: string;
    bulan: string[];
    orderStatus: string[];
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    status: string[];
    toko: string;
    type: string;
    bulan: string[];
    orderStatus: string[];
  }>>;
  filterOptions: {
    toko: string[];
    type: string[];
    bulan: string[];
    orderStatus: string[];
  };
  claimStatusOptions: string[];
  statusCounts?: Record<string, number>; // New prop
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
  feeToggles,
  setFeeToggles
}) => {
  return (
    <div className="p-5 border-b border-border bg-surface/50">
       <div className="flex items-center gap-2 mb-3 text-brand">
          <Filter size={16} />
          <h3 className="text-xs font-bold uppercase tracking-wider">Kategori Filter</h3>
       </div>
       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            onChange={(val) => setFilters(prev => ({ ...prev, toko: val }))}
          />
          <FilterSelect
            label="Type Laporan"
            value={filters.type}
            options={filterOptions.type}
            onChange={(val) => setFilters(prev => ({ ...prev, type: val }))}
          />
          <FilterSelect
            label="Bulan Laporan (Multi)"
            value={filters.bulan}
            options={filterOptions.bulan}
            multiple={true}
            placeholder="Semua Bulan"
            onChange={(val) => setFilters(prev => ({ ...prev, bulan: val }))}
          />
          <FilterSelect
            label="Status Pesanan (Multi)"
            value={filters.orderStatus}
            options={filterOptions.orderStatus}
            multiple={true}
            placeholder="Semua Status Pesanan"
            onChange={(val) => setFilters(prev => ({ ...prev, orderStatus: val }))}
          />
        </div>

        {feeToggles && setFeeToggles && (
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3 text-brand">
            <h3 className="text-xs font-bold uppercase tracking-wider">Komponen Biaya Lainnya</h3>
          </div>
          <div className="flex flex-wrap gap-4">
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
