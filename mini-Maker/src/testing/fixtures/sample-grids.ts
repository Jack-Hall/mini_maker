/**
 * Sample grid data for testing crossword components
 */

export const EMPTY_3X3_GRID: string[][] = [
  ['', '', ''],
  ['', '', ''],
  ['', '', '']
];

export const EMPTY_5X5_GRID: string[][] = [
  ['', '', '', '', ''],
  ['', '', '', '', ''],
  ['', '', '', '', ''],
  ['', '', '', '', ''],
  ['', '', '', '', '']
];

export const SIMPLE_3X3_GRID: string[][] = [
  ['C', 'A', 'T'],
  ['O', '', ''],
  ['D', '', '']
];

export const BLOCKED_3X3_GRID: string[][] = [
  ['C', 'A', 'T'],
  ['O', '#', 'E'],
  ['D', '', 'S']
];

export const COMPLEX_5X5_GRID: string[][] = [
  ['C', 'O', 'D', 'E', 'R'],
  ['A', '', '', '', ''],
  ['T', '', '#', '', ''],
  ['', '', '', '', ''],
  ['', '', '', '', '']
];

export const FULLY_FILLED_3X3_GRID: string[][] = [
  ['C', 'A', 'T'],
  ['O', 'L', 'D'],
  ['D', 'E', 'W']
];

export const GRID_WITH_BLACK_CELLS: string[][] = [
  ['C', 'A', 'T', '#', '#'],
  ['O', '', '', '#', '#'],
  ['D', '', '', '#', '#'],
  ['#', '#', '#', '#', '#'],
  ['#', '#', '#', '#', '#']
];

export const SYMMETRIC_GRID: string[][] = [
  ['', '', '#', '', ''],
  ['', '#', '', '#', ''],
  ['#', '', '', '', '#'],
  ['', '#', '', '#', ''],
  ['', '', '#', '', '']
];

export const PATTERN_TEST_GRID: string[][] = [
  ['C', '_', 'T'],
  ['_', 'A', '_'],
  ['D', '_', 'G']
];

export const SINGLE_WORD_HORIZONTAL: string[][] = [
  ['#', '#', '#', '#', '#'],
  ['#', 'C', 'A', 'T', '#'],
  ['#', '#', '#', '#', '#'],
  ['#', '#', '#', '#', '#'],
  ['#', '#', '#', '#', '#']
];

export const SINGLE_WORD_VERTICAL: string[][] = [
  ['#', '#', '#', '#', '#'],
  ['#', 'C', '#', '#', '#'],
  ['#', 'A', '#', '#', '#'],
  ['#', 'T', '#', '#', '#'],
  ['#', '#', '#', '#', '#']
];

export const INTERSECTING_WORDS: string[][] = [
  ['#', 'C', '#'],
  ['D', 'A', 'Y'],
  ['#', 'T', '#']
];

/**
 * Grid test cases with expected word detection results
 */
export interface GridTestCase {
  name: string;
  grid: string[][];
  expectedHorizontalWords: number;
  expectedVerticalWords: number;
  expectedTotalWords: number;
}

export const GRID_TEST_CASES: GridTestCase[] = [
  {
    name: 'Empty 3x3 grid',
    grid: EMPTY_3X3_GRID,
    expectedHorizontalWords: 3,
    expectedVerticalWords: 3,
    expectedTotalWords: 6
  },
  {
    name: 'Simple 3x3 grid with partial fill',
    grid: SIMPLE_3X3_GRID,
    expectedHorizontalWords: 1,
    expectedVerticalWords: 1,
    expectedTotalWords: 2
  },
  {
    name: 'Blocked 3x3 grid',
    grid: BLOCKED_3X3_GRID,
    expectedHorizontalWords: 1,
    expectedVerticalWords: 2,
    expectedTotalWords: 3
  },
  {
    name: 'Single horizontal word',
    grid: SINGLE_WORD_HORIZONTAL,
    expectedHorizontalWords: 1,
    expectedVerticalWords: 0,
    expectedTotalWords: 1
  },
  {
    name: 'Single vertical word',
    grid: SINGLE_WORD_VERTICAL,
    expectedHorizontalWords: 0,
    expectedVerticalWords: 1,
    expectedTotalWords: 1
  },
  {
    name: 'Intersecting words',
    grid: INTERSECTING_WORDS,
    expectedHorizontalWords: 1,
    expectedVerticalWords: 1,
    expectedTotalWords: 2
  }
];

/**
 * Grid states for testing navigation and input
 */
export const NAVIGATION_TEST_GRIDS = {
  // Grid with blocked cells for testing navigation around obstacles
  WITH_OBSTACLES: [
    ['', '', '#', '', ''],
    ['', '#', '', '#', ''],
    ['#', '', '', '', '#'],
    ['', '#', '', '#', ''],
    ['', '', '#', '', '']
  ],
  
  // Grid for testing edge navigation
  EDGE_TEST: [
    ['', '', ''],
    ['', '', ''],
    ['', '', '']
  ],
  
  // Grid with single editable cell
  SINGLE_CELL: [
    ['#', '#', '#'],
    ['#', '', '#'],
    ['#', '#', '#']
  ]
} as const;
