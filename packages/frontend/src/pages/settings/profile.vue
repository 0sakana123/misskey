<template>
<div class="_gaps_m">
	<div :class="$style.llvierxe" :style="{ backgroundImage: $i.bannerUrl ? `url(${ $i.bannerUrl })` : null }">
		<div :class="$style.avatar">
			<MkAvatar :class="$style.avatar" :user="$i" @click="changeAvatar"/>
			<MkButton primary rounded :class="$style.avatarEdit" @click="changeAvatar">{{ i18n.ts._profile.changeAvatar }}</MkButton>
		</div>
		<MkButton primary rounded :class="$style.bannerEdit" @click="changeBanner">{{ i18n.ts._profile.changeBanner }}</MkButton>
	</div>

	<MkInput v-model="profile.name" :max="30" manual-save>
		<template #label>{{ i18n.ts._profile.name }}</template>
	</MkInput>

	<MkTextarea v-model="profile.description" :max="500" tall manual-save>
		<template #label>{{ i18n.ts._profile.description }}</template>
		<template #caption>{{ i18n.ts._profile.youCanIncludeHashtags }}</template>
	</MkTextarea>

	<MkInput v-model="profile.location" manual-save>
		<template #label>{{ i18n.ts.location }}</template>
		<template #prefix><i class="ti ti-map-pin"></i></template>
	</MkInput>

	<MkInput v-model="profile.birthday" type="date" manual-save>
		<template #label>{{ i18n.ts.birthday }}</template>
		<template #prefix><i class="ti ti-cake"></i></template>
	</MkInput>

	<MkSelect v-model="profile.lang">
		<template #label>{{ i18n.ts.language }}</template>
		<option v-for="x in Object.keys(langmap)" :key="x" :value="x">{{ langmap[x].nativeName }}</option>
	</MkSelect>

	<FormSlot>
		<MkFolder>
			<template #icon><i class="ti ti-list"></i></template>
			<template #label>{{ i18n.ts._profile.metadataEdit }}</template>

			<div class="_gaps_m">
				<FormSplit v-for="(record, i) in fields" :min-width="250">
					<MkInput v-model="record.name" small>
						<template #label>{{ i18n.ts._profile.metadataLabel }} #{{ i + 1 }}</template>
					</MkInput>
					<MkInput v-model="record.value" small>
						<template #label>{{ i18n.ts._profile.metadataContent }} #{{ i + 1 }}</template>
					</MkInput>
				</FormSplit>
				<div>
					<MkButton :disabled="fields.length >= 16" inline style="margin-right: 8px;" @click="addField"><i class="ti ti-plus"></i> {{ i18n.ts.add }}</MkButton>
					<MkButton inline primary @click="saveFields"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
				</div>
			</div>
		</MkFolder>
		<template #caption>{{ i18n.ts._profile.metadataDescription }}</template>
	</FormSlot>
	
	<MkFolder>
		<template #icon><i class="ti ti-sparkles"></i></template>
		<template #label>{{ i18n.ts.avatarDecorations }}</template>
		<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); grid-gap: 12px;">
			<div
				v-for="avatarDecoration in avatarDecorations"
				:key="avatarDecoration.id"
				:class="[$style.avatarDecoration, { [$style.avatarDecorationActive]: $i.avatarDecorations.some(x => x.id === avatarDecoration.id) }]"
				@click="toggleDecoration(avatarDecoration)"
			>
				<div :class="$style.avatarDecorationName">{{ avatarDecoration.name }}</div>
				<MkAvatar style="width: 64px; height: 64px;" :user="$i" :decoration="avatarDecoration.url"/>
			</div>
		</div>
	</MkFolder>

	<MkFolder>
		<template #label>{{ i18n.ts.advancedSettings }}</template>

		<div class="_gaps_m">
			<MkSwitch v-model="profile.isCat">{{ i18n.ts.flagAsCat }}<template #caption>{{ i18n.ts.flagAsCatDescription }}</template></MkSwitch>
			<MkSwitch v-model="profile.isBot">{{ i18n.ts.flagAsBot }}<template #caption>{{ i18n.ts.flagAsBotDescription }}</template></MkSwitch>
		</div>
	</MkFolder>

	<MkSwitch v-model="profile.showTimelineReplies">{{ i18n.ts.flagShowTimelineReplies }}<template #caption>{{ i18n.ts.flagShowTimelineRepliesDescription }} {{ i18n.ts.reflectMayTakeTime }}</template></MkSwitch>
</div>
</template>

