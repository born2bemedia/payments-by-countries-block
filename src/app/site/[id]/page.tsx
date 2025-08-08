'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from 'axios';
import { PaymentGatewaysBlock } from '@/components/PaymentGatewaysBlock';
import { UTMSourceBlock } from '@/components/UTMSourceBlock';
import { FingerprintDeviceBlock } from '@/components/FingerprintDeviceBlock';

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
  const [activeTab, setActiveTab] = useState<'payment-gateways' | 'utm-source' | 'fingerprint-device'>('payment-gateways');

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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex sm:flex-row flex-col-reverse gap-4 justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Site Configuration</h1>
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

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('payment-gateways')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payment-gateways'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Payment Gateways Blocks
            </button>
            <button
              onClick={() => setActiveTab('utm-source')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'utm-source'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{
                display: 'none',
              }}
            >
              UTM Source Blocks
            </button>
            <button
              onClick={() => setActiveTab('fingerprint-device')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'fingerprint-device'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{
                display: 'none',
              }}
            >
              Fingerprint Device Blocks
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'payment-gateways' && (
          <PaymentGatewaysBlock site={site} setSite={setSite} />
        )}
        
        {activeTab === 'utm-source' && (
          <UTMSourceBlock site={site} />
        )}
        
        {activeTab === 'fingerprint-device' && (
          <FingerprintDeviceBlock site={site} />
        )}
      </div>
    </div>
  );
} 