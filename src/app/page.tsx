'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import axios from 'axios';
import { FingerprintDeviceBlocksAll } from '@/components/FingerprintDeviceBlocksAll';  

interface Site {
  id: string;
  url: string;
  apiKey: string;
  paymentGateways: any[];
}

export default function Home() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'gateways' | 'fingerprints'>('gateways');

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.replace('/login');
      return;
    }

    fetchSites();
  }, [router]);

  const fetchSites = async () => {
    try {
      const response = await axios.get('/api/sites');
      setSites(response.data);
    } catch (error) {
      console.error('Error fetching sites:', error);
      toast.error('Failed to load sites');
    } finally {
      setLoading(false);
    }
  };

  const addSite = async (formData: FormData) => {
    const url = formData.get('url') as string;
    const apiKey = formData.get('apiKey') as string;

    if (!url || !apiKey) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // Format URL
      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }

      // Verify API key by making a test request
      const response = await axios.get(
        `${formattedUrl}/wp-json/pagw/v1/payment-gateways`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          }
        }
      );

      if (!response.data) {
        throw new Error('Failed to verify API key');
      }

      // Save site to database
      const siteResponse = await axios.post('/api/sites', {
        url: formattedUrl,
        apiKey
      });

      setSites(prev => [...prev, siteResponse.data]);
      toast.success('Site added successfully');
      router.push(`/site/${siteResponse.data.id}`);
    } catch (error: any) {
      console.error('Error adding site:', error);
      if (error.response) {
        toast.error(error.response.data.message || 'Failed to add site');
      } else if (error.request) {
        toast.error('No response from server. Please check the URL and API key.');
      } else {
        toast.error('Failed to add site. Please check the URL and API key.');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    router.replace('/login');
  };

  const deleteSite = async (siteId: string, siteUrl: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the site "${siteUrl}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(`/api/sites/${siteId}`);
      setSites(prev => prev.filter(site => site.id !== siteId));
      toast.success('Site deleted successfully');
    } catch (error: any) {
      console.error('Error deleting site:', error);
      toast.error(error.response?.data?.error || 'Failed to delete site');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex sm:flex-row flex-col-reverse gap-4 justify-between items-start sm:items-center mb-12">
          <div className="text-left sm:text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Payment Gateways Manager</h1>
            <p className="text-lg text-gray-600">Manage payment gateway settings for your WordPress sites</p>
          </div>
          <button
            onClick={handleLogout}
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
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('gateways')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'gateways'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Payment Gateways Manager
              </button>
              <button
                onClick={() => setActiveTab('fingerprints')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'fingerprints'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Fingerprint Device Blocks
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'gateways' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Add New Site Form */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 relative sm:sticky top-1">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Add New Site</h2>
              <form action={addSite} className="space-y-6">
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                    WordPress Site URL
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">https://</span>
                    </div>
                    <input
                      type="text"
                      id="url"
                      name="url"
                      placeholder="example.com"
                      className="block w-full pl-16 pr-3 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    id="apiKey"
                    name="apiKey"
                    placeholder="Enter your API key"
                    className="block w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Add Site
                </button>
              </form>
            </div>

            {/* Sites List */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Your Sites</h2>
              {sites.length === 0 ? (
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
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No sites added</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by adding your first WordPress site.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sites.map(site => (
                    <div
                      key={site.id}
                      className="flex sm:flex-row flex-col gap-4 items-start sm:items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-500 transition-colors duration-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{site.url}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/site/${site.id}`}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                        >
                          Manage Gateways
                        </Link>
                        <button
                          onClick={() => deleteSite(site.id, site.url)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                          title="Delete site"
                        >
                          <svg
                            className="h-4 w-4"
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
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'fingerprints' && (
          <FingerprintDeviceBlocksAll sites={sites} />
        )}
      </div>
    </div>
  );
} 