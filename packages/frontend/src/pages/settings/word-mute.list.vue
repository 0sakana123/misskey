<template>
<MkStickyContainer>
	<template #header><MkPageHeader/></template>
	<MkSpacer :content-max="800">
		<MkPagination :pagination="pagination">
			<template #empty>
				<div class="_fullinfo">
					<img :src="infoImageUrl" class="_ghost"/>
					<div>{{ i18n.ts.noNotes }}</div>
				</div>
			</template>
	
			<template #default="{ items }">
				<MkDateSeparatedList v-slot="{ item }" :items="items" :direction="'down'" :no-gap="false" :ad="false">
					<XNote :key="item.id" :note="item.note" :class="$style.note"/>
				</MkDateSeparatedList>
			</template>
		</MkPagination>
	</MkSpacer>
</MkStickyContainer>
</template>
	
<script lang="ts" setup>
import MkPagination from '@/components/MkPagination.vue';
import XNote from '@/components/MkNote.vue';
import MkDateSeparatedList from '@/components/MkDateSeparatedList.vue';
import { i18n } from '@/i18n';
import { definePageMetadata } from '@/scripts/page-metadata';
import { infoImageUrl } from '@/instance';
	
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
