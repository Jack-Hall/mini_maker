# MiniMaker Test Suite

This document describes how to run the comprehensive test suite for the MiniMaker crossword application.

## Test Structure

```
src/testing/
├── test-utils/
│   ├── crossword-test-harness.ts    # Utilities for crossword component testing
│   └── mock-crossword.service.ts    # Mock service for testing
├── fixtures/
│   ├── sample-grids.ts              # Test grid data
│   └── sample-clues.ts              # Test clue data
├── integration/
│   └── crossword-workflow.integration.spec.ts  # End-to-end workflow tests
└── test-setup.ts                    # Global test configuration
```

## Running Tests

### All Tests
```bash
ng test
```

### Specific Component Tests
```bash
# Puzzle Creator Component
ng test --include="**/puzzle-creator.component.spec.ts"

# Puzzle Solver Component  
ng test --include="**/puzzle-solver.component.spec.ts"

# Crossword Service
ng test --include="**/crossword.service.spec.ts"

# Pattern Matcher Component
ng test --include="**/pattern-matcher.spec.ts"
```

### Integration Tests
```bash
ng test --include="**/integration/**/*.spec.ts"
```

### Test with Coverage
```bash
ng test --code-coverage
```

## Test Categories

### Unit Tests
- **PuzzleCreatorComponent**: 100+ test cases covering grid editing, word detection, clue management, pattern matching, and solution finding
- **PuzzleSolverComponent**: 80+ test cases covering puzzle loading, cell navigation, input handling, and clue interaction
- **CrosswordService**: 60+ test cases covering API calls, data parsing, error handling, and edge cases
- **PatternMatcherComponent**: 40+ test cases covering pattern validation, loading states, and event emission

### Integration Tests
- **Crossword Workflow**: End-to-end tests covering complete puzzle creation and solving workflows
- **Cross-Component Integration**: Tests for data consistency and component interaction
- **Performance Tests**: Tests for handling large grids and rapid user input
- **Error Recovery**: Tests for graceful error handling and recovery

## Test Utilities

### CrosswordTestHarness
Provides convenient methods for interacting with crossword components in tests:

```typescript
const harness = new CrosswordTestHarness(fixture);

// Grid interaction
harness.setCellValue(row, col, value);
harness.clickCell(row, col);
harness.rightClickCell(row, col);
harness.focusCell(row, col);

// Keyboard interaction
harness.sendKeyToCell(row, col, 'Enter');
harness.sendKeyToCell(row, col, 'ArrowRight');

// UI interaction
harness.clickButtonByText('Find Solutions');
harness.getGridState();
harness.isCellActive(row, col);
```

### MockCrosswordService
Configurable mock service for testing API interactions:

```typescript
mockService.setFailureMode('getWords', true);
mockService.setDelay('findSolutions', 1000);
mockService.reset();
```

## Test Data

### Sample Grids
- Empty grids (3x3, 5x5)
- Grids with words (simple, complex)
- Grids with black cells
- Edge case grids (single cell, obstacles)

### Sample Clues
- Horizontal and vertical clues
- Empty and long clues
- Clues with special characters
- Test cases for various scenarios

## Debugging Tests

### Run in Debug Mode
```bash
ng test --watch=false --browsers=Chrome --code-coverage=false
```

### View Test Results
- Open `coverage/index.html` for coverage report
- Use browser DevTools for debugging
- Check console for detailed error messages

## Test Guidelines

### Writing New Tests
1. Use descriptive test names
2. Follow AAA pattern (Arrange, Act, Assert)
3. Test both happy path and error cases
4. Use test harness for component interaction
5. Mock external dependencies

### Test Maintenance
1. Update tests when changing component behavior
2. Add tests for new features
3. Remove obsolete tests
4. Keep test data fixtures updated

## Coverage Goals

- **Components**: >90% line coverage
- **Services**: >95% line coverage
- **Integration**: Cover all major workflows
- **Error Handling**: Cover all error scenarios

## Performance Benchmarks

Tests should complete within these timeframes:
- Unit tests: <5 seconds per component
- Integration tests: <10 seconds per workflow
- Full test suite: <30 seconds

## Continuous Integration

Tests are configured to run automatically on:
- Pull requests
- Main branch commits
- Release builds

For any test failures, check:
1. Recent code changes
2. Mock service configuration
3. Test data dependencies
4. Timing issues in async tests
