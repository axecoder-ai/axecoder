export type SessionKind = 'agent' | 'workshop'

export type SessionRegistryEntry = {
  id: string
  title: string
  updatedAt: number
  kind: SessionKind
}
