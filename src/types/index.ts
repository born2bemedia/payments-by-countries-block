export interface PaymentGateway {
  id: string;
  name: string;
  allowed_countries: string[];
}

export interface Site {
  id: string;
  url: string;
  apiKey: string;
  paymentGateways: PaymentGateway[];
}

export interface Country {
  code: string;
  name: string;
} 