<template>
<MkStickyContainer>
	<template #header><MkPageHeader v-model:tab="tab" :actions="headerActions" :tabs="headerTabs"/></template>
	<MkSpacer :content-max="700">
		<div v-if="tab === 'owned'" class="_content">
			<MkButton class="new" @click="create()"><i class="ti ti-plus"></i></MkButton>
			<MkPagination v-slot="{items}" :ref="ownedComponent" :pagination="ownedPagination">
				<div v-for="group in items" :key="group.id" class="_card">
					<div class="_title"><MkA :to="`/my/groups/${ group.id }`" class="_link">{{ group.name }}</MkA></div>
					<div class="_content"><MkAvatars :user-ids="group.userIds"/></div>
				</div>
			</MkPagination>
		</div>
		<div v-else-if="tab === 'joined'" class="_content">
			<MkPagination v-slot="{items}" :ref="joinedComponent" :pagination="joinedPagination">
				<div v-for="group in items" :key="group.id" class="_card">
					<div class="_title">{{ group.name }}</div>
					<div class="_content"><MkAvatars :user-ids="group.userIds"/></div>
					<div class="_footer">
						<MkButton danger @click="leave(group)">{{ i18n.ts.leaveGroup }}</MkButton>
					</div>
				</div>
			</MkPagination>
		</div>
		<div v-else-if="tab === 'invites'" class="_content">
			<MkPagination v-slot="{items}" :ref="invitationComponent" :pagination="invitationPagination">
				<div v-for="invitation in items" :key="invitation.id" class="_card">
					<div class="_title">{{ invitation.group.name }}</div>
					<div class="_content"><MkAvatars :user-ids="invitation.group.userIds"/></div>
					<div class="_footer">
						<MkButton primary inline @click="acceptInvite(invitation)"><i class="ti ti-check"></i> {{ i18n.ts.accept }}</MkButton>
						<MkButton primary inline @click="rejectInvite(invitation)"><i class="ti ti-ban"></i> {{ i18n.ts.reject }}</MkButton>
					</div>
				</div>
			</MkPagination>
		</div>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { } from 'vue';
import MkPagination from '@/components/MkPagination.vue';
import MkButton from '@/components/MkButton.vue';
import MkContainer from '@/components/MkContainer.vue';
import MkAvatars from '@/components/MkAvatars.vue';
import MkTab from '@/components/MkTab.vue';
import * as os from '@/os';
import { i18n } from '@/i18n';
import { definePageMetadata } from '@/scripts/page-metadata';
import { useRouter } from '@/router';

const router = useRouter();

let tab = $ref('owned');

const ownedComponent = $shallowRef<InstanceType<typeof MkPagination>>();
const joinedComponent = $shallowRef<InstanceType<typeof MkPagination>>();
const invitationComponent = $shallowRef<InstanceType<typeof MkPagination>>();

const ownedPagination = {
	endpoint: 'users/groups/owned' as const,
	limit: 10,
};
const joinedPagination = {
	endpoint: 'users/groups/joined' as const,
	limit: 10,
};
const invitationPagination = {
	endpoint: 'i/user-group-invites' as const,
	limit: 10,
};

async function create() {
	const { canceled, result: name } = await os.inputText({
		title: i18n.ts.groupName,
	});
	if (canceled) return;
	os.api('users/groups/create', { name: name }).then(created => {
		os.success();
		router.push(`/my/groups/${created.id}`);
	});
}

function acceptInvite(invitation) {
	os.api('users/groups/invitations/accept', {
		invitationId: invitation.id
	}).then(() => {
		os.success();
		invitationComponent.reload();
		joinedComponent.reload();
	});
}

function rejectInvite(invitation) {
	os.api('users/groups/invitations/reject', {
		invitationId: invitation.id
	}).then(() => {
		invitationComponent.reload();
	});
}

async function leave(group) {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: `${i18n.ts.deleteConfirm} (${group.name})`,
	});
	if (canceled) return;
	await os.apiWithDialog('users/groups/leave', {
		groupId: group.id,
	});
	joinedComponent.reload();
}

const headerActions = $computed(() => []);

const headerTabs = $computed(() => [{
	key: 'owned',
	title: i18n.ts.ownedGroups,
	icon: 'ti ti-user-cog',
}, {
	key: 'joined',
	title: i18n.ts.joinedGroups,
	icon: 'ti ti-users',
}, {
	key: 'invites',
	title: i18n.ts.invites,
	icon: 'ti ti-inbox',
}]);

definePageMetadata({
	title: i18n.ts.groups,
	icon: 'ti ti-users-group',
	action: {
		icon: 'ti ti-plus',
		handler: create,
	},
});

</script>

<style lang="scss" scoped>
._content {
	> .add {
		margin: 0 auto var(--margin) auto;
	}

	> .lists {
		> .list {
			display: block;
			padding: 16px;
			border: solid 1px var(--divider);
			border-radius: 6px;

			&:hover {
				border: solid 1px var(--accent);
				text-decoration: none;
			}

			> .name {
				margin-bottom: 4px;
			}
		}
	}
}
</style>
