'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  paymentGateways: PaymentGateway[];
}

export default function SitePage() {
  const params = useParams();
  const router = useRouter();
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSite = async () => {
      try {
        const response = await axios.get(`/api/sites/${params.id}`);
        setSite(response.data);
      } catch (error) {
        console.error('Error fetching site:', error);
        toast.error('Failed to load site data');
      } finally {
        setLoading(false);
      }
    };

    fetchSite();
  }, [params.id]);

  const updatePaymentGateways = async () => {
    if (!site) return;

    try {
      const response = await axios.put(`/api/sites/${site.id}`, {
        paymentGateways: site.paymentGateways
      });

      if (response.data) {
        toast.success('Payment gateways updated successfully');
      } else {
        throw new Error('Failed to update payment gateways');
      }
    } catch (error) {
      console.error('Error updating payment gateways:', error);
      toast.error('Failed to update payment gateways');
    }
  };

  const handleCountryChange = (gatewayIndex: number, selectedOptions: Country[]) => {
    if (!site) return;

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
    if (!site) return;

    const currentGateway = site.paymentGateways[gatewayIndex];
    const currentCountries = new Set(currentGateway.allowed_countries);

    if (checked) {
      // Add SEPA countries
      SEPA_COUNTRIES.forEach(country => currentCountries.add(country));
    } else {
      // Remove SEPA countries
      SEPA_COUNTRIES.forEach(country => currentCountries.delete(country));
    }

    setSite({
      ...site,
      paymentGateways: site.paymentGateways.map((gateway, index) =>
        index === gatewayIndex
          ? {
              ...gateway,
              allowed_countries: Array.from(currentCountries)
            }
          : gateway
      )
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-red-500 text-lg font-medium">Site not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Gateways</h1>
            <p className="text-lg text-gray-600">{site.url}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            <svg
              className="mr-2 h-5 w-5 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Sites
          </button>
        </div>

        <div className="space-y-6">
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
                value={countries.filter((country: Country) =>
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
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
} 