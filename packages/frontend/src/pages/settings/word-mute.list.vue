<template>
<MkStickyContainer>
	<template #header><MkPageHeader/></template>
	<MkSpacer :content-max="800">
		<XNotes ref="notes" :pagination="pagination"/>
	</MkSpacer>
</MkStickyContainer>
</template>
	
<script lang="ts" setup>
import XNotes from '@/components/MkNotes.vue';
import { i18n } from '@/i18n';
import { definePageMetadata } from '@/scripts/page-metadata';
	
const pagination = {
	endpoint: 'i/get-word-muted-notes' as const,
	limit: 10,
};
	
definePageMetadata({
	title: i18n.ts.hardMutedNotes,
	icon: 'ti ti-eye-off',
});
</script>
	
<style lang="scss" module>
.note {
	background: var(--panel);
	border-radius: var(--radius);
}
</style>
