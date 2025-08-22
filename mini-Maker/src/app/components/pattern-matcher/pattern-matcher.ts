import { Component, Input, Output, EventEmitter, signal, inject, effect, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrosswordService, PatternMatchResponse } from '../../services/crossword.service';

@Component({
  selector: 'app-pattern-matcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pattern-matcher.html',
  styleUrl: './pattern-matcher.css'
})
export class PatternMatcherComponent implements OnChanges {
  private readonly crosswordService = inject(CrosswordService);

  @Input() pattern: string = '';
  @Input() isVisible: boolean = false;
  @Output() wordSelected = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  protected readonly patternMatches = signal<string[]>([]);
  protected readonly isLoadingPatterns = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    // React to changes in pattern or isVisible
    if (changes['pattern'] || changes['isVisible']) {
      console.log('Pattern changed:', this.pattern, 'Visible:', this.isVisible);
      
      if (this.isVisible && this.pattern && this.shouldLoadPattern(this.pattern)) {
        this.loadPatternMatches(this.pattern);
      } else {
        this.patternMatches.set([]);
      }
    }
  }

  protected onWordSelect(word: string): void {
    this.wordSelected.emit(word);
  }

  protected onClose(): void {
    this.closed.emit();
  }

  private shouldLoadPattern(pattern: string): boolean {
    if (!pattern || pattern.length < 2) {
      console.log('Pattern too short or empty:', pattern);
      return false;
    }
    
    const filledLetters = pattern.split('').filter(char => char !== '_').length;
    const missingLetters = pattern.split('').filter(char => char === '_').length;
    
    console.log(`Pattern: ${pattern}, Filled: ${filledLetters}, Missing: ${missingLetters}`);
    
    // Load if at least 1 letter is filled and 3 or fewer letters are missing
    const shouldLoad = filledLetters >= 1 && missingLetters <= 3 && missingLetters > 0;
    console.log('Should load pattern:', shouldLoad);
    return shouldLoad;
  }

  private loadPatternMatches(pattern: string): void {
    console.log('Loading pattern matches for:', pattern);
    this.isLoadingPatterns.set(true);
    
    this.crosswordService.getPatternMatch(pattern).subscribe({
      next: (response: PatternMatchResponse) => {
        console.log('Pattern match response:', response);
        this.patternMatches.set(response.matches);
        this.isLoadingPatterns.set(false);
      },
      error: (e) => {
        console.log("Error loading pattern matches:", e);
        this.patternMatches.set([]);
        this.isLoadingPatterns.set(false);
      }
    });
  }
}
