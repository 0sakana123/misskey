<template>
<MkStickyContainer>
	<template #header><MkPageHeader :actions="headerActions" :tabs="headerTabs"/></template>
	<MkSpacer :content-max="700">
		<div class="mk-group-page">
			<Transition :name="$store.state.animation ? '_transition_zoom' : ''" mode="out-in">
				<div v-if="group" class="">
					<div class="">
						<MkButton inline @click="invite()">{{ i18n.ts.invite }}</MkButton>
						<MkButton inline @click="renameGroup()">{{ i18n.ts.rename }}</MkButton>
						<MkButton inline @click="transfer()">{{ i18n.ts.transfer }}</MkButton>
						<MkButton inline @click="deleteGroup()">{{ i18n.ts.delete }}</MkButton>
					</div>
				</div>
			</Transition>

			<Transition :name="$store.state.animation ? '_transition_zoom' : ''" mode="out-in">
				<div v-if="group" class="members _margin">
					<div class="">{{ i18n.ts.members }}</div>
					<div class="">
						<div class="users">
							<div v-for="user in users" :key="user.id" class="user _panel">
								<MkAvatar :user="user" class="avatar" indicator link preview/>
								<div class="body">
									<MkUserName :user="user" class="name"/>
									<MkAcct :user="user" class="acct"/>
								</div>
								<div class="action">
									<button class="_button" @click="removeUser(user)"><i class="ti ti-x"></i></button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</Transition>
		</div>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { computed, watch } from 'vue';
import MkButton from '@/components/MkButton.vue';
import * as os from '@/os';
import { mainRouter } from '@/router';
import { i18n } from '@/i18n';
import { definePageMetadata } from '@/scripts/page-metadata';

const props = defineProps<{
	groupId: string;
}>();

let group = $ref(null);
let users = $ref([]);

function fetch() {
	os.api('users/groups/show', {
		groupId: props.groupId
	}).then(_group => {
		group = _group;
		os.api('users/show', {
			userIds: group.userIds
		}).then(_users => {
			users = _users;
		});
	});
}

function invite() {
	os.selectUser().then(user => {
		os.apiWithDialog('users/groups/invite', {
			groupId: group.id,
			userId: user.id
		});
	});
}

function removeUser(user) {
	os.api('users/groups/pull', {
		groupId: group.id,
		userId: user.id
	}).then(() => {
		users = users.filter(x => x.id !== user.id);
	});
}

async function renameGroup() {
	const { canceled, result: name } = await os.inputText({
		title: i18n.ts.groupName,
		default: group.name
	});
	if (canceled) return;

	await os.api('users/groups/update', {
		groupId: group.id,
		name: name
	});

	group.name = name;
}

function transfer() {
	os.selectUser().then(user => {
		os.apiWithDialog('users/groups/transfer', {
			groupId: group.id,
			userId: user.id
		});
	});
}

async function deleteGroup() {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.t('removeAreYouSure', { x: group.name }),
	});
	if (canceled) return;

	await os.api('users/groups/delete', {
		groupId: group.id
	});
	os.success();
	mainRouter.push('/my/groups');
}

watch(() => props.groupId, fetch, { immediate: true });

const headerActions = $computed(() => []);

const headerTabs = $computed(() => []);

definePageMetadata(computed(() => group ? {
	title: group.name,
	icon: 'ti ti-users',
} : null));
</script>

<style lang="scss" scoped>
.mk-group-page {
	> .members {
		> ._content {
			> .users {
				> .user {
					display: flex;
					align-items: center;
					padding: 16px;

					> .avatar {
						width: 50px;
						height: 50px;
					}

					> .body {
						flex: 1;
						padding: 8px;

						> .name {
							display: block;
							font-weight: bold;
						}

						> .acct {
							opacity: 0.5;
						}
					}
				}
			}
		}
	}
}
</style>
