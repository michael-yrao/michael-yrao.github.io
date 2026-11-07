/** Wire contract of the `/yao` story routes. Mirrored byte for byte between the worker and src/app/features/yao/yao-contract.ts. */
export interface YaoChapter { heading: string; paragraphs: string[] }
export interface YaoStory { title: string; chapters: YaoChapter[] }
export interface YaoView { at: string; city: string; country: string; device: string }
export interface YaoViewsResponse { views: YaoView[] }
