import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";

// Timeout wrapper to prevent infinite loading
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
	return Promise.race([
		promise,
		new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
		),
	]);
}

const SDK_TIMEOUT_MS = 10000; // 10 second timeout for SDK calls

export default async function ExperiencePage({
	params,
}: {
	params: Promise<{ experienceId: string }>;
}) {
	// The headers contains the user token
	const headersList = await headers();

	// The experienceId is a path param
	const { experienceId } = await params;

	// Check if we're in development mode without whop-proxy
	const isDevelopment = process.env.NODE_ENV === 'development';

	let userId: string;
	let result: any;
	let user: any;
	let experience: any;

	try {
		// Try to get the user token from headers (when whop-proxy is running)
		// Use timeout to prevent infinite loading
		const tokenResult = await withTimeout(
			whopSdk.verifyUserToken(headersList),
			SDK_TIMEOUT_MS,
			'Timeout verifying user token'
		);
		userId = tokenResult.userId;

		// Fetch access, user, and experience data in parallel with timeout
		const [accessResult, userData, experienceData] = await withTimeout(
			Promise.all([
				whopSdk.access.checkIfUserHasAccessToExperience({ userId, experienceId }),
				whopSdk.users.getUser({ userId }),
				whopSdk.experiences.getExperience({ experienceId }),
			]),
			SDK_TIMEOUT_MS,
			'Timeout loading experience data'
		);

		result = accessResult;
		user = userData;
		experience = experienceData;
	} catch (error) {
		if (isDevelopment) {
			// Development fallback when whop-proxy is not running
			console.log('Development mode: Using fallback data since whop-proxy is not running');
			userId = 'dev_user_123';
			result = {
				hasAccess: true,
				accessLevel: 'admin' as const
			};
			user = {
				name: 'Development User',
				username: 'dev_user'
			};
			experience = {
				name: `Fantasy Football Experience (${experienceId})`
			};
		} else {
			// In production, re-throw the error
			throw error;
		}
	}

	// Either: 'admin' | 'customer' | 'no_access';
	// 'admin' means the user is an admin of the whop, such as an owner or moderator
	// 'customer' means the user is a common member in this whop
	// 'no_access' means the user does not have access to the whop
	const { accessLevel } = result;

	return (
		<div className="flex justify-center items-center h-screen px-8">
			<h1 className="text-xl">
				Hi <strong>{user.name}</strong>, you{" "}
				<strong>{result.hasAccess ? "have" : "do not have"} access</strong> to
				this experience. Your access level to this whop is:{" "}
				<strong>{accessLevel}</strong>. <br />
				<br />
				Your user ID is <strong>{userId}</strong> and your username is{" "}
				<strong>@{user.username}</strong>.<br />
				<br />
				You are viewing the experience: <strong>{experience.name}</strong>
			</h1>
		</div>
	);
}
