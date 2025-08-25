/**
 * Sample clue data for testing crossword components
 */

export interface TestClue {
  start_index: [number, number];
  direction: 'horizontal' | 'vertical';
  length: number;
  clue: string;
}

export const SAMPLE_CLUES: TestClue[] = [
  {
    start_index: [0, 0],
    direction: 'horizontal',
    length: 3,
    clue: 'Feline pet'
  },
  {
    start_index: [0, 0],
    direction: 'vertical',
    length: 3,
    clue: 'Programming term'
  },
  {
    start_index: [1, 0],
    direction: 'horizontal',
    length: 2,
    clue: 'Preposition'
  },
  {
    start_index: [0, 1],
    direction: 'vertical',
    length: 2,
    clue: 'Article'
  }
];

export const HORIZONTAL_CLUES: TestClue[] = [
  {
    start_index: [0, 0],
    direction: 'horizontal',
    length: 5,
    clue: '1 Across: Computer programmer'
  },
  {
    start_index: [1, 0],
    direction: 'horizontal',
    length: 3,
    clue: '3 Across: Feline'
  },
  {
    start_index: [2, 1],
    direction: 'horizontal',
    length: 4,
    clue: '5 Across: Past tense of eat'
  }
];

export const VERTICAL_CLUES: TestClue[] = [
  {
    start_index: [0, 0],
    direction: 'vertical',
    length: 3,
    clue: '1 Down: Frozen water'
  },
  {
    start_index: [0, 2],
    direction: 'vertical',
    length: 4,
    clue: '2 Down: Large feline'
  },
  {
    start_index: [1, 4],
    direction: 'vertical',
    length: 2,
    clue: '4 Down: Preposition'
  }
];

export const MIXED_CLUES: TestClue[] = [
  ...HORIZONTAL_CLUES,
  ...VERTICAL_CLUES
];

export const EMPTY_CLUE: TestClue = {
  start_index: [0, 0],
  direction: 'horizontal',
  length: 3,
  clue: ''
};

export const LONG_CLUE: TestClue = {
  start_index: [2, 1],
  direction: 'vertical',
  length: 7,
  clue: 'This is a very long clue that tests how the component handles clues with lots of text content'
};

export const SPECIAL_CHARACTERS_CLUE: TestClue = {
  start_index: [1, 2],
  direction: 'horizontal',
  length: 4,
  clue: 'Clue with "quotes" & symbols!'
};

/**
 * Clue test cases for different scenarios
 */
export interface ClueTestCase {
  name: string;
  clues: TestClue[];
  description: string;
}

export const CLUE_TEST_CASES: ClueTestCase[] = [
  {
    name: 'Empty clues list',
    clues: [],
    description: 'Testing behavior with no clues'
  },
  {
    name: 'Single horizontal clue',
    clues: [HORIZONTAL_CLUES[0]],
    description: 'Testing with one horizontal clue'
  },
  {
    name: 'Single vertical clue',
    clues: [VERTICAL_CLUES[0]],
    description: 'Testing with one vertical clue'
  },
  {
    name: 'Multiple horizontal clues',
    clues: HORIZONTAL_CLUES,
    description: 'Testing with multiple horizontal clues'
  },
  {
    name: 'Multiple vertical clues',
    clues: VERTICAL_CLUES,
    description: 'Testing with multiple vertical clues'
  },
  {
    name: 'Mixed direction clues',
    clues: MIXED_CLUES,
    description: 'Testing with both horizontal and vertical clues'
  },
  {
    name: 'Clue with empty text',
    clues: [EMPTY_CLUE],
    description: 'Testing behavior with empty clue text'
  },
  {
    name: 'Very long clue',
    clues: [LONG_CLUE],
    description: 'Testing UI behavior with very long clue text'
  },
  {
    name: 'Clue with special characters',
    clues: [SPECIAL_CHARACTERS_CLUE],
    description: 'Testing clues containing quotes and special characters'
  }
];

/**
 * Helper function to create a clue with specific parameters
 */
export function createTestClue(
  row: number,
  col: number,
  direction: 'horizontal' | 'vertical',
  length: number,
  clueText: string = 'Test clue'
): TestClue {
  return {
    start_index: [row, col],
    direction,
    length,
    clue: clueText
  };
}

/**
 * Helper function to create multiple clues for a grid
 */
export function createCluesForGrid(gridSize: number): TestClue[] {
  const clues: TestClue[] = [];
  
  // Add horizontal clues for each row
  for (let row = 0; row < gridSize; row++) {
    clues.push(createTestClue(row, 0, 'horizontal', gridSize, `Row ${row + 1} clue`));
  }
  
  // Add vertical clues for each column
  for (let col = 0; col < gridSize; col++) {
    clues.push(createTestClue(0, col, 'vertical', gridSize, `Column ${col + 1} clue`));
  }
  
  return clues;
}
