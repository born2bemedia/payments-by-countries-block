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

interface PaymentGatewaysUTMBlockProps {
  site: Site;
}

export function PaymentGatewaysUTMBlock({ site }: PaymentGatewaysUTMBlockProps) {
  const [allowedByGateway, setAllowedByGateway] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const gateways = useMemo(() => site.paymentGateways ?? [], [site.paymentGateways]);

  useEffect(() => {
    const fetchAllowedUTMSources = async () => {
      try {
        const res = await axios.get(`/api/sites/${site.id}/allowed-utm-sources`);
        setAllowedByGateway(res.data || {});
      } catch (e) {
        console.error('Failed to load allowed UTM sources', e);
        setAllowedByGateway({});
      } finally {
        setLoading(false);
      }
    };
    fetchAllowedUTMSources();
  }, [site.id]);

  const toggleUTMSource = (gatewayId: string, utmSource: string, checked: boolean) => {
    setAllowedByGateway(prev => {
      const current = new Set(prev[gatewayId] ?? ['all']);
      // If currently 'all' and turning on a specific UTM source, drop 'all'
      if (current.has('all')) current.delete('all');
      if (checked) current.add(utmSource); else current.delete(utmSource);
      const next = Array.from(current);
      // If empty selection, fallback to 'all'
      if (next.length === 0) next.push('all');
      return { ...prev, [gatewayId]: next };
    });
  };

  const setAll = (gatewayId: string) => {
    setAllowedByGateway(prev => ({ ...prev, [gatewayId]: ['all'] }));
  };

  const addUTMSource = (gatewayId: string) => {
    setAllowedByGateway(prev => {
      const current = prev[gatewayId] ?? ['all'];
      if (current.includes('all')) {
        // If currently 'all', switch to array with one empty field
        return { ...prev, [gatewayId]: [''] };
      } else {
        // Add new empty UTM source
        return { ...prev, [gatewayId]: [...current, ''] };
      }
    });
  };

  const removeUTMSource = (gatewayId: string, index: number) => {
    setAllowedByGateway(prev => {
      const current = [...(prev[gatewayId] ?? ['all'])];
      if (current.includes('all')) {
        return prev; // Don't modify if 'all' is selected
      }
      current.splice(index, 1);
      // If no sources left or all are empty, fallback to 'all'
      if (current.length === 0 || current.every(source => source.trim() === '')) {
        return { ...prev, [gatewayId]: ['all'] };
      }
      return { ...prev, [gatewayId]: current };
    });
  };

  const updateUTMSource = (gatewayId: string, index: number, value: string) => {
    setAllowedByGateway(prev => {
      const current = [...(prev[gatewayId] ?? ['all'])];
      if (current.includes('all')) {
        // If currently 'all', switch to array with empty strings and the new value
        const newArray = new Array(Math.max(index + 1, 1)).fill('');
        newArray[index] = value;
        return { ...prev, [gatewayId]: newArray };
      } else {
        // Update existing array
        current[index] = value;
        return { ...prev, [gatewayId]: current };
      }
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string[]> = {};
      gateways.forEach(gw => {
        const list = allowedByGateway[gw.id];
        if (Array.isArray(list) && list.length > 0 && !list.includes('all')) {
          // Filter out empty UTM sources and keep only non-empty ones
          const filteredList = list.filter(source => source.trim() !== '');
          payload[gw.id] = filteredList.length > 0 ? filteredList : ['all'];
        } else {
          payload[gw.id] = ['all'];
        }
      });
      await axios.post(`/api/sites/${site.id}/allowed-utm-sources`, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      toast.success('Allowed UTM sources saved');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save allowed UTM sources');
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
        const customSources = isAll ? [] : (allowedByGateway[gw.id] ?? ['all']).filter(source => source !== 'all');
        
        return (
          <div key={gw.id} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4 flex-col md:flex-row gap-4 md:gap-2">
              <h2 className="text-xl font-semibold text-gray-900 text-left md:text-left w-full md:w-auto">{gw.name}</h2>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => setAll(gw.id)}
                  className="text-xs px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 w-1/2 md:w-auto"
                >
                  Allow All UTM
                </button>
                <button
                  onClick={() => addUTMSource(gw.id)}
                  className="text-xs px-3 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 w-1/2 md:w-auto"
                >
                  Add UTM Source
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {/* All UTM sources checkbox */}
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  checked={isAll}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAll(gw.id);
                    } else {
                      setAllowedByGateway(prev => ({ ...prev, [gw.id]: [''] }));
                    }
                  }}
                />
                <span className="text-sm text-gray-700">Allow all UTM sources</span>
              </label>

              {/* Custom UTM sources */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Custom UTM sources:</p>
                {customSources.map((source, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                      value={source}
                      onChange={(e) => updateUTMSource(gw.id, index, e.target.value)}
                      placeholder="Enter UTM source (e.g., google, facebook, 1, 2)"
                    />
                    <button
                      onClick={() => removeUTMSource(gw.id, index)}
                      className="px-2 py-2 text-red-600 hover:text-red-800 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addUTMSource(gw.id)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add another UTM source
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <button
        onClick={save}
        disabled={saving}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : 'Save Allowed UTM Sources'}
      </button>
    </div>
  );
}
