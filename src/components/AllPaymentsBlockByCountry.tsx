'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import Select from 'react-select';
import { countries, Country } from '@/types/countries';

interface Site {
  id: string;
  url: string;
  apiKey: string;
}

interface AllPaymentsBlockByCountryProps {
  site: Site;
}

// Default blocked countries as specified
const DEFAULT_BLOCKED_COUNTRIES = [
  'AF', // Afghanistan
  'BB', // Barbados
  'BY', // Belarus
  'BW', // Botswana
  'BF', // Burkina Faso
  'BI', // Burundi
  'KH', // Cambodia
  'CM', // Cameroon
  'CF', // Central African Republic
  'CU', // Cuba
  'ER', // Eritrea
  'GN', // Guinea
  'GW', // Guinea-Bissau
  'HT', // Haiti
  'IR', // Iran
  'IQ', // Iraq
  'LB', // Lebanon
  'LY', // Libya
  'ML', // Mali
  'MM', // Myanmar
  'NI', // Nicaragua
  'NG', // Nigeria
  'KP', // North Korea (DPRK)
  'PK', // Pakistan
  'RU', // Russian Federation
  'SN', // Senegal
  'SO', // Somalia
  'SS', // South Sudan
  'SD', // Sudan
  'SY', // Syria
  'TZ', // Tanzania
  'UG', // Uganda
  'UA', // Ukraine
  'US', // USA
  'VU', // Vanuatu
  'VE', // Venezuela
  'YE', // Yemen
  'ZW', // Zimbabwe
  'PS', // Palestinian Territories
  'CD', // Congo (DRC)
  'UA-43', // Crimea (Ukraine)
  'UA-DON', // Donetsk People's Republic
  'UA-LUH', // Luhansk People's Republic
  'IL' // Israel
];

export function AllPaymentsBlockByCountry({ site }: AllPaymentsBlockByCountryProps) {
  const [blockedCountries, setBlockedCountries] = useState<string[]>(DEFAULT_BLOCKED_COUNTRIES);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlockedCountries = async () => {
      try {
        const response = await axios.get(`/api/sites/${site.id}/block-all-countries`);
        if (response.data && Array.isArray(response.data)) {
          setBlockedCountries(response.data);
          setError(null);
        } else {
          // If no data or invalid format, use default countries
          setBlockedCountries(DEFAULT_BLOCKED_COUNTRIES);
          setError('No blocked countries found. Using default list.');
        }
      } catch (error) {
        console.error('Error fetching blocked countries:', error);
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            setError('Access denied to blocked countries endpoint. Using default blocked countries list. Please check API permissions in WordPress plugin.');
          } else if (error.response?.status === 404) {
            setError('Blocked countries endpoint not found. Using default blocked countries list. Please ensure the WordPress plugin is updated.');
          } else if (error.response?.status === 500) {
            setError('WordPress plugin endpoint error. Using default blocked countries list. Please ensure the WordPress plugin is updated.');
          } else {
            setError(`Failed to load blocked countries (${error.response?.status}). Using default list.`);
          }
        } else {
          setError('Failed to load blocked countries. Using default list.');
        }
        // Use default countries on error
        setBlockedCountries(DEFAULT_BLOCKED_COUNTRIES);
      } finally {
        setLoading(false);
      }
    };

    fetchBlockedCountries();
  }, [site.id]);

  const handleCountryChange = (selectedOptions: Country[]) => {
    setBlockedCountries(selectedOptions.map(option => option.value));
  };

  const saveBlockedCountries = async () => {
    setSaving(true);
    try {
      await axios.post(`/api/sites/${site.id}/block-all-countries`, blockedCountries, {
        headers: { 'Content-Type': 'application/json' }
      });
      toast.success('Blocked countries updated successfully');
      setError(null);
    } catch (error) {
      console.error('Error saving blocked countries:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          toast.error('Access denied. Please check API permissions in WordPress plugin.');
        } else if (error.response?.status === 404) {
          toast.error('Endpoint not found. Please update the WordPress plugin to support this feature.');
        } else if (error.response?.status === 500) {
          toast.error('WordPress plugin error. Please update the WordPress plugin to support this feature.');
        } else {
          toast.error(`Failed to save blocked countries (${error.response?.status})`);
        }
      } else {
        toast.error('Failed to save blocked countries');
      }
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    setBlockedCountries(DEFAULT_BLOCKED_COUNTRIES);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Notice</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{error}</p>
                {error.includes('Access denied') && (
                  <p className="mt-2">
                    <strong>Next steps:</strong> Check API permissions in your WordPress plugin for the <code>/wp-json/pagw/v1/block-all-countries</code> endpoint.
                  </p>
                )}
                {error.includes('endpoint not found') && (
                  <p className="mt-2">
                    <strong>Next steps:</strong> Update your WordPress plugin to include the <code>/wp-json/pagw/v1/block-all-countries</code> endpoint.
                  </p>
                )}
                {error.includes('WordPress plugin endpoint error') && (
                  <p className="mt-2">
                    <strong>Next steps:</strong> Check WordPress plugin logs and ensure the <code>/wp-json/pagw/v1/block-all-countries</code> endpoint is properly configured.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4 flex-col md:flex-row gap-4 md:gap-2">
          <h2 className="text-xl font-semibold text-gray-900 text-left md:text-left w-full md:w-auto">Block All Payments by Country</h2>
          <button
            onClick={resetToDefault}
            className="text-xs px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 w-full md:w-auto"
          >
            Reset to Default
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Select countries where all payment methods should be blocked. By default, high-risk countries are pre-selected.
        </p>

        <Select<Country, true>
          isMulti
          value={countries.filter((country: Country) =>
            blockedCountries.includes(country.value)
          )}
          onChange={(selected) => handleCountryChange(selected as Country[])}
          options={countries}
          className="mb-4"
          placeholder="Select countries to block..."
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
              backgroundColor: '#fef2f2'
            }),
            multiValueLabel: (base) => ({
              ...base,
              color: '#dc2626'
            }),
            multiValueRemove: (base) => ({
              ...base,
              color: '#dc2626',
              '&:hover': {
                backgroundColor: '#fecaca',
                color: '#dc2626'
              }
            })
          }}
        />

        <div className="text-sm text-gray-500">
          <p>Currently blocking payments from <strong>{blockedCountries.length}</strong> countries.</p>
        </div>
      </div>

      <button
        onClick={saveBlockedCountries}
        disabled={saving}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : 'Save Blocked Countries'}
      </button>
    </div>
  );
}
