import { Inject, Injectable } from '@nestjs/common';
import { In, Not } from 'typeorm';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import type { DriveFile } from '@/models/entities/DriveFile.js';
import type { MessagingMessage } from '@/models/entities/MessagingMessage.js';
import type { Note } from '@/models/entities/Note.js';
import type { User, CacheableUser, IRemoteUser } from '@/models/entities/User.js';
import type { UserGroup } from '@/models/entities/UserGroup.js';
import { QueueService } from '@/core/QueueService.js';
import { toArray } from '@/misc/prelude/array.js';
import { IdentifiableError } from '@/misc/identifiable-error.js';
import type { MessagingMessagesRepository, MutingsRepository, UserGroupJoiningsRepository, UsersRepository } from '@/models/index.js';
import { IdService } from '@/core/IdService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { ApRendererService } from '@/core/activitypub/ApRendererService.js';
import { MessagingMessageEntityService } from '@/core/entities/MessagingMessageEntityService.js';
import { PushNotificationService } from '@/core/PushNotificationService.js';
import { bindThis } from '@/decorators.js';
import { CreateNotificationService } from '@/core/CreateNotificationService.js';

@Injectable()
export class MessagingService {
	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.messagingMessagesRepository)
		private messagingMessagesRepository: MessagingMessagesRepository,

		@Inject(DI.userGroupJoiningsRepository)
		private userGroupJoiningsRepository: UserGroupJoiningsRepository,

		@Inject(DI.mutingsRepository)
		private mutingsRepository: MutingsRepository,

		private userEntityService: UserEntityService,
		private messagingMessageEntityService: MessagingMessageEntityService,
		private idService: IdService,
		private globalEventService: GlobalEventService,
		private apRendererService: ApRendererService,
		private queueService: QueueService,
		private pushNotificationService: PushNotificationService,
		private createNotificationService: CreateNotificationService,
	) {
	}

	@bindThis
	public async createMessage(user: { id: User['id']; host: User['host']; }, recipientUser: CacheableUser | undefined, recipientGroup: UserGroup | undefined, text: string | null | undefined, file: DriveFile | null, uri?: string): Promise<any> {
		const message = {
			id: this.idService.genId(),
			createdAt: new Date(),
			fileId: file ? file.id : null,
			recipientId: recipientUser ? recipientUser.id : null,
			groupId: recipientGroup ? recipientGroup.id : null,
			text: text ? text.trim() : null,
			userId: user.id,
			isRead: false,
			reads: [] as string[],
			uri,
		} as MessagingMessage;
	
		await this.messagingMessagesRepository.insert(message);
	
		const messageObj = await this.messagingMessageEntityService.pack(message);
	
		if (recipientUser) {
			if (this.userEntityService.isLocalUser(user)) {
				// 自分のストリーム
				this.globalEventService.publishMessagingStream(message.userId, recipientUser.id, 'message', messageObj);
				this.globalEventService.publishMessagingIndexStream(message.userId, 'message', messageObj);
				this.globalEventService.publishMainStream(message.userId, 'messagingMessage', messageObj);
			}
	
			if (this.userEntityService.isLocalUser(recipientUser)) {
				// 相手のストリーム
				this.globalEventService.publishMessagingStream(recipientUser.id, message.userId, 'message', messageObj);
				this.globalEventService.publishMessagingIndexStream(recipientUser.id, 'message', messageObj);
				this.globalEventService.publishMainStream(recipientUser.id, 'messagingMessage', messageObj);
			}
		} else if (recipientGroup) {
			// グループのストリーム
			this.globalEventService.publishGroupMessagingStream(recipientGroup.id, 'message', messageObj);
	
			// メンバーのストリーム
			const joinings = await this.userGroupJoiningsRepository.findBy({ userGroupId: recipientGroup.id });
			for (const joining of joinings) {
				this.globalEventService.publishMessagingIndexStream(joining.userId, 'message', messageObj);
				this.globalEventService.publishMainStream(joining.userId, 'messagingMessage', messageObj);
			}
		}
	
		// 2秒経っても(今回作成した)メッセージが既読にならなかったら「未読のメッセージがありますよ」イベントを発行する
		setTimeout(async () => {
			const freshMessage = await this.messagingMessagesRepository.findOneBy({ id: message.id });
			if (freshMessage == null) return; // メッセージが削除されている場合もある
	
			if (recipientUser && this.userEntityService.isLocalUser(recipientUser)) {
				if (freshMessage.isRead) return; // 既読
	
				//#region ただしミュートされているなら発行しない
				const mute = await this.mutingsRepository.findBy({
					muterId: recipientUser.id,
				});
				if (mute.map(m => m.muteeId).includes(user.id)) return;
				//#endregion
	
				this.globalEventService.publishMainStream(recipientUser.id, 'unreadMessagingMessage', messageObj);
				this.pushNotificationService.pushNotification(recipientUser.id, 'unreadMessagingMessage', messageObj);
				this.createNotificationService.createNotification(recipientUser.id, 'chatMessageReceived', {
					notifierId: message.userId,
					messageId: message.id,
				});
			} else if (recipientGroup) {
				const joinings = await this.userGroupJoiningsRepository.findBy({ userGroupId: recipientGroup.id, userId: Not(user.id) });
				for (const joining of joinings) {
					if (freshMessage.reads.includes(joining.userId)) return; // 既読
					this.globalEventService.publishMainStream(joining.userId, 'unreadMessagingMessage', messageObj);
					this.pushNotificationService.pushNotification(joining.userId, 'unreadMessagingMessage', messageObj);
					this.createNotificationService.createNotification(joining.userId, 'chatMessageReceived', {
						notifierId: message.userId,
						messageId: message.id,
					});
				}
			}
		}, 2000);
	
		if (recipientUser && this.userEntityService.isLocalUser(user) && this.userEntityService.isRemoteUser(recipientUser)) {
			const note = {
				id: message.id,
				createdAt: message.createdAt,
				fileIds: message.fileId ? [message.fileId] : [],
				text: message.text,
				userId: message.userId,
				visibility: 'specified',
				mentions: [recipientUser].map(u => u.id),
				mentionedRemoteUsers: JSON.stringify([recipientUser].map(u => ({
					uri: u.uri,
					username: u.username,
					host: u.host,
				}))),
			} as Note;
	
			const activity = this.apRendererService.renderActivity(this.apRendererService.renderCreate(await this.apRendererService.renderNote(note, false, true), note));
	
			this.queueService.deliver(user, activity, recipientUser.inbox);
		}
		return messageObj;
	}

	@bindThis
	public async deleteMessage(message: MessagingMessage): Promise<void> {
		await this.messagingMessagesRepository.delete(message.id);
		this.postDeleteMessage(message);
	}
	
	@bindThis
	private async postDeleteMessage(message: MessagingMessage): Promise<void> {
		if (message.recipientId) {
			const user = await this.usersRepository.findOneByOrFail({ id: message.userId });
			const recipient = await this.usersRepository.findOneByOrFail({ id: message.recipientId });
	
			if (this.userEntityService.isLocalUser(user)) this.globalEventService.publishMessagingStream(message.userId, message.recipientId, 'deleted', message.id);
			if (this.userEntityService.isLocalUser(recipient)) this.globalEventService.publishMessagingStream(message.recipientId, message.userId, 'deleted', message.id);
	
			if (this.userEntityService.isLocalUser(user) && this.userEntityService.isRemoteUser(recipient)) {
				const activity = this.apRendererService.renderActivity(this.apRendererService.renderDelete(this.apRendererService.renderTombstone(`${this.config.url}/notes/${message.id}`), user));
				this.queueService.deliver(user, activity, recipient.inbox);
			}
		} else if (message.groupId) {
			this.globalEventService.publishGroupMessagingStream(message.groupId, 'deleted', message.id);
		}
	}

	/**
	 * Mark messages as read
	 */
	@bindThis
	public async readUserMessagingMessage(
		userId: User['id'],
		otherpartyId: User['id'],
		messageIds: MessagingMessage['id'][],
	): Promise<void> {
		if (messageIds.length === 0) return;

		const messages = await this.messagingMessagesRepository.findBy({
			id: In(messageIds),
		});

		for (const message of messages) {
			if (message.recipientId !== userId) {
				throw new IdentifiableError('e140a4bf-49ce-4fb6-b67c-b78dadf6b52f', 'Access denied (user).');
			}
		}

		// Update documents
		await this.messagingMessagesRepository.update({
			id: In(messageIds),
			userId: otherpartyId,
			recipientId: userId,
			isRead: false,
		}, {
			isRead: true,
		});

		// Publish event
		this.globalEventService.publishMessagingStream(otherpartyId, userId, 'read', messageIds);
		this.globalEventService.publishMessagingIndexStream(userId, 'read', messageIds);

		if (!await this.userEntityService.getHasUnreadMessagingMessage(userId)) {
		// 全ての(いままで未読だった)自分宛てのメッセージを(これで)読みましたよというイベントを発行
			this.globalEventService.publishMainStream(userId, 'readAllMessagingMessages');
			this.pushNotificationService.pushNotification(userId, 'readAllMessagingMessages', undefined);
		} else {
		// そのユーザーとのメッセージで未読がなければイベント発行
			const count = await this.messagingMessagesRepository.count({
				where: {
					userId: otherpartyId,
					recipientId: userId,
					isRead: false,
				},
				take: 1,
			});

			if (!count) {
				this.pushNotificationService.pushNotification(userId, 'readAllMessagingMessagesOfARoom', { userId: otherpartyId });
			}
		}
	}

	/**
	 * Mark messages as read
	 */
	@bindThis
	public async readGroupMessagingMessage(
		userId: User['id'],
		groupId: UserGroup['id'],
		messageIds: MessagingMessage['id'][],
	): Promise<void> {
		if (messageIds.length === 0) return;

		// check joined
		const joining = await this.userGroupJoiningsRepository.findOneBy({
			userId: userId,
			userGroupId: groupId,
		});

		if (joining == null) {
			throw new IdentifiableError('930a270c-714a-46b2-b776-ad27276dc569', 'Access denied (group).');
		}

		const messages = await this.messagingMessagesRepository.findBy({
			id: In(messageIds),
		});

		const reads: MessagingMessage['id'][] = [];

		for (const message of messages) {
			if (message.userId === userId) continue;
			if (message.reads.includes(userId)) continue;

			// Update document
			await this.messagingMessagesRepository.createQueryBuilder().update()
				.set({
					reads: (() => `array_append("reads", '${joining.userId}')`) as any,
				})
				.where('id = :id', { id: message.id })
				.execute();

			reads.push(message.id);
		}

		// Publish event
		this.globalEventService.publishGroupMessagingStream(groupId, 'read', {
			ids: reads,
			userId: userId,
		});
		this.globalEventService.publishMessagingIndexStream(userId, 'read', reads);

		if (!await this.userEntityService.getHasUnreadMessagingMessage(userId)) {
		// 全ての(いままで未読だった)自分宛てのメッセージを(これで)読みましたよというイベントを発行
			this.globalEventService.publishMainStream(userId, 'readAllMessagingMessages');
			this.pushNotificationService.pushNotification(userId, 'readAllMessagingMessages', undefined);
		} else {
		// そのグループにおいて未読がなければイベント発行
			const unreadExist = await this.messagingMessagesRepository.createQueryBuilder('message')
				.where('message.groupId = :groupId', { groupId: groupId })
				.andWhere('message.userId != :userId', { userId: userId })
				.andWhere('NOT (:userId = ANY(message.reads))', { userId: userId })
				.andWhere('message.createdAt > :joinedAt', { joinedAt: joining.createdAt }) // 自分が加入する前の会話については、未読扱いしない
				.getOne().then(x => x != null);

			if (!unreadExist) {
				this.pushNotificationService.pushNotification(userId, 'readAllMessagingMessagesOfARoom', { groupId });
			}
		}
	}

	@bindThis
	public async deliverReadActivity(user: { id: User['id']; host: null; }, recipient: IRemoteUser, messages: MessagingMessage | MessagingMessage[]): Promise<void> {
		const convertedMessages = toArray(messages).filter(x => x.uri);
		const contents = convertedMessages.map(x => this.apRendererService.renderRead(user, x));

		if (contents.length > 1) {
			const collection = this.apRendererService.renderOrderedCollection(null, contents.length, undefined, undefined, contents);
			this.queueService.deliver(user, this.apRendererService.renderActivity(collection), recipient.inbox);
		} else {
			for (const content of contents) {
				this.queueService.deliver(user, this.apRendererService.renderActivity(content), recipient.inbox);
			}
		}
	}
}
