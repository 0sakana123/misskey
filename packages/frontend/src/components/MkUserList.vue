<template>
<MkPagination :pagination="pagination">
	<template #empty>
		<div class="_fullinfo">
			<img :src="infoImageUrl" class="_ghost"/>
			<div>{{ i18n.ts.noUsers }}</div>
		</div>
	</template>

	<template #default="{ items: users }">
		<div class="efvhhmdq">
			<MkUserInfo v-for="user in users" :key="user.id" class="user" :user="user"/>
		</div>
	</template>
</MkPagination>
</template>

<script lang="ts" setup>
import { shallowRef } from 'vue';
import MkUserInfo from '@/components/MkUserInfo.vue';
import MkPagination, { Paging } from '@/components/MkPagination.vue';
import { userPage } from '@/filters/user';
import { i18n } from '@/i18n';
import { infoImageUrl } from '@/instance';

const props = defineProps<{
	pagination: Paging;
	noGap?: boolean;
}>();
</script>

<style lang="scss" scoped>
.efvhhmdq {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
	grid-gap: var(--margin);
}
</style>
