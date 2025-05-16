# Payment Gateways Manager

A Next.js application for managing payment gateways and their allowed countries for WordPress sites with WooCommerce.

## Features

- Add multiple WordPress sites with their API keys
- View and manage payment gateways for each site
- Configure allowed countries for each payment gateway
- Toggle between "all countries" and specific country selections
- Real-time updates to WordPress sites

## Prerequisites

- Node.js 18.x or later
- WordPress site with WooCommerce
- Payment Gateways API plugin installed on WordPress site

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/payments-by-countries-block.git
cd payments-by-countries-block
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## WordPress Plugin Setup

1. Install the Payment Gateways API plugin on your WordPress site
2. Go to WooCommerce → Payment Gateways API in the WordPress admin
3. Copy the generated API key
4. Use the site URL and API key to add the site to the Payment Gateways Manager

## Usage

1. Add a new site by entering the WordPress site URL and API key
2. Click "Show Gateways" to view and manage payment gateways
3. For each payment gateway:
   - Toggle "Enable All" to allow the gateway in all countries
   - Select specific countries to restrict the gateway to those countries only
4. Click "Save Changes" to update the payment gateway settings on the WordPress site

## Development

- Built with Next.js 14
- Styled with Tailwind CSS
- Uses React Hook Form for form handling
- Axios for API requests
- React Hot Toast for notifications

## License

MIT 