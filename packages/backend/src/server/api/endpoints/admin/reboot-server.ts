import { execSync } from 'child_process';
import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		confirm: { type: 'string' },
	},
	required: ['confirm'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
	) {
		super(meta, paramDef, async (ps, me) => {
			if (ps.confirm === 'yes' || ps.confirm === 'YES') {
				execSync('systemctl restart misskey.service', { stdio: 'inherit' });
			} else {
				throw new Error('type "yes" or "YES" is required');
			}
		});
	}
}
