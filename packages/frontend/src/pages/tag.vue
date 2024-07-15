<template>
<MkStickyContainer>
	<template #header><MkPageHeader :actions="headerActions" :tabs="headerTabs"/></template>
	<MkSpacer :content-max="800">
		<XNotes class="" :pagination="pagination"/>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import XNotes from '@/components/MkNotes.vue';
import { definePageMetadata } from '@/scripts/page-metadata';
import { i18n } from '@/i18n';
import * as os from '@/os';

const props = defineProps<{
	tag: string;
}>();

const pagination = {
	endpoint: 'notes/search-by-tag' as const,
	limit: 10,
	params: computed(() => ({
		tag: props.tag,
	})),
};

const headerActions = $computed(() => [{
	icon: 'ti ti-plus',
	text: i18n.ts.note,
	handler: create,
}]);

const headerTabs = $computed(() => []);

function create() {
	os.post({
		initialText: `${props.tag} `,
	});
}

definePageMetadata(computed(() => ({
	title: props.tag,
	icon: 'ti ti-hash',
})));
</script>
