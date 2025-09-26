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

interface OGData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export default function Home() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'gateways' | 'fingerprints'>('gateways');
  const [ogData, setOgData] = useState<Record<string, OGData>>({});
  const [loadingOG, setLoadingOG] = useState<Record<string, boolean>>({});
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [isAddingSite, setIsAddingSite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      
      // Automatically fetch OG data for all sites
      response.data.forEach((site: Site) => {
        fetchOGData(site.id, site.url);
      });
    } catch (error) {
      console.error('Error fetching sites:', error);
      toast.error('Failed to load sites');
    } finally {
      setLoading(false);
    }
  };

  const fetchOGData = async (siteId: string, url: string) => {
    if (ogData[siteId] || loadingOG[siteId]) {
      return; // Already loaded or loading
    }

    setLoadingOG(prev => ({ ...prev, [siteId]: true }));

    try {
      const response = await axios.post('/api/og-data', { url });
      if (response.data.success) {
        setOgData(prev => ({ ...prev, [siteId]: response.data.data }));
      }
    } catch (error) {
      console.error('Error fetching OG data for', url, error);
      // Set empty OG data to prevent retry
      setOgData(prev => ({ ...prev, [siteId]: {} }));
    } finally {
      setLoadingOG(prev => ({ ...prev, [siteId]: false }));
    }
  };

  const addSite = async (formData: FormData) => {
    const url = formData.get('url') as string;
    const apiKey = formData.get('apiKey') as string;

    if (!url || !apiKey) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsAddingSite(true);

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
      
      // Automatically fetch OG data for the new site
      fetchOGData(siteResponse.data.id, formattedUrl);
      
      // Close modal and reset form
      setShowAddSiteModal(false);
      toast.success('Site added successfully');
      
      // Reset form
      const form = document.getElementById('add-site-form') as HTMLFormElement;
      if (form) form.reset();
      
    } catch (error: any) {
      console.error('Error adding site:', error);
      if (error.response) {
        toast.error(error.response.data.message || 'Failed to add site');
      } else if (error.request) {
        toast.error('No response from server. Please check the URL and API key.');
      } else {
        toast.error('Failed to add site. Please check the URL and API key.');
      }
    } finally {
      setIsAddingSite(false);
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

  // Filter sites based on search query
  const filteredSites = sites.filter(site => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const siteUrl = site.url.toLowerCase();
    const siteOGData = ogData[site.id];
    const siteTitle = (siteOGData?.title || siteOGData?.siteName || '').toLowerCase();
    
    return siteUrl.includes(query) || siteTitle.includes(query);
  });

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
          <div className="text-left sm:text-left">
            <h1 className="text-4xl font-bold text-gray-900 mb-4 text-left sm:text-left">Website Management System</h1>
            <p className="text-lg text-gray-600">Manage payment gateways, device blocking, and security settings for your WordPress sites</p>
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
                Website Management
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
          <div className="space-y-8">
            {/* Add Site Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddSiteModal(true)}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add New Site
              </button>
            </div>

            {/* Sites List */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">Your Sites</h2>
                  {searchQuery && (
                    <p className="text-sm text-gray-500 mt-1">
                      {filteredSites.length} of {sites.length} sites found
                    </p>
                  )}
                </div>
                
                {/* Search Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by domain or title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              {filteredSites.length === 0 ? (
                <div className="text-center py-12">
                  {sites.length === 0 ? (
                    <>
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
                    </>
                  ) : (
                    <>
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
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No sites found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        No sites match your search for "{searchQuery}". Try a different search term.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredSites.map(site => {
                    const siteOGData = ogData[site.id];
                    const isLoadingOG = loadingOG[site.id];

                    return (
                      <div
                        key={site.id}
                        className="bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-500 transition-colors duration-200 overflow-hidden"
                      >
                        {/* OG Image */}
                        <Link href={`/site/${site.id}`} className="bg-gray-200 relative block">
                          {siteOGData?.image ? (
                            <img
                              src={siteOGData.image}
                              alt={siteOGData.title || site.url}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/default-site-image.png';
                              }}
                            />
                          ) : isLoadingOG ? (
                            <div className="w-full bg-gray-200 animate-pulse flex items-center justify-center h-[166px]">
                              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : (
                            <img
                              src="/default-site-image.png"
                              alt="Default website preview"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </Link>
                        
                        {/* Content */}
                        <div className="p-4">
                          {/* Site Title */}
                          <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
                            {siteOGData?.title || siteOGData?.siteName || site.url}
                          </h3>
                          
                          {/* Site URL */}
                          <p className="text-xs text-gray-500 truncate mb-2">
                            {site.url}
                          </p>
                          
                          {/* Description */}
                          {siteOGData?.description && (
                            <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                              {siteOGData.description}
                            </p>
                          )}
                          
                          {/* Loading indicator */}
                          {isLoadingOG && (
                            <div className="flex items-center gap-1 mb-3">
                              <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-xs text-gray-500">Loading...</span>
                            </div>
                          )}
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/site/${site.id}`}
                              className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                            >
                              Manage
                            </Link>
                            <button
                              onClick={() => deleteSite(site.id, site.url)}
                              className="inline-flex items-center px-2 py-2 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'fingerprints' && (
          <FingerprintDeviceBlocksAll sites={sites} />
        )}

        {/* Add Site Modal */}
        {showAddSiteModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add New Site</h3>
                  <button
                    onClick={() => setShowAddSiteModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form id="add-site-form" action={addSite} className="space-y-4">
                  <div>
                    <label htmlFor="modal-url" className="block text-sm font-medium text-gray-700 mb-2">
                      WordPress Site URL
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">https://</span>
                      </div>
                      <input
                        type="text"
                        id="modal-url"
                        name="url"
                        placeholder="example.com"
                        className="block w-full pl-16 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="modal-apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                      API Key
                    </label>
                    <input
                      type="password"
                      id="modal-apiKey"
                      name="apiKey"
                      placeholder="Enter your API key"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>
                  
                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddSiteModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingSite}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors duration-200"
                    >
                      {isAddingSite ? (
                        <div className="flex items-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Adding...
                        </div>
                      ) : (
                        'Add Site'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 