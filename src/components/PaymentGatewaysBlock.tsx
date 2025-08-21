'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import Select from 'react-select';
import { countries, Country, SEPA_COUNTRIES } from '@/types/countries';

interface PaymentGateway {
  id: string;
  name: string;
  allowed_countries: string[];
}

interface Site {
  id: string;
  url: string;
  apiKey: string;
  paymentGateways?: PaymentGateway[];
  error?: string;
}

interface PaymentGatewaysBlockProps {
  site: Site;
  setSite: (site: Site | ((prevSite: Site | null) => Site | null)) => void;
}

export function PaymentGatewaysBlock({ site, setSite }: PaymentGatewaysBlockProps) {
  const [saving, setSaving] = useState(false);

  const updatePaymentGateways = async () => {
    if (!site) return;

    setSaving(true);
    try {
      const response = await axios.put(`/api/sites/${site.id}`, {
        paymentGateways: site.paymentGateways
      });

      if (response.data) {
        toast.success('Payment gateways updated successfully');
        setSite(response.data);
      } else {
        throw new Error('Failed to update payment gateways');
      }
    } catch (error) {
      console.error('Error updating payment gateways:', error);
      toast.error('Failed to update payment gateways');
    } finally {
      setSaving(false);
    }
  };

  const handleCountryChange = (gatewayIndex: number, selectedOptions: Country[]) => {
    if (!site || !site.paymentGateways) return;

    setSite({
      ...site,
      paymentGateways: site.paymentGateways.map((gateway, index) =>
        index === gatewayIndex
          ? {
              ...gateway,
              allowed_countries: selectedOptions.map(option => option.value)
            }
          : gateway
      )
    });
  };

  const handleSEPACountries = (gatewayIndex: number, checked: boolean) => {
    setSite((prevSite: Site | null) => {
      if (!prevSite || !prevSite.paymentGateways) return prevSite;

      const currentGateway = prevSite.paymentGateways[gatewayIndex];
      const currentCountries = new Set(currentGateway.allowed_countries);

      if (checked) {
        SEPA_COUNTRIES.forEach(country => currentCountries.add(country));
      } else {
        SEPA_COUNTRIES.forEach(country => currentCountries.delete(country));
      }

      return {
        ...prevSite,
        paymentGateways: prevSite.paymentGateways.map((gateway: PaymentGateway, index: number) =>
          index === gatewayIndex
            ? {
                ...gateway,
                allowed_countries: Array.from(currentCountries)
              }
            : gateway
        )
      };
    });
  };

  return (
    <div className="space-y-6">
      {site.error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading payment gateways</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{site.error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!site.paymentGateways || site.paymentGateways.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No payment gateways found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {site.error 
              ? "Failed to load payment gateways from WordPress site." 
              : "This site doesn't have any payment gateways configured."
            }
          </p>
        </div>
      ) : (
        <>
          {site.paymentGateways.map((gateway, index) => (
            <div
              key={gateway.id}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{gateway.name}</h2>
              
              <div className="mb-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    checked={SEPA_COUNTRIES.every(country => 
                      gateway.allowed_countries.includes(country)
                    )}
                    onChange={(e) => handleSEPACountries(index, e.target.checked)}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Include SEPA Countries
                  </span>
                </label>
              </div>

              <Select<Country, true>
                isMulti
                value={gateway.allowed_countries.includes('all') 
                  ? [] 
                  : countries.filter((country: Country) =>
                      gateway.allowed_countries.includes(country.value)
                    )}
                onChange={(selected) => handleCountryChange(index, selected as Country[])}
                options={countries}
                className="mb-4"
                placeholder="Select allowed countries..."
                classNamePrefix="select"
                styles={{
                  control: (base) => ({
                    ...base,
                    borderColor: '#e5e7eb',
                    '&:hover': {
                      borderColor: '#93c5fd'
                    }
                  }),
                  multiValue: (base) => ({
                    ...base,
                    backgroundColor: '#e0f2fe'
                  }),
                  multiValueLabel: (base) => ({
                    ...base,
                    color: '#0369a1'
                  }),
                  multiValueRemove: (base) => ({
                    ...base,
                    color: '#0369a1',
                    '&:hover': {
                      backgroundColor: '#bae6fd',
                      color: '#0369a1'
                    }
                  })
                }}
              />
            </div>
          ))}

          <button
            onClick={updatePaymentGateways}
            disabled={saving}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      )}
    </div>
  );
} 