/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import * as Redis from 'ioredis';
import { IsNull } from "typeorm";
import type { AvatarDecorationsRepository, InstancesRepository, UsersRepository, AvatarDecoration, User } from '@/models';
import { IdService } from '@/core/IdService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { DI } from '@/di-symbols.js';
import { bindThis } from '@/decorators.js';
import { Cache } from '@/misc/cache.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { StreamMessages } from '@/server/api/stream/types';
import { HttpRequestService } from "@/core/HttpRequestService.js";
import { appendQuery, query } from '@/misc/prelude/url.js';
import type { Config } from '@/config.js';

@Injectable()
export class AvatarDecorationService implements OnApplicationShutdown {
	public cache: Cache<AvatarDecoration[]>;
	constructor(

		@Inject(DI.config)
		private config: Config,

		@Inject(DI.redisSubscriber)
		private redisForSub: Redis.Redis,

		@Inject(DI.avatarDecorationsRepository)
		private avatarDecorationsRepository: AvatarDecorationsRepository,

		@Inject(DI.instancesRepository)
		private instancesRepository: InstancesRepository,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private idService: IdService,
		private moderationLogService: ModerationLogService,
		private globalEventService: GlobalEventService,
		private httpRequestService: HttpRequestService,

	) {
		this.cache = new Cache<AvatarDecoration[]>(1000 * 60 * 30);
		this.redisForSub.on('message', this.onMessage);
	}

	@bindThis
	private async onMessage(_: string, data: string): Promise<void> {
		const obj = JSON.parse(data);
		if (obj.channel === 'internal') {
			const { type, body } = obj.message as StreamMessages['internal']['payload'];
			switch (type) {
				case 'avatarDecorationCreated':
				case 'avatarDecorationUpdated':
				case 'avatarDecorationDeleted': {
					this.cache.delete(null);
					break;
				}
				default:
					break;
			}
		}
	}

	@bindThis
	public async create(options: Partial<AvatarDecoration>, moderator?: User): Promise<AvatarDecoration> {
		const created = await this.avatarDecorationsRepository.insert({
			id: this.idService.genId(),
			...options,
		}).then(x => this.avatarDecorationsRepository.findOneByOrFail(x.identifiers[0]));
		this.globalEventService.publishInternalEvent('avatarDecorationCreated', created);
		if (moderator) {
			this.moderationLogService.insertModerationLog(moderator, 'createAvatarDecoration', {
				avatarDecorationId: created.id,
				avatarDecoration: created,
			});
		}
		return created;
	}

	@bindThis
	public async update(id: AvatarDecoration['id'], params: Partial<AvatarDecoration>, moderator?: User): Promise<void> {
		const avatarDecoration = await this.avatarDecorationsRepository.findOneByOrFail({ id });
		const date = new Date();
		await this.avatarDecorationsRepository.update(avatarDecoration.id, {
			updatedAt: date,
			...params,
		});
		const updated = await this.avatarDecorationsRepository.findOneByOrFail({ id: avatarDecoration.id });
		this.globalEventService.publishInternalEvent('avatarDecorationUpdated', updated);
		if (moderator) {
			this.moderationLogService.insertModerationLog(moderator, 'updateAvatarDecoration', {
				avatarDecorationId: avatarDecoration.id,
				before: avatarDecoration,
				after: updated,
			});
		}
	}
	
	// From CherryPick (Remote avatar)
	@bindThis
	private getProxiedUrl(url: string, mode?: 'static' | 'avatar'): string {
		return appendQuery(
			`${this.config.mediaProxy}/${mode ?? 'image'}.webp`,
			query({
				url,
				...(mode ? { [mode]: '1' } : {}),
			}),
		);
	}

	@bindThis
	public async remoteUserUpdate(user: User) {
		const userHost = user.host ?? '';
		const instance = await this.instancesRepository.findOneBy({ host: userHost });
		const userHostUrl = `https://${user.host}`;
		const showUserApiUrl = `${userHostUrl}/api/users/show`;
		if (instance?.softwareName !== 'misskey' && instance?.softwareName !== 'cherrypick') {
			return;
		}
		const res = await this.httpRequestService.send(showUserApiUrl, {
			method: 'POST',
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ "username": user.username }),
		});
		const userData: any = await res.json();
		const avatarDecorations = userData.avatarDecorations[0];
		if (avatarDecorations != null) {
			const avatarDecorationId = avatarDecorations.id;
			const instanceHost = instance?.host;
			const decorationApiUrl = `https://${instanceHost}/api/get-avatar-decorations`;
			const allRes = await this.httpRequestService.send(decorationApiUrl, {
				method: 'POST',
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});
			const allDecorations: any = await allRes.json();
			let name;
			let description;
			for (const decoration of allDecorations) {
				if (decoration.id === avatarDecorationId) {
					name = decoration.name;
					description = decoration.description;
					break;
				}
			}
			const existingDecoration = await this.avatarDecorationsRepository.findOneBy({ host: userHost, remoteId: avatarDecorationId });
			const decorationData = {
				name: name,
				description: description,
				url: this.getProxiedUrl(avatarDecorations.url, 'static'),
				remoteId: avatarDecorationId,
				host: userHost,
			};
			if (existingDecoration == null) {
				await this.create(decorationData);
			} else {
				await this.update(existingDecoration.id, decorationData);
			}
			const findDecoration = await this.avatarDecorationsRepository.findOneBy({ host: userHost, remoteId: avatarDecorationId });
			const updates = {} as Partial<User>;
			updates.avatarDecorations = [{
				id: findDecoration?.id ?? '',
				angle: avatarDecorations.angle ?? 0,
				flipH: avatarDecorations.flipH ?? false,
			}];
			await this.usersRepository.update({ id: user.id }, updates);
		}
	}

	@bindThis
	public async delete(id: AvatarDecoration['id'], moderator?: User): Promise<void> {
		const avatarDecoration = await this.avatarDecorationsRepository.findOneByOrFail({ id });
		await this.avatarDecorationsRepository.delete({ id: avatarDecoration.id });
		this.globalEventService.publishInternalEvent('avatarDecorationDeleted', avatarDecoration);
		if (moderator) {
			this.moderationLogService.insertModerationLog(moderator, 'deleteAvatarDecoration', {
				avatarDecorationId: avatarDecoration.id,
				avatarDecoration: avatarDecoration,
			});
		}
	}

	@bindThis
	public async getAll(noCache = false, withRemote = false): Promise<AvatarDecoration[]> {
		if (noCache) {
			this.cache.delete(null);
		}
		if (!withRemote) {
			return this.cache.fetch(null, () => this.avatarDecorationsRepository.find({ where: { host: IsNull() } }));
		} else {
			return this.cache.fetch(null, () => this.avatarDecorationsRepository.find());
		}
	}

	@bindThis
	public dispose(): void {
		this.redisForSub.off('message', this.onMessage);
	}

	@bindThis
	public onApplicationShutdown(signal?: string | undefined): void {
		this.dispose();
	}
}
