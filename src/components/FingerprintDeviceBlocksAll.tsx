"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import axios from "axios";

interface Site {
  id: string;
  url: string;
  apiKey: string;
  paymentGateways: any[];
}

interface FingerprintDevice {
  id: string;
  device_id: string;
  utm: string;
}

interface FingerprintDeviceBlocksProps {
  sites: Site[];
}

export function FingerprintDeviceBlocksAll({
  sites,
}: FingerprintDeviceBlocksProps) {
  const [fingerprintDevices, setFingerprintDevices] = useState<
    FingerprintDevice[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [savingProgress, setSavingProgress] = useState<{
    [siteId: string]: "pending" | "saving" | "saved" | "error";
  }>({});

  // Fetch fingerprint devices from WordPress (using first site as source)
  useEffect(() => {
    const fetchFingerprintDevices = async () => {
      if (sites.length === 0) return;

      setLoading(true);
      try {
        const firstSite = sites[0];
        console.log(
          `Fetching device IDs from ${firstSite.url}/wp-json/pagw/v1/blocked-visitors`
        );

        // Use our Next.js API route to proxy the request
        const response = await axios.get(
          `/api/sites/${firstSite.id}/blocked-visitors`,
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
  }, [sites]);

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
      (device: FingerprintDevice) => device.id !== id
    );

    setFingerprintDevices(updatedDevices);

    // Initialize progress for all sites
    const initialProgress: {
      [siteId: string]: "pending" | "saving" | "saved" | "error";
    } = {};
    sites.forEach((site) => {
      initialProgress[site.id] = "pending";
    });
    setSavingProgress(initialProgress);

    // Save changes to all sites
    try {
      const wordpressData = updatedDevices
        .filter((device: FingerprintDevice) => device.device_id.trim())
        .map((device: FingerprintDevice) => ({
          device_id: device.device_id.trim(),
          utm: device.utm,
        }));

      console.log(
        "Saving device data after removal:",
        JSON.stringify(wordpressData, null, 2)
      );

      // Save to all sites with real-time progress
      const response = await fetch("/api/sites/blocked-visitors-all-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(wordpressData),
      });

      if (!response.ok) {
        throw new Error("Failed to save to all sites");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to read response stream");
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "progress") {
                const site = sites.find((s) => s.id === data.siteId);
                if (site) {
                  setSavingProgress((prev) => ({
                    ...prev,
                    [site.id]:
                      data.status === "saved"
                        ? "saved"
                        : data.status === "error"
                        ? "error"
                        : "saving",
                  }));
                }
              } else if (data.type === "error") {
                throw new Error(data.error || "Failed to save to all sites");
              } else if (data.type === "complete") {
                // All done
                break;
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError);
            }
          }
        }
      }

      toast.success("Device ID removed successfully from all sites");

      // Clear progress after 3 seconds
      setTimeout(() => {
        setSavingProgress({});
      }, 3000);
    } catch (error: any) {
      console.error("Error removing device ID:", error);

      // Mark all sites as error
      const errorProgress: {
        [siteId: string]: "pending" | "saving" | "saved" | "error";
      } = {};
      sites.forEach((site) => {
        errorProgress[site.id] = "error";
      });
      setSavingProgress(errorProgress);

      toast.error("Failed to remove device ID");
      // Revert the change if save failed
      setFingerprintDevices(fingerprintDevices);

      // Clear progress after 3 seconds
      setTimeout(() => {
        setSavingProgress({});
      }, 3000);
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
      fingerprintDevices.map((device: FingerprintDevice) =>
        device.id === id ? { ...device, [field]: value } : device
      )
    );
  };

  const saveFingerprintDevices = async () => {
    if (
      fingerprintDevices.some(
        (device: FingerprintDevice) =>
          !device.device_id.trim() || !device.utm.trim()
      )
    ) {
      toast.error("Please fill in all device IDs and UTM");
      return;
    }

    setSaving(true);

    // Initialize progress for all sites
    const initialProgress: {
      [siteId: string]: "pending" | "saving" | "saved" | "error";
    } = {};
    sites.forEach((site) => {
      initialProgress[site.id] = "pending";
    });
    setSavingProgress(initialProgress);

    try {
      // Send all device data to WordPress (device_id, utm)
      const wordpressData = fingerprintDevices
        .filter((device: FingerprintDevice) => device.device_id.trim())
        .map((device: FingerprintDevice) => ({
          device_id: device.device_id.trim(),
          utm: device.utm,
        }));

      console.log(
        "Sending device data to WordPress:",
        JSON.stringify(wordpressData, null, 2)
      );

      // Save to all sites with real-time progress
      const response = await fetch("/api/sites/blocked-visitors-all-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(wordpressData),
      });

      if (!response.ok) {
        throw new Error("Failed to save to all sites");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to read response stream");
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "progress") {
                const site = sites.find((s) => s.id === data.siteId);
                if (site) {
                  setSavingProgress((prev) => ({
                    ...prev,
                    [site.id]:
                      data.status === "saved"
                        ? "saved"
                        : data.status === "error"
                        ? "error"
                        : "saving",
                  }));
                }
              } else if (data.type === "error") {
                throw new Error(data.error || "Failed to save to all sites");
              } else if (data.type === "complete") {
                // All done
                break;
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError);
            }
          }
        }
      }

      console.log("WordPress API save response: success for all sites");
      toast.success("Device data saved successfully to all sites");

      // Clear progress after 3 seconds
      setTimeout(() => {
        setSavingProgress({});
      }, 3000);
    } catch (error: any) {
      console.error("WordPress API error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Mark all sites as error
      const errorProgress: {
        [siteId: string]: "pending" | "saving" | "saved" | "error";
      } = {};
      sites.forEach((site) => {
        errorProgress[site.id] = "error";
      });
      setSavingProgress(errorProgress);

      toast.error("Failed to save device data");

      // Clear progress after 3 seconds
      setTimeout(() => {
        setSavingProgress({});
      }, 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {sites.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No sites available
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Add a site first to manage device fingerprints.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
          <div className="flex sm:flex-row flex-col gap-4 justify-between items-start sm:items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Device Fingerprint IDs
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Managing fingerprints for all sites ({sites.length} sites)
              </p>
            </div>
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

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : fingerprintDevices.length === 0 ? (
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
              {fingerprintDevices.map(
                (device: FingerprintDevice, index: number) => (
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
                )
              )}
            </div>
          )}

          {/* Saving Progress - Show for both save and remove operations */}
          {Object.keys(savingProgress).length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Saving to sites:
              </h4>
              <div className="space-y-2">
                {sites.map((site) => {
                  const status = savingProgress[site.id];
                  return (
                    <div
                      key={site.id}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-gray-600 truncate">
                        {site.url}
                      </span>
                      <div className="flex items-center">
                        {status === "pending" && (
                          <div className="flex items-center text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-400 mr-2"></div>
                            <span className="text-xs">Pending...</span>
                          </div>
                        )}
                        {status === "saving" && (
                          <div className="flex items-center text-blue-600">
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600 mr-2"></div>
                            <span className="text-xs">Saving...</span>
                          </div>
                        )}
                        {status === "saved" && (
                          <div className="flex items-center text-green-600">
                            <svg
                              className="h-4 w-4 mr-2"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span className="text-xs">Saved</span>
                          </div>
                        )}
                        {status === "error" && (
                          <div className="flex items-center text-red-600">
                            <svg
                              className="h-4 w-4 mr-2"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            <span className="text-xs">Error</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={addFingerprintDevice}
            className="mt-8 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
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

          {fingerprintDevices.length > 0 && (
            <div className="mt-6">
              <button
                onClick={saveFingerprintDevices}
                disabled={saving}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Device IDs to All Sites"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
