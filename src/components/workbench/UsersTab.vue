<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { UserEntry, UserSaveInput } from '../../types/axecoder'
import UserFormDialog from './UserFormDialog.vue'

const emit = defineEmits<{
  changed: []
}>()

const users = ref<UserEntry[]>([])
const search = ref('')
const formVisible = ref(false)
const editing = ref<UserEntry | null>(null)
const formRef = ref<InstanceType<typeof UserFormDialog> | null>(null)
const avatarUrls = ref<Record<string, string>>({})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter(
    (u) =>
      u.displayName.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.expertise.toLowerCase().includes(q),
  )
})

const loadAvatars = async (list: UserEntry[]) => {
  const next: Record<string, string> = { ...avatarUrls.value }
  for (const u of list) {
    if (!u.avatarPath) {
      delete next[u.id]
      continue
    }
    const res = await window.axecoder.getUserAvatarDataUrl(u.avatarPath)
    if (res.ok && res.dataUrl) next[u.id] = res.dataUrl
  }
  avatarUrls.value = next
}

const reload = async () => {
  const data = await window.axecoder.listUsers()
  users.value = data.users
  await loadAvatars(data.users)
}

onMounted(() => {
  void reload()
})

const openAdd = () => {
  editing.value = null
  formVisible.value = true
}

const openEdit = (u: UserEntry) => {
  editing.value = u
  formVisible.value = true
}

const onSaved = async (payload: { entry: UserEntry }) => {
  const input: UserSaveInput = {
    id: payload.entry.id,
    displayName: payload.entry.displayName,
    role: payload.entry.role,
    expertise: payload.entry.expertise,
    avatarPath: payload.entry.avatarPath,
    skillSlugs: payload.entry.skillSlugs,
  }
  const res = await window.axecoder.saveUser(input)
  if (!res.ok) {
    alert(res.error)
    return
  }
  await reload()
  emit('changed')
}

const onPickAvatar = async (userId: string) => {
  const res = await window.axecoder.pickUserAvatar(userId)
  if (!res.ok) {
    alert(res.error)
    return
  }
  if (res.cancelled) return
  formRef.value?.setAvatarPreview(res.avatarPath, res.dataUrl)
}

const onDelete = async (u: UserEntry) => {
  if (u.isBuiltin) return
  if (!confirm(`Delete user "${u.displayName}"?`)) return
  const res = await window.axecoder.deleteUser(u.id)
  if (!res.ok) {
    alert(res.error)
    return
  }
  await reload()
  emit('changed')
}

const avatarFallback = (u: UserEntry) => (u.displayName.trim() ? u.displayName.trim().slice(0, 1) : '?')

defineExpose({ reload })
</script>

<template>
  <div class="users-tab">
    <h2>Users</h2>
    <p class="desc">Manage collaborator profiles stored in ~/.axecoder/users.json</p>
    <div class="toolbar">
      <input v-model="search" type="search" class="search" placeholder="Search users…" />
      <button type="button" class="add-btn" @click="openAdd">Add user</button>
    </div>
    <ul v-if="filtered.length" class="user-list">
      <li v-for="u in filtered" :key="u.id" class="user-row">
        <div class="user-avatar">
          <img v-if="avatarUrls[u.id]" :src="avatarUrls[u.id]" alt="" />
          <span v-else>{{ avatarFallback(u) }}</span>
        </div>
        <div class="user-info">
          <span class="user-name">
            {{ u.displayName }}
            <span v-if="u.isBuiltin" class="badge">Built-in</span>
          </span>
          <span class="user-meta">{{ u.role }}</span>
          <span v-if="u.expertise" class="user-expertise">{{ u.expertise }}</span>
        </div>
        <div class="user-actions">
          <button type="button" class="link" @click="openEdit(u)">Edit</button>
          <button
            v-if="!u.isBuiltin"
            type="button"
            class="link danger"
            @click="onDelete(u)"
          >
            Delete
          </button>
        </div>
      </li>
    </ul>
    <p v-else class="empty">No users yet</p>
    <UserFormDialog
      ref="formRef"
      :visible="formVisible"
      :editing="editing"
      @close="formVisible = false"
      @save="onSaved"
      @pick-avatar="onPickAvatar"
    />
  </div>
</template>

<style scoped>
.users-tab {
  box-sizing: border-box;
  width: 100%;
  padding: 24px 32px;
}

h2 {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
}

.desc {
  margin: 0 0 20px;
  font-size: 13px;
  color: var(--wc-text-dim);
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.search {
  flex: 1;
  padding: 8px 12px;
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--wc-text);
}

.add-btn {
  padding: 8px 16px;
  font-size: 13px;
  border-radius: 6px;
  background: var(--wc-accent);
  color: #fff;
  flex-shrink: 0;
}

.user-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid var(--wc-border);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--wc-text-muted);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--wc-input-bg);
  color: var(--wc-text-dim);
  font-weight: 400;
}

.user-meta {
  display: block;
  font-size: 12px;
  color: var(--wc-text-dim);
  margin-top: 2px;
}

.user-expertise {
  display: block;
  font-size: 12px;
  color: var(--wc-text-muted);
  margin-top: 4px;
}

.user-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.link {
  font-size: 12px;
  color: var(--wc-text-muted);
  background: none;
  padding: 0;
}

.link:hover {
  color: var(--wc-text);
}

.link.danger:hover {
  color: #f48771;
}

.empty {
  color: var(--wc-text-dim);
  font-size: 13px;
  margin-top: 24px;
}
</style>
