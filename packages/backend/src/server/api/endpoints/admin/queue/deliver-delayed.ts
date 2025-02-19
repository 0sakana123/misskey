import { URL } from 'node:url';
import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { DeliverQueue } from '@/core/QueueModule.js';
import { FederatedInstanceService } from '@/core/FederatedInstanceService.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	//requireModerator: true, //未ログインでも見えるのにモデレーター権限いる？

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'array',
			optional: false, nullable: false,
			items: {
				anyOf: [
					{
						type: 'string',
					},
					{
						type: 'number',
					},
					{
						type: 'boolean',
					},
				],
			},
		},
		example: [[
			'example.com',
			12,
			true,	// isNotResponding
		]],
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

// eslint-disable-next-line import/no-default-export
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject('queue:deliver') public deliverQueue: DeliverQueue,
		private federatedInstanceService: FederatedInstanceService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const jobs = await this.deliverQueue.getJobs(['delayed']);
	
			const resMap = new Map<string, { count: number; flag: boolean }>();
	
			for (const job of jobs) {
				const host = new URL(job.data.to).host;
				const entry = resMap.get(host);
				if (entry) {
					entry.count++;
				} else {
					resMap.set(host, { count: 1, flag: false });
				}
			}

			await Promise.all(
				Array.from(resMap.keys()).map(async (host) => {
					const instanceInfo = await this.federatedInstanceService.fetch(host);
					resMap.get(host)!.flag = instanceInfo.isNotResponding;
				}),
			);

			// 配列に変換し、カウントの降順でソート
			const res: [string, number, boolean][] = Array.from(resMap, ([host, data]) => [host, data.count, data.flag]);
			res.sort((a, b) => b[1] - a[1]);

			return res;
		});
	}
}
