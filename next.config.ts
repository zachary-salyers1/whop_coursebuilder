import { withWhopAppConfig } from "@whop/react/next.config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	images: {
		remotePatterns: [{ hostname: "**" }],
	},
	webpack: (config, { isServer }) => {
		if (isServer) {
			// Mark canvas as external to prevent webpack from bundling it
			config.externals = config.externals || [];
			config.externals.push({
				'@napi-rs/canvas': 'commonjs @napi-rs/canvas',
				'canvas': 'commonjs canvas',
			});
		}
		return config;
	},
};

export default withWhopAppConfig(nextConfig);
