'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';

interface PaymentGateway {
  id: string;
  name: string;
}

interface Site {
  id: string;
  url: string;
  apiKey: string;
  paymentGateways?: PaymentGateway[];
}

interface PaymentGatewaysCurrencyBlockProps {
  site: Site;
}



export function PaymentGatewaysCurrencyBlock({ site }: PaymentGatewaysCurrencyBlockProps) {
  const [allowedByGateway, setAllowedByGateway] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>([]);

  const gateways = useMemo(() => site.paymentGateways ?? [], [site.paymentGateways]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both allowed currencies and supported currencies
        const [allowedRes, supportedRes] = await Promise.all([
          axios.get(`/api/sites/${site.id}/allowed-currencies`),
          axios.get(`/api/sites/${site.id}/supported-currencies`)
        ]);
        
        console.log('Allowed currencies:', allowedRes.data);
        console.log('Supported currencies:', supportedRes.data);

        setAllowedByGateway(allowedRes.data || {});
        setSupportedCurrencies(supportedRes.data?.codes || []);
      } catch (e) {
        console.error('Failed to load currencies data', e);
        setAllowedByGateway({});
        setSupportedCurrencies([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [site.id]);

  const toggleCurrency = (gatewayId: string, currency: string, checked: boolean) => {
    setAllowedByGateway(prev => {
      const current = new Set(prev[gatewayId] ?? ['all']);
      // If currently 'all' and turning on a specific currency, drop 'all'
      if (current.has('all')) current.delete('all');
      if (checked) current.add(currency); else current.delete(currency);
      const next = Array.from(current);
      // Allow empty selection (means blocked for all currencies)
      return { ...prev, [gatewayId]: next };
    });
  };

  const setAll = (gatewayId: string) => {
    setAllowedByGateway(prev => ({ ...prev, [gatewayId]: ['all'] }));
  };
  const unselectAll = (gatewayId: string) => {
    setAllowedByGateway(prev => ({ ...prev, [gatewayId]: [] }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string[]> = {};
      gateways.forEach(gw => {
        const list = allowedByGateway[gw.id];
        // If untouched, default to 'all'. If explicitly empty array, keep [].
        payload[gw.id] = Array.isArray(list) ? list : ['all'];
      });
      await axios.post(`/api/sites/${site.id}/allowed-currencies`, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      toast.success('Allowed currencies saved');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save allowed currencies');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!gateways || gateways.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-sm font-medium text-gray-900">No payment gateways found</h3>
        <p className="mt-1 text-sm text-gray-500">Gateways list is empty.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {gateways.map(gw => {
        const selected = new Set(allowedByGateway[gw.id] ?? ['all']);
        const isAll = selected.has('all');
        return (
          <div key={gw.id} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4 flex-col md:flex-row gap-4 md:gap-2">
              <h2 className="text-xl font-semibold text-gray-900 text-left md:text-left w-full md:w-auto">{gw.name}</h2>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => setAll(gw.id)}
                  className="text-xs px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 w-1/2 md:w-auto"
                >
                  Select All
                </button>
                <button
                  onClick={() => unselectAll(gw.id)}
                  className="text-xs px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 w-1/2 md:w-auto"
                >
                  Unselect All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {supportedCurrencies.map(cur => (
                <label key={cur} className="flex items-center space-x-2 bg-gray-50 rounded border border-gray-200 px-3 py-2">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    checked={isAll ? true : selected.has(cur)}
                    onChange={(e) => toggleCurrency(gw.id, cur, e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">{cur}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}

      <button
        onClick={save}
        disabled={saving}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : 'Save Allowed Currencies'}
      </button>
    </div>
  );
}


