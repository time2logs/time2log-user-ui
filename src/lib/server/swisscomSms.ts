import { env } from '$env/dynamic/private';

const SWISSCOM_SMS_URL = 'https://api.swisscom.com/messaging/sms';

function requireSwisscomConfig() {
	const clientId = env.SWISSCOM_CLIENT_ID;

	if (!clientId) {
		throw new Error('Swisscom SMS client ID is missing');
	}

	return {
		clientId,
		sender: env.SWISSCOM_SMS_FROM?.trim() || undefined
	};
}

export async function sendSwisscomVerificationSms(params: {
	to: string;
	code: string;
}): Promise<{ messageId: string | null }> {
	const { clientId, sender } = requireSwisscomConfig();
	const messageText = `Time2Log Verifizierungscode: ${params.code}\nTime2Log verification code: ${params.code}`;

	const smsResponse = await fetch(SWISSCOM_SMS_URL, {
		method: 'POST',
		headers: {
			client_id: clientId,
			'Content-Type': 'application/json',
			Accept: 'application/json',
			'SCS-Version': '2'
		},
		body: JSON.stringify({
			...(sender ? { from: sender } : {}),
			to: params.to,
			text: messageText
		})
	});

	if (!smsResponse.ok) {
		const body = await smsResponse.text();
		throw new Error(`Swisscom SMS failed (${smsResponse.status}): ${body}`);
	}

	return { messageId: smsResponse.headers.get('SCS-MessageId') };
}
