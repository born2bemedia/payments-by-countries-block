"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import axios from "axios";

interface Site {
  id: string;
  url: string;
  apiKey: string;
  paymentGateways?: any[];
  error?: string;
}

interface FingerprintDevice {
  id: string;
  device_id: string;
  utm: string;
}

interface FingerprintDeviceBlockProps {
  site: Site;
}

export function FingerprintDeviceBlock({ site }: FingerprintDeviceBlockProps) {
  const [fingerprintDevices, setFingerprintDevices] = useState<
    FingerprintDevice[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Fetch fingerprint devices from WordPress
  useEffect(() => {
    const fetchFingerprintDevices = async () => {
      try {
        console.log(
          `Fetching device IDs from ${site.url}/wp-json/pagw/v1/blocked-visitors`
        );

        // Use our Next.js API route to proxy the request
        const response = await axios.get(
          `/api/sites/${site.id}/blocked-visitors`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        console.log(
          "WordPress API response:",
          JSON.stringify(response.data, null, 2)
        );

                // Transform WordPress data format to our component format
        // WordPress stores all data: deviceId, affiliate_utm
        const wordpressData = response.data || [];
        
        const transformedDevices: FingerprintDevice[] = wordpressData.map(
          (visitor: any, index: number) => ({
            id: `device_${index}`,
            device_id: visitor.deviceId || "",
            utm: visitor.affiliate_utm || "",
          })
        );

        setFingerprintDevices(transformedDevices);
      } catch (error: any) {
        console.error("WordPress API error:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });

        // If API fails, start with empty array
        setFingerprintDevices([]);
        toast.error("Failed to load device IDs from WordPress site");
      } finally {
        setLoading(false);
      }
    };

    fetchFingerprintDevices();
  }, [site.id]);

  const addFingerprintDevice = () => {
    const newDevice: FingerprintDevice = {
      id: `device_${Date.now()}`,
      device_id: "",
      utm: "",
    };
    setFingerprintDevices([...fingerprintDevices, newDevice]);
  };

  const removeFingerprintDevice = async (id: string) => {
    setRemovingId(id);
    const updatedDevices = fingerprintDevices.filter(
      (device) => device.id !== id
    );
    setFingerprintDevices(updatedDevices);

    // Save changes immediately to WordPress (all device data)
    try {
      const wordpressData = updatedDevices
        .filter((device) => device.device_id.trim())
        .map((device) => ({
          device_id: device.device_id.trim(),
          utm: device.utm,
        }));

      console.log(
        "Saving device data after removal:",
        JSON.stringify(wordpressData, null, 2)
      );
      console.log("Removal data type:", typeof wordpressData);
      console.log("Removal is array:", Array.isArray(wordpressData));
      console.log("Removal array length:", wordpressData.length);

      // Use our Next.js API route to proxy the request
      const response = await axios.post(
        `/api/sites/${site.id}/blocked-visitors`,
        wordpressData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

            if (response.data.success) {
        toast.success("Device ID removed successfully");
      } else {
        throw new Error("Failed to remove device ID");
      }
    } catch (error: any) {
      console.error("Error removing device ID:", error);
      toast.error("Failed to remove device ID");
      // Revert the change if save failed
      setFingerprintDevices(fingerprintDevices);
    } finally {
      setRemovingId(null);
    }
  };

  const updateFingerprintDevice = (
    id: string,
    field: keyof FingerprintDevice,
    value: any
  ) => {
    setFingerprintDevices(
      fingerprintDevices.map((device) =>
        device.id === id ? { ...device, [field]: value } : device
      )
    );
  };

  const saveFingerprintDevices = async () => {
    if (fingerprintDevices.some((device) => !device.device_id.trim() || !device.utm.trim())) {
      toast.error("Please fill in all device IDs and UTM");
      return;
    }

    setSaving(true);
    try {
      // Send all device data to WordPress (device_id, utm)
      const wordpressData = fingerprintDevices
        .filter((device) => device.device_id.trim())
        .map((device) => ({
          device_id: device.device_id.trim(),
          utm: device.utm,
        }));

      console.log(
        "Sending device data to WordPress:",
        JSON.stringify(wordpressData, null, 2)
      );
      console.log("Data type:", typeof wordpressData);
      console.log("Is array:", Array.isArray(wordpressData));
      console.log("Array length:", wordpressData.length);

      // Use our Next.js API route to proxy the request
      const response = await axios.post(
        `/api/sites/${site.id}/blocked-visitors`,
        wordpressData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("WordPress API save response:", response.data);

      if (response.data.success) {
        toast.success("Device data saved successfully");
      } else {
        throw new Error("Failed to save device data");
      }
    } catch (error: any) {
      console.error("WordPress API error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      toast.error("Failed to save device data");
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
          <h2 className="text-xl font-semibold text-gray-900">
            Device Fingerprint IDs
          </h2>
          <button
            onClick={addFingerprintDevice}
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
            Add Device ID
          </button>
        </div>

        {fingerprintDevices.length === 0 ? (
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
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No device IDs
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding a new device fingerprint ID.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {fingerprintDevices.map((device, index) => (
              <div
                key={device.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Device ID #{index + 1}
                  </h3>
                  <button
                    onClick={() => removeFingerprintDevice(device.id)}
                    disabled={removingId === device.id}
                    className="text-red-600 hover:text-red-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {removingId === device.id ? (
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
                  <div className="w-full sm:w-1/2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Device ID
                    </label>
                    <input
                      type="text"
                      value={device.device_id}
                      onChange={(e) =>
                        updateFingerprintDevice(
                          device.id,
                          "device_id",
                          e.target.value
                        )
                      }
                      required
                      placeholder="Enter device ID..."
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="w-full sm:w-1/2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      UTM
                    </label>
                    <input
                      type="text"
                      value={device.utm}
                      onChange={(e) =>
                        updateFingerprintDevice(
                          device.id,
                          "utm",
                          e.target.value
                        )
                      }
                      required
                      placeholder="Enter UTM..."
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>


                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {fingerprintDevices.length > 0 && (
        <button
          onClick={saveFingerprintDevices}
          disabled={saving}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Device IDs"}
        </button>
      )}
    </div>
  );
}
