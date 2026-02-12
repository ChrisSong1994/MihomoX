import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const config: NextConfig = {
  async rewrites() {
    return [
      // Forward all /mihomo-api/* requests to local 9099 port
      {
        source: '/mihomo-api/:path*',
        destination: 'http://127.0.0.1:9099/:path*',
      },
    ];
  },
};

export default withNextIntl(config);
