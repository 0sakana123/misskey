/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import * as Redis from 'ioredis';
import type { AvatarDecorationsRepository, AvatarDecoration, User } from '@/models';
import { IdService } from '@/core/IdService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { DI } from '@/di-symbols.js';
import { bindThis } from '@/decorators.js';
import { Cache } from '@/misc/cache.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { StreamMessages } from '@/server/api/stream/types';
@Injectable()
export class AvatarDecorationService implements OnApplicationShutdown {
	public cache: Cache<AvatarDecoration[]>;
	constructor(
		@Inject(DI.redisSubscriber)
		private redisForSub: Redis.Redis,
		@Inject(DI.avatarDecorationsRepository)
		private avatarDecorationsRepository: AvatarDecorationsRepository,
		private idService: IdService,
		private moderationLogService: ModerationLogService,
		private globalEventService: GlobalEventService,
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
	public async getAll(noCache = false): Promise<AvatarDecoration[]> {
		if (noCache) {
			this.cache.delete(null);
		}
		return this.cache.fetch(null, () => this.avatarDecorationsRepository.find());
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
