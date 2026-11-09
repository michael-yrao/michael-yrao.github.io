/** Wire contract of the /diary routes. Mirrored in src/app/features/diary/diary-contract.ts. */
export interface DiaryEntry { id: string; date: string; title: string; body: string; updatedAt: string }
export interface DiaryEntryInput { date: string; title: string; body: string }
export interface DiaryUnlockResponse { visitId: string; entries: DiaryEntry[] }
export interface DiaryEntriesResponse { entries: DiaryEntry[] }
export interface DiarySaveResponse { entry: DiaryEntry }
export interface DiarySeenRequest { visitId: string; entryIds: string[] }
export interface DiaryView { at: string; city: string; country: string; device: string; read: string[] }
export interface DiaryViewsResponse { views: DiaryView[]; backupAt: string | null }
