'use client';

import { useState, useEffect } from 'react';
import Select from 'react-select';
import { countries, Country } from '@/types/countries';
import toast from 'react-hot-toast';
import axios from 'axios';

interface Site {
  id: string;
  url: string;
  apiKey: string;
  paymentGateways?: any[];
  error?: string;
}

interface UTMSource {
  id: string;
  source: string;
  allowed_countries: string[];
}

interface UTMSourceBlockProps {
  site: Site;
}

export function UTMSourceBlock({ site }: UTMSourceBlockProps) {
  const [utmSources, setUtmSources] = useState<UTMSource[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Fetch UTM sources from WordPress
  useEffect(() => {
    const fetchUtmSources = async () => {
      try {
        console.log(`Fetching UTM sources from ${site.url}/wp-json/pagw/v1/blocked-countries`);
        const response = await axios.get(
          `${site.url}/wp-json/pagw/v1/blocked-countries`,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': site.apiKey
            }
          }
        );

        console.log('WordPress API response:', JSON.stringify(response.data, null, 2));

        // Transform WordPress data format to our component format
        const wordpressData = response.data || {};
        const transformedSources: UTMSource[] = Object.entries(wordpressData).map(([source, countries]) => ({
          id: `utm_${source}`,
          source: source,
          allowed_countries: Array.isArray(countries) ? countries : []
        }));

        setUtmSources(transformedSources);
      } catch (error: any) {
        console.error('WordPress API error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        
        // If API fails, start with empty array
        setUtmSources([]);
        toast.error('Failed to load UTM sources from WordPress site');
      } finally {
        setLoading(false);
      }
    };

    fetchUtmSources();
  }, [site.url, site.apiKey]);

  const addUtmSource = () => {
    const newUtmSource: UTMSource = {
      id: `utm_${Date.now()}`,
      source: '',
      allowed_countries: []
    };
    setUtmSources([...utmSources, newUtmSource]);
  };

  const removeUtmSource = async (id: string) => {
    setRemovingId(id);
    const updatedSources = utmSources.filter(source => source.id !== id);
    setUtmSources(updatedSources);
    
    // Save changes immediately to WordPress
    try {
      const wordpressData: Record<string, string[]> = {};
      updatedSources.forEach(source => {
        if (source.source.trim()) {
          wordpressData[source.source.trim()] = source.allowed_countries;
        }
      });

      console.log('Saving UTM sources after removal:', JSON.stringify(wordpressData, null, 2));

      const response = await axios.post(
        `${site.url}/wp-json/pagw/v1/blocked-countries`,
        wordpressData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': site.apiKey
          }
        }
      );

      if (response.data.success) {
        toast.success('UTM source removed successfully');
      } else {
        throw new Error('Failed to remove UTM source');
      }
    } catch (error: any) {
      console.error('Error removing UTM source:', error);
      toast.error('Failed to remove UTM source');
      // Revert the change if save failed
      setUtmSources(utmSources);
    } finally {
      setRemovingId(null);
    }
  };

  const updateUtmSource = (id: string, field: keyof UTMSource, value: any) => {
    setUtmSources(utmSources.map(source =>
      source.id === id ? { ...source, [field]: value } : source
    ));
  };

  const handleCountryChange = (utmSourceId: string, selectedOptions: Country[]) => {
    updateUtmSource(utmSourceId, 'allowed_countries', selectedOptions.map(option => option.value));
  };

  const saveUtmSources = async () => {
    if (utmSources.some(source => !source.source.trim())) {
      toast.error('Please fill in all UTM source names');
      return;
    }

    setSaving(true);
    try {
      // Transform our component format to WordPress expected format
      const wordpressData: Record<string, string[]> = {};
      utmSources.forEach(source => {
        if (source.source.trim()) {
          wordpressData[source.source.trim()] = source.allowed_countries;
        }
      });

      console.log('Sending UTM sources to WordPress:', JSON.stringify(wordpressData, null, 2));

      const response = await axios.post(
        `${site.url}/wp-json/pagw/v1/blocked-countries`,
        wordpressData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': site.apiKey
          }
        }
      );

      console.log('WordPress API save response:', response.data);

      if (response.data.success) {
        toast.success('UTM sources saved successfully');
      } else {
        throw new Error('Failed to save UTM sources');
      }
    } catch (error: any) {
      console.error('WordPress API error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error('Failed to save UTM sources');
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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
        <div className="flex sm:flex-row flex-col gap-4 justify-between items-start sm:items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">UTM Source Blocks</h2>
          <button
            onClick={addUtmSource}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add UTM Source
          </button>
        </div>

        {utmSources.length === 0 ? (
          <div className="text-center py-8">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No UTM sources</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a new UTM source.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {utmSources.map((utmSource, index) => (
              <div
                key={utmSource.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    UTM Source #{index + 1}
                  </h3>
                  <button
                    onClick={() => removeUtmSource(utmSource.id)}
                    disabled={removingId === utmSource.id}
                    className="text-red-600 hover:text-red-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {removingId === utmSource.id ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-red-600"></div>
                    ) : (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="flex sm:flex-row flex-col gap-6 items-start">
                  <div className="w-full sm:w-1/6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      UTM Source Name
                    </label>
                    <input
                      type="text"
                      value={utmSource.source}
                      onChange={(e) => updateUtmSource(utmSource.id, 'source', e.target.value)}
                      placeholder="e.g., google, facebook"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Blocked Countries
                    </label>
                    <Select<Country, true>
                      isMulti
                      value={utmSource.allowed_countries.includes('all') 
                        ? [] 
                        : countries.filter((country: Country) =>
                            utmSource.allowed_countries.includes(country.value)
                          )}
                      onChange={(selected) => handleCountryChange(utmSource.id, selected as Country[])}
                      options={countries}
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
                    <p className="mt-1 text-sm text-gray-500">
                      Selected countries will be blocked for this UTM source
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {utmSources.length > 0 && (
        <button
          onClick={saveUtmSources}
          disabled={saving}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save UTM Sources'}
        </button>
      )}
    </div>
  );
} 