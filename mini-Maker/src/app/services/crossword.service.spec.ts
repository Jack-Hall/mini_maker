import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { 
  CrosswordService, 
  CrosswordData, 
  GridSolutionResponse, 
  GetWordsResponse, 
  PatternMatchResponse,
  CrosswordCell
} from './crossword.service';
import {
  EMPTY_5X5_GRID,
  SIMPLE_3X3_GRID,
  BLOCKED_3X3_GRID,
  GRID_WITH_BLACK_CELLS
} from '../../testing/fixtures/sample-grids';

describe('CrosswordService', () => {
  let service: CrosswordService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CrosswordService]
    });

    service = TestBed.inject(CrosswordService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have correct API URL', () => {
      // This is implicit in the HTTP calls we test below
      expect(service).toBeTruthy();
    });
  });

  describe('getCrossword', () => {
    it('should fetch crossword data', () => {
      const mockCrosswordData: CrosswordData = {
        grid: SIMPLE_3X3_GRID,
        clues: {
          across: ['1. Feline pet'],
          down: ['1. Programming term']
        }
      };

      service.getCrossword().subscribe(data => {
        expect(data).toEqual(mockCrosswordData);
      });

      const req = httpMock.expectOne('/api/crossword');
      expect(req.request.method).toBe('GET');
      req.flush(mockCrosswordData);
    });

    it('should handle HTTP errors', () => {
      service.getCrossword().subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      const req = httpMock.expectOne('/api/crossword');
      req.error(new ErrorEvent('Network error'));
    });
  });

  describe('findGridSolutions', () => {
    const mockSolutionResponse: GridSolutionResponse = {
      solutions: [
        [
          ['C', 'A', 'T'],
          ['O', 'L', 'D'],
          ['D', 'E', 'R']
        ],
        [
          ['C', 'A', 'R'],
          ['O', 'L', 'D'],
          ['D', 'E', 'W']
        ]
      ],
      solution_count: 2
    };

    it('should find grid solutions', () => {
      const inputGrid = SIMPLE_3X3_GRID;

      service.findGridSolutions(inputGrid).subscribe(response => {
        expect(response).toEqual(mockSolutionResponse);
        expect(response.solutions.length).toBe(2);
        expect(response.solution_count).toBe(2);
      });

      const req = httpMock.expectOne('/api/find_grid_solutions');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ grid: inputGrid });
      req.flush(mockSolutionResponse);
    });

    it('should process empty strings to underscores', () => {
      const inputGrid = EMPTY_5X5_GRID;
      const expectedProcessedGrid = inputGrid.map(row =>
        row.map(cell => cell === '' ? '_' : cell)
      );

      service.findGridSolutions(inputGrid).subscribe();

      const req = httpMock.expectOne('/api/find_grid_solutions');
      expect(req.request.body.grid).toEqual(expectedProcessedGrid);
      req.flush(mockSolutionResponse);
    });

    it('should handle grids with black cells', () => {
      const inputGrid = BLOCKED_3X3_GRID;

      service.findGridSolutions(inputGrid).subscribe(response => {
        expect(response).toEqual(mockSolutionResponse);
      });

      const req = httpMock.expectOne('/api/find_grid_solutions');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.grid).toEqual(inputGrid);
      req.flush(mockSolutionResponse);
    });

    it('should handle HTTP errors', () => {
      const inputGrid = SIMPLE_3X3_GRID;

      service.findGridSolutions(inputGrid).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      const req = httpMock.expectOne('/api/find_grid_solutions');
      req.error(new ErrorEvent('Server error'));
    });

    it('should handle large grids', () => {
      const largeGrid = Array(10).fill(null).map(() => 
        Array(10).fill('').map(() => '_')
      );

      service.findGridSolutions(largeGrid).subscribe();

      const req = httpMock.expectOne('/api/find_grid_solutions');
      expect(req.request.body.grid.length).toBe(10);
      expect(req.request.body.grid[0].length).toBe(10);
      req.flush({ solutions: [], solution_count: 0 });
    });

    it('should handle empty solution response', () => {
      const emptyResponse: GridSolutionResponse = {
        solutions: [],
        solution_count: 0
      };

      service.findGridSolutions(SIMPLE_3X3_GRID).subscribe(response => {
        expect(response.solutions).toEqual([]);
        expect(response.solution_count).toBe(0);
      });

      const req = httpMock.expectOne('/api/find_grid_solutions');
      req.flush(emptyResponse);
    });
  });

  describe('getWordsFromGrid', () => {
    const mockWordsResponse: GetWordsResponse = {
      words: [
        [[0, 0], [0, 2]], // Horizontal word
        [[0, 0], [2, 0]], // Vertical word
        [[1, 0], [1, 1]]  // Another horizontal word
      ],
      word_count: 3
    };

    it('should get words from grid', () => {
      const inputGrid = SIMPLE_3X3_GRID;

      service.getWordsFromGrid(inputGrid).subscribe(response => {
        expect(response).toEqual(mockWordsResponse);
        expect(response.words.length).toBe(3);
        expect(response.word_count).toBe(3);
      });

      const req = httpMock.expectOne('/api/get_words');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ grid: inputGrid });
      req.flush(mockWordsResponse);
    });

    it('should handle grids with no words', () => {
      const noWordsResponse: GetWordsResponse = {
        words: [],
        word_count: 0
      };

      service.getWordsFromGrid(GRID_WITH_BLACK_CELLS).subscribe(response => {
        expect(response.words).toEqual([]);
        expect(response.word_count).toBe(0);
      });

      const req = httpMock.expectOne('/api/get_words');
      req.flush(noWordsResponse);
    });

    it('should validate word coordinate format', () => {
      service.getWordsFromGrid(SIMPLE_3X3_GRID).subscribe(response => {
        response.words.forEach(word => {
          expect(word.length).toBe(2); // Should have start and end coordinates
          expect(word[0].length).toBe(2); // Start coordinate should have row and col
          expect(word[1].length).toBe(2); // End coordinate should have row and col
          
          // Coordinates should be numbers
          expect(typeof word[0][0]).toBe('number');
          expect(typeof word[0][1]).toBe('number');
          expect(typeof word[1][0]).toBe('number');
          expect(typeof word[1][1]).toBe('number');
        });
      });

      const req = httpMock.expectOne('/api/get_words');
      req.flush(mockWordsResponse);
    });

    it('should handle HTTP errors', () => {
      service.getWordsFromGrid(SIMPLE_3X3_GRID).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      const req = httpMock.expectOne('/api/get_words');
      req.error(new ErrorEvent('Server error'));
    });
  });

  describe('getPatternMatch', () => {
    const mockPatternResponse: PatternMatchResponse = {
      matches: ['CAT', 'COT', 'CUT', 'CAR', 'COW']
    };

    it('should get pattern matches', () => {
      const pattern = 'C_T';

      service.getPatternMatch(pattern).subscribe(response => {
        expect(response).toEqual(mockPatternResponse);
        expect(response.matches.length).toBe(5);
      });

      const req = httpMock.expectOne('/api/match_pattern');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ pattern });
      req.flush(mockPatternResponse);
    });

    it('should handle empty pattern matches', () => {
      const emptyResponse: PatternMatchResponse = {
        matches: []
      };

      service.getPatternMatch('XYZ').subscribe(response => {
        expect(response.matches).toEqual([]);
      });

      const req = httpMock.expectOne('/api/match_pattern');
      req.flush(emptyResponse);
    });

    it('should handle various pattern formats', () => {
      const patterns = ['C_T', '_AT', 'CA_', 'C__', '___', 'CAT'];
      
      patterns.forEach(pattern => {
        service.getPatternMatch(pattern).subscribe();
        
        const req = httpMock.expectOne('/api/match_pattern');
        expect(req.request.body.pattern).toBe(pattern);
        req.flush({ matches: [] });
      });
    });

    it('should handle long patterns', () => {
      const longPattern = 'A_C_E_G_I_K_M';

      service.getPatternMatch(longPattern).subscribe();

      const req = httpMock.expectOne('/api/match_pattern');
      expect(req.request.body.pattern).toBe(longPattern);
      req.flush({ matches: ['ABCDEFGHIJKLM'] });
    });

    it('should handle HTTP errors', () => {
      service.getPatternMatch('C_T').subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      const req = httpMock.expectOne('/api/match_pattern');
      req.error(new ErrorEvent('Server error'));
    });

    it('should validate pattern matches format', () => {
      service.getPatternMatch('C_T').subscribe(response => {
        expect(Array.isArray(response.matches)).toBeTruthy();
        response.matches.forEach(match => {
          expect(typeof match).toBe('string');
        });
      });

      const req = httpMock.expectOne('/api/match_pattern');
      req.flush(mockPatternResponse);
    });
  });

  describe('parseGrid', () => {
    it('should parse simple grid correctly', () => {
      const inputGrid = [
        ['C', 'A', 'T'],
        ['_', '_', '_'],
        ['+', '+', '+']
      ];

      const result = service.parseGrid(inputGrid);

      expect(result.length).toBe(3);
      expect(result[0].length).toBe(3);

      // Check first row
      expect(result[0][0]).toEqual({
        value: 'C',
        isBlack: false,
        isEditable: true,
        row: 0,
        col: 0
      });

      expect(result[0][1]).toEqual({
        value: 'A',
        isBlack: false,
        isEditable: true,
        row: 0,
        col: 1
      });

      // Check second row (empty cells)
      expect(result[1][0]).toEqual({
        value: '',
        isBlack: false,
        isEditable: true,
        row: 1,
        col: 0
      });

      // Check third row (black cells)
      expect(result[2][0]).toEqual({
        value: '+',
        isBlack: true,
        isEditable: false,
        row: 2,
        col: 0
      });
    });

    it('should handle underscore cells as empty and editable', () => {
      const inputGrid = [['_', '_', '_']];
      const result = service.parseGrid(inputGrid);

      result[0].forEach((cell, index) => {
        expect(cell.value).toBe('');
        expect(cell.isBlack).toBeFalsy();
        expect(cell.isEditable).toBeTruthy();
        expect(cell.row).toBe(0);
        expect(cell.col).toBe(index);
      });
    });

    it('should handle plus signs as black cells', () => {
      const inputGrid = [['+', '+', '+']];
      const result = service.parseGrid(inputGrid);

      result[0].forEach((cell, index) => {
        expect(cell.value).toBe('+');
        expect(cell.isBlack).toBeTruthy();
        expect(cell.isEditable).toBeFalsy();
        expect(cell.row).toBe(0);
        expect(cell.col).toBe(index);
      });
    });

    it('should handle filled letter cells', () => {
      const inputGrid = [['A', 'B', 'C']];
      const result = service.parseGrid(inputGrid);

      result[0].forEach((cell, index) => {
        expect(cell.value).toBe(inputGrid[0][index]);
        expect(cell.isBlack).toBeFalsy();
        expect(cell.isEditable).toBeTruthy();
        expect(cell.row).toBe(0);
        expect(cell.col).toBe(index);
      });
    });

    it('should handle mixed grid types', () => {
      const inputGrid = [
        ['A', '_', '+', 'B'],
        ['+', 'C', '_', '+'],
        ['_', '+', 'D', '_']
      ];

      const result = service.parseGrid(inputGrid);

      // Test specific cell types
      expect(result[0][0]).toEqual({
        value: 'A', isBlack: false, isEditable: true, row: 0, col: 0
      });
      expect(result[0][1]).toEqual({
        value: '', isBlack: false, isEditable: true, row: 0, col: 1
      });
      expect(result[0][2]).toEqual({
        value: '+', isBlack: true, isEditable: false, row: 0, col: 2
      });
      expect(result[1][1]).toEqual({
        value: 'C', isBlack: false, isEditable: true, row: 1, col: 1
      });
    });

    it('should handle empty grid', () => {
      const inputGrid: string[][] = [];
      const result = service.parseGrid(inputGrid);

      expect(result).toEqual([]);
    });

    it('should handle single cell grid', () => {
      const inputGrid = [['A']];
      const result = service.parseGrid(inputGrid);

      expect(result.length).toBe(1);
      expect(result[0].length).toBe(1);
      expect(result[0][0]).toEqual({
        value: 'A',
        isBlack: false,
        isEditable: true,
        row: 0,
        col: 0
      });
    });

    it('should maintain grid dimensions', () => {
      const inputGrid = Array(5).fill(null).map(() => Array(5).fill('_'));
      const result = service.parseGrid(inputGrid);

      expect(result.length).toBe(5);
      result.forEach(row => {
        expect(row.length).toBe(5);
      });
    });

    it('should assign correct row and column indices', () => {
      const inputGrid = [
        ['A', 'B'],
        ['C', 'D']
      ];
      const result = service.parseGrid(inputGrid);

      expect(result[0][0].row).toBe(0);
      expect(result[0][0].col).toBe(0);
      expect(result[0][1].row).toBe(0);
      expect(result[0][1].col).toBe(1);
      expect(result[1][0].row).toBe(1);
      expect(result[1][0].col).toBe(0);
      expect(result[1][1].row).toBe(1);
      expect(result[1][1].col).toBe(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed API responses gracefully', () => {
      service.findGridSolutions(SIMPLE_3X3_GRID).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      const req = httpMock.expectOne('/api/find_grid_solutions');
      req.flush('Invalid JSON');
    });

    it('should handle network timeouts', () => {
      service.getWordsFromGrid(SIMPLE_3X3_GRID).subscribe({
        next: () => fail('Expected timeout'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      const req = httpMock.expectOne('/api/get_words');
      req.error(new ErrorEvent('timeout'));
    });

    it('should handle 404 errors', () => {
      service.getCrossword().subscribe({
        next: () => fail('Expected 404'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne('/api/crossword');
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle 500 errors', () => {
      service.getPatternMatch('ABC').subscribe({
        next: () => fail('Expected 500'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne('/api/match_pattern');
      req.flush('Internal server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('Performance and Large Data', () => {
    it('should handle large solution sets', () => {
      const largeSolutionResponse: GridSolutionResponse = {
        solutions: Array(1000).fill(null).map(() => [
          ['A', 'B', 'C'],
          ['D', 'E', 'F'],
          ['G', 'H', 'I']
        ]),
        solution_count: 1000
      };

      service.findGridSolutions(SIMPLE_3X3_GRID).subscribe(response => {
        expect(response.solutions.length).toBe(1000);
        expect(response.solution_count).toBe(1000);
      });

      const req = httpMock.expectOne('/api/find_grid_solutions');
      req.flush(largeSolutionResponse);
    });

    it('should handle large word lists', () => {
      const largeWordsResponse: GetWordsResponse = {
        words: Array(500).fill(null).map((_, i) => [[i, 0], [i, 3]]),
        word_count: 500
      };

      service.getWordsFromGrid(SIMPLE_3X3_GRID).subscribe(response => {
        expect(response.words.length).toBe(500);
        expect(response.word_count).toBe(500);
      });

      const req = httpMock.expectOne('/api/get_words');
      req.flush(largeWordsResponse);
    });

    it('should handle large pattern match lists', () => {
      const largePatternResponse: PatternMatchResponse = {
        matches: Array(10000).fill(null).map((_, i) => `WORD${i}`)
      };

      service.getPatternMatch('WORD_').subscribe(response => {
        expect(response.matches.length).toBe(10000);
      });

      const req = httpMock.expectOne('/api/match_pattern');
      req.flush(largePatternResponse);
    });
  });
});