<script lang="ts" setup>
import { reactive, watch } from 'vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkSelect from '@/components/MkSelect.vue';
import FormSplit from '@/components/form/split.vue';
import MkFolder from '@/components/MkFolder.vue';
import FormSlot from '@/components/form/slot.vue';
import { host } from '@/config';
import { selectFile } from '@/scripts/select-file';
import * as os from '@/os';
import { i18n } from '@/i18n';
import { $i } from '@/account';
import { langmap } from '@/scripts/langmap';
import { definePageMetadata } from '@/scripts/page-metadata';
import { claimAchievement } from '@/scripts/achievements';

let avatarDecorations: any[] = $ref([]);

const profile = reactive({
	name: $i.name,
	description: $i.description,
	location: $i.location,
	birthday: $i.birthday,
	lang: $i.lang,
	isBot: $i.isBot,
	isCat: $i.isCat,
	showTimelineReplies: $i.showTimelineReplies,
});

watch(() => profile, () => {
	save();
}, {
	deep: true,
});

const fields = reactive($i.fields.map(field => ({ name: field.name, value: field.value })));

os.api('get-avatar-decorations').then(_avatarDecorations => {
	avatarDecorations = _avatarDecorations;
});

function addField() {
	fields.push({
		name: '',
		value: '',
	});
}

while (fields.length < 4) {
	addField();
}

function saveFields() {
	os.apiWithDialog('i/update', {
		fields: fields.filter(field => field.name !== '' && field.value !== ''),
	});
}

function save() {
	os.apiWithDialog('i/update', {
		name: profile.name || null,
		description: profile.description || null,
		location: profile.location || null,
		birthday: profile.birthday || null,
		lang: profile.lang || null,
		isBot: !!profile.isBot,
		isCat: !!profile.isCat,
		showTimelineReplies: !!profile.showTimelineReplies,
	});
	claimAchievement('profileFilled');
	if (profile.name === 'syuilo' || profile.name === 'しゅいろ') {
		claimAchievement('setNameToSyuilo');
	}
	if (profile.isCat) {
		claimAchievement('markedAsCat');
	}
}

function changeAvatar(ev) {
	selectFile(ev.currentTarget ?? ev.target, i18n.ts.avatar).then(async (file) => {
		let originalOrCropped = file;

		const { canceled } = await os.confirm({
			type: 'question',
			text: i18n.t('cropImageAsk'),
			okText: i18n.ts.cropYes,
			cancelText: i18n.ts.cropNo,
		});

		if (!canceled) {
			originalOrCropped = await os.cropImage(file, {
				aspectRatio: 1,
			});
		}

		const i = await os.apiWithDialog('i/update', {
			avatarId: originalOrCropped.id,
		});
		$i.avatarId = i.avatarId;
		$i.avatarUrl = i.avatarUrl;
		claimAchievement('profileFilled');
	});
}

function changeBanner(ev) {
	selectFile(ev.currentTarget ?? ev.target, i18n.ts.banner).then(async (file) => {
		let originalOrCropped = file;

		const { canceled } = await os.confirm({
			type: 'question',
			text: i18n.t('cropImageAsk'),
			okText: i18n.ts.cropYes,
			cancelText: i18n.ts.cropNo,
		});

		if (!canceled) {
			originalOrCropped = await os.cropImage(file, {
				aspectRatio: 2,
			});
		}

		const i = await os.apiWithDialog('i/update', {
			bannerId: originalOrCropped.id,
		});
		$i.bannerId = i.bannerId;
		$i.bannerUrl = i.bannerUrl;
	});
}

function toggleDecoration(avatarDecoration) {
	if ($i.avatarDecorations.some(x => x.id === avatarDecoration.id)) {
		os.apiWithDialog('i/update', {
			avatarDecorations: [],
		});
		$i.avatarDecorations = [];
	} else {
		os.apiWithDialog('i/update', {
			avatarDecorations: [avatarDecoration.id],
		});
		$i.avatarDecorations.push(avatarDecoration);
	}
}

const headerActions = $computed(() => []);

const headerTabs = $computed(() => []);

definePageMetadata({
	title: i18n.ts.profile,
	icon: 'ti ti-user',
});
</script>

<style lang="scss" module>
.llvierxe {
	position: relative;
	background-size: cover;
	background-position: center;
	border: solid 1px var(--divider);
	border-radius: 10px;
	overflow: clip;

	> .avatar {
		display: inline-block;
		text-align: center;
		padding: 16px;

		> .avatar {
			display: inline-block;
			width: 72px;
			height: 72px;
			margin: 0 auto 16px auto;
		}
	}

	> .bannerEdit {
		position: absolute;
		top: 16px;
		right: 16px;
	}
}

.avatarDecoration {
	cursor: pointer;
	padding: 16px 16px 24px 16px;
	border: solid 2px var(--divider);
	border-radius: 8px;
	text-align: center;
}
.avatarDecorationActive {
	border-color: var(--accent);
}
.avatarDecorationName {
	position: relative;
	z-index: 10;
	font-weight: bold;
	margin-bottom: 16px;
}
</style>
