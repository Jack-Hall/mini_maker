import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CrosswordComponent } from './components/crossword/crossword.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CrosswordComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('mini-Maker');
}
