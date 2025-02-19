import { Inject, Injectable } from '@nestjs/common';
import FFmpeg from 'fluent-ffmpeg';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import { ImageProcessingService } from '@/core/ImageProcessingService.js';
import type { IImage } from '@/core/ImageProcessingService.js';
import { createTempDir } from '@/misc/create-temp.js';
import { bindThis } from '@/decorators.js';
import { appendQuery, query } from '@/misc/prelude/url.js';

@Injectable()
export class VideoProcessingService {
	constructor(
		@Inject(DI.config)
		private config: Config,

		private imageProcessingService: ImageProcessingService,
	) {
	}

	@bindThis
	public async generateVideoThumbnail(source: string): Promise<IImage> {
		const [dir, cleanup] = await createTempDir();
	
		try {
			await new Promise((res, rej) => {
				FFmpeg({
					source,
				})
					.on('end', res)
					.on('error', rej)
					.screenshot({
						folder: dir,
						filename: 'out.png',	// must have .png extension
						count: 1,
						timestamps: ['5%'],
					});
			});

			return await this.imageProcessingService.convertToWebp(`${dir}/out.png`, 498, 280);
		} finally {
			cleanup();
		}
	}

	@bindThis
	public getExternalVideoThumbnailUrl(url: string): string | null {
		if (this.config.videoThumbnailGenerator == null) return null;

		return appendQuery(
			`${this.config.videoThumbnailGenerator}/thumbnail.webp`,
			query({
				thumbnail: '1',
				url,
			})
		);
	}

	@bindThis
	public async convert3gppToMp4(source: string): Promise<string> {
		const dir = source.replace(/[^/]+$/, '');
	
		return await new Promise((res, rej) => {
			FFmpeg({
				source,
			})
				.output(`${dir}out.mp4`)
				.videoCodec('libx264') // H.264 コーデックでエンコード
				.audioCodec('aac') // AAC コーデックでエンコード
				.format('mp4') // 出力フォーマットを mp4 に指定
				.outputOptions('-preset fast') // 高速エンコード
				.on('stderr', (err) => console.error(`FFmpeg stderr: ${err}`)) // FFmpegエラー
				.on('end', () => { res(`${dir}/out.mp4`); }) // 成功時に出力パスを返す
				.on('error', (err) => { rej(new Error(`Conversion failed: ${err.message}`)); }) // 失敗時にエラーを返す
				.run();
		});
	}
}

