<template>
<div v-if="hide" class="icozogqfvdetwohsdglrbswgrejoxbdj" @click="hide = false">
	<!-- 【注意】dataSaverMode が有効になっている際には、hide が false になるまでサムネイルや動画を読み込まないようにすること -->
	<div>
		<b v-if="video.isSensitive"><i class="ti ti-alert-triangle"></i> {{ $ts.sensitive }}{{ defaultStore.state.enableDataSaverMode ? ` (${$ts.video}${video.size ? ' ' + bytes(video.size) : ''})` : '' }}</b>
		<b v-else><i class="ti ti-movie"></i> {{ defaultStore.state.enableDataSaverMode && video.size ? bytes(video.size) : $ts.video }}</b>
		<span>{{ $ts.clickToShow }}</span>
	</div>
</div>
<div v-else class="kkjnbbplepmiyuadieoenjgutgcmtsvu">
	<VuePlyr :options="{ volume: 0.5 }">
		<video
			controls
			:data-poster="video.thumbnailUrl"
		>
			<source
				size="720"
				:src="video.url" 
				:type="video.type"
			/>
		</video>
	</VuePlyr>
	<i class="ti ti-eye-off" @click="hide = true"></i>
</div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import * as misskey from 'misskey-js';
import bytes from '@/filters/bytes';
import VuePlyr from 'vue-plyr';
import { defaultStore } from '@/store';
import 'vue-plyr/dist/vue-plyr.css';

const props = defineProps<{
	video: misskey.entities.DriveFile;
}>();

const hide = ref((defaultStore.state.nsfw === 'force' || defaultStore.state.enableDataSaverMode) ? true : (props.video.isSensitive && defaultStore.state.nsfw !== 'ignore'));
</script>

<style lang="scss" scoped>
.kkjnbbplepmiyuadieoenjgutgcmtsvu {
	position: relative;

	--plyr-color-main: var(--accent);

	> i {
		display: block;
		position: absolute;
		border-bottom-left-radius: 18px;
		background-color: var(--fg);
		color: var(--accentLighten);
		font-size: 14px;
		opacity: .5;
		padding: 8px 12px;
		text-align: center;
		cursor: pointer;
		top: 0px;
		right: 0px;
	}

	> video {
		display: flex;
		justify-content: center;
		align-items: center;

		font-size: 3.5em;
		overflow: hidden;
		background-position: center;
		background-size: cover;
		width: 100%;
		height: 100%;
	}
}

.icozogqfvdetwohsdglrbswgrejoxbdj {
	display: flex;
	justify-content: center;
	align-items: center;
	background: #111;
	color: #fff;

	> div {
		display: table-cell;
		text-align: center;
		font-size: 12px;

		> b {
			display: block;
		}
	}
}
</style>
