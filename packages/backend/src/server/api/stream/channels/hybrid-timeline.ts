import { Injectable } from '@nestjs/common';
import { checkWordMute } from '@/misc/check-word-mute.js';
import { isUserRelated } from '@/misc/is-user-related.js';
import { isInstanceMuted } from '@/misc/is-instance-muted.js';
import type { Packed } from '@/misc/schema.js';
import { MetaService } from '@/core/MetaService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { bindThis } from '@/decorators.js';
import { RoleService } from '@/core/RoleService.js';
import Channel from '../channel.js';

class HybridTimelineChannel extends Channel {
	public readonly chName = 'hybridTimeline';
	public static shouldShare = true;
	public static requireCredential = true;

	constructor(
		private metaService: MetaService,
		private roleService: RoleService,
		private noteEntityService: NoteEntityService,

		id: string,
		connection: Channel['connection'],
	) {
		super(id, connection);
		//this.onNote = this.onNote.bind(this);
	}

	@bindThis
	public async init(params: any): Promise<void> {
		const policies = await this.roleService.getUserPolicies(this.user ? this.user.id : null);
		if (!policies.ltlAvailable) return;

		// Subscribe events
		this.subscriber.on('notesStream', this.onNote);
	}

	@bindThis
	private async onNote(note: Packed<'Note'>) {
		// チャンネルの投稿ではなく、自分自身の投稿 または
		// チャンネルの投稿ではなく、その投稿のユーザーをフォローしている または
		// チャンネルの投稿ではなく、全体公開のローカルの投稿 または
		// フォローしているチャンネルの投稿 の場合だけ
		if (!(
			(note.channelId == null && this.user!.id === note.userId) ||
			(note.channelId == null && this.following.has(note.userId)) ||
			(note.channelId == null && (note.user.host == null && note.visibility === 'public')) ||
			(note.channelId != null && this.followingChannels.has(note.channelId))
		)) return;

		if (['followers', 'specified'].includes(note.visibility)) {
			note = await this.noteEntityService.pack(note.id, this.user!, {
				detail: true,
			});

			if (note.isHidden) {
				return;
			}
		} else {
			// replyをpack
			if (note.replyId != null) {
				note.reply = await this.noteEntityService.pack(note.replyId, this.user, {
					detail: true,
				});
			}
			// renoteをpack
			if (note.renoteId != null) {
				note.renote = await this.noteEntityService.pack(note.renoteId, this.user, {
					detail: true,
				});
			}
		}

		// ユーザーがミュートしたインスタンスからであれば無視
		if (isInstanceMuted(note, new Set<string>(this.userProfile?.mutedInstances ?? []))) return;

		// 関係ない返信は除外
		if (note.reply && !this.user!.showTimelineReplies) {
			const reply = note.reply;
			// 「チャンネル接続主への返信」でもなければ、「チャンネル接続主が行った返信」でもなければ、「投稿者の投稿者自身への返信」でもない場合
			if (reply.userId !== this.user!.id && note.userId !== this.user!.id && reply.userId !== note.userId) return;
		}

		// 流れてきたNoteがミュートしているユーザーが関わるものだったら無視する
		if (isUserRelated(note, this.muting)) return;
		// 流れてきたNoteがブロックされているユーザーが関わるものだったら無視する
		if (isUserRelated(note, this.blocking)) return;

		// ワードミュート判定
		this.checkWordMutes(note).then(result => {
			if (result) {
				return;
			}
			else {
				this.connection.cacheNote(note);
				this.send('note', note);
			}
		});
	}

	@bindThis
	public dispose(): void {
		// Unsubscribe events
		this.subscriber.off('notesStream', this.onNote);
	}

	@bindThis
	private async checkWordMutes(note: Packed<'Note'>): Promise<boolean> {
		// リプライなら元ノート参照、ミュート判定
		if (note.replyId != null) {
			note.reply = await this.noteEntityService.pack(note.replyId, this.user, {
				detail: true,
			});
			if (this.userProfile !== null && this.userProfile !== undefined) {
				if (await checkWordMute(note.reply, this.user, this.userProfile.mutedWords)) return true;
			}
		}
		// Renoteなら元ノート参照、ミュート判定
		if (note.renoteId != null) {
			note.renote = await this.noteEntityService.pack(note.renoteId, this.user, {
				detail: true,
			});
			if (this.userProfile !== null && this.userProfile !== undefined) {
				if (await checkWordMute(note.renote, this.user, this.userProfile.mutedWords)) return true;
			}
		}
		// このノート自体のミュート判定
		if (this.userProfile && await checkWordMute(note, this.user, this.userProfile.mutedWords)) return true;

		return false;
	}
}

@Injectable()
export class HybridTimelineChannelService {
	public readonly shouldShare = HybridTimelineChannel.shouldShare;
	public readonly requireCredential = HybridTimelineChannel.requireCredential;

	constructor(
		private metaService: MetaService,
		private roleService: RoleService,
		private noteEntityService: NoteEntityService,
	) {
	}

	@bindThis
	public create(id: string, connection: Channel['connection']): HybridTimelineChannel {
		return new HybridTimelineChannel(
			this.metaService,
			this.roleService,
			this.noteEntityService,
			id,
			connection,
		);
	}
}
