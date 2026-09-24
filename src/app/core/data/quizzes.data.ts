import { GameMeta } from './games.data';

export type QuizMeta = Omit<GameMeta, 'category'>;

export const QUIZZES: QuizMeta[] = [
  {
    id: 'pattern-sense',
    title: 'Pattern Sense',
    description: 'Read a real problem with the title hidden — name the technique it calls for. Build the recognition reflex that is half of every interview.',
    algorithmNote: 'Every problem on this site becomes a quiz round: spot the cues (sorted input? contiguous run? hierarchy?) and pick the right tool.',
    algorithms: ['Recognition', 'All techniques'],
    status: 'available',
    route: '/quiz/pattern-sense',
  },
  {
    id: 'big-o',
    title: 'Big-O Trainer',
    description: 'Read a real code snippet pulled straight from your own cse-progress solutions and name both the time and space complexity. Filter by difficulty, or drill only the problems on your complexity-miss ledger.',
    algorithmNote: 'Deals up to 20 problems per run from your live solution history — never a paraphrase. The reveal names both bounds, with your own written reasoning where it exists.',
    algorithms: ['All complexities', 'Time & Space'],
    status: 'available',
    route: '/quiz/big-o',
  },
];
