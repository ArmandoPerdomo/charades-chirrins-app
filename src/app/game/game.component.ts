import {Component, HostListener, OnInit} from '@angular/core';
import {CommonModule} from "@angular/common";
import {WordsService} from "../words.service";
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {v4 as uuidv4} from 'uuid';
import {map, Observable, takeWhile, timer} from "rxjs";
import {shuffle} from "../array.utils";

type Couple = { id: string; name: string, score: number; };

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.sass'],
  standalone: true,
  providers: [WordsService],
  imports: [CommonModule, FormsModule, ReactiveFormsModule]
})
export class GameComponent implements OnInit {
  /**
   * Couples pending to participate
   * */
  startingCouples: Couple[] = [];
  /**
   * Couples who participating in the game
   * */
  endingCouples: Couple[] = [];
  selectedCategory: string = '';
  words: string[] = [];
  currentCouple!: Couple | null;
  REMAINING_TIME_IN_SECONDS: number = 60;
  timer$!: Observable<number>;
  winner!: Couple | null;
  isCouplePlaying: boolean = false;
  roundEnded: boolean = false;
  gameStarted: boolean = false;
  form!: FormGroup;
  timerRunning: boolean = false;
  hasSelectedCategory: boolean = false;
  hasATie: boolean = false;
  categories: string[] = [];

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.isCouplePlaying) {
      return;
    }
    // Verificar qué tecla se presionó y ejecutar la acción correspondiente
    switch (event.key) {
      case 'c':
        this.correctWord();
        break;
      case 's':
        this.passWord();
        break;
      // Puedes agregar más casos según sea necesario
    }
  }

  constructor(
    private wordsService: WordsService,
    private formBuilder: FormBuilder
  ) {
  }

  ngOnInit(): void {
    this.categories = this.wordsService.getCategories();
    this.form = this.formBuilder.group({
      coupleName: ['']
    })
  }

  addCouple(): void {
    this.startingCouples.push({
      id: uuidv4(),
      name: this.form.get('coupleName')?.value,
      score: 0,
    });
    this.form.reset();
  }

  startGame() {
    if (this.startingCouples.length <= 1) {
      alert('Number of couples must be greater than 1');
    }
    // Load couples from input
    shuffle(this.startingCouples);
    this.gameStarted = true;
  }

  loadWords() {
    this.hasSelectedCategory = true;
    this.words = this.wordsService.getWords(this.selectedCategory);
    this.nextCouple();
  }

  startRound() {
    // Load words for the selected category (you should have a service for this)
    // For simplicity, let's assume you have a service named WordService
    this.isCouplePlaying = true;
    this.startTimer();
  }

  endRound() {
    this.timerRunning = false;
    this.isCouplePlaying = false;
    this.endingCouples.push(<Couple>this.currentCouple);
  }

  startTimer() {
    this.timerRunning = true;
    this.timer$ = timer(0, 1000).pipe(
      map(n => (this.REMAINING_TIME_IN_SECONDS - n) * 1000),
      takeWhile(n => n >= 0),
      takeWhile(() => this.timerRunning),
    );

    this.timer$.subscribe(n => {
      if (n === 0) {
        this.endRound();
        if (this.startingCouples.length === 0) {
          this.endGame();
        } else {
          this.nextCouple();
        }
      }
    });
  }

  correctWord() {
    // Update scores for the current couple
    (this.currentCouple as Couple).score++;
    this.dropWord();
  }

  passWord() {
    this.dropWord();
  }

  private dropWord() {
    if (this.words.length === 1) {
      this.words = this.wordsService.getWords(this.selectedCategory);
      return;
    }
    this.words.shift();
  }

  private nextCouple() {
    this.currentCouple = this.startingCouples.shift() as Couple;
    console.log(this.startingCouples.length)
    this.dropWord();
  }

  private endGame() {
    // Calculate the winner and display scores
    this.roundEnded = true;
    let maxScore = 0;
    for (const couple of this.endingCouples) {
      if (couple.score > maxScore) {
        maxScore = couple.score;
        this.winner = couple;
      }
    }

    const tie = this.endingCouples.some(couple => couple.score === maxScore && couple !== this.winner);
    if (tie) {
      this.winner = null;
      this.hasATie = true;
    }

    this.isCouplePlaying = false;
    this.endingCouples.sort((a, b) => b.score - a.score);
  }

  reset() {
    this.startingCouples = [];
  }

  restartGame() {
    this.startingCouples = [];
    this.endingCouples = [];
    this.currentCouple = null;
    this.gameStarted = false;
    this.isCouplePlaying = false;
    this.hasSelectedCategory = false;
    this.selectedCategory = '';
    this.roundEnded = false;
    this.winner = null;
  }
}
