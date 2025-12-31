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
  REMAINING_TIME_IN_SECONDS: number = 5;
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
  isPaused: boolean = false;
  pausedTimeRemaining: number = 0;

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
    const coupleName = this.form.get('coupleName')?.value?.trim();
    if (coupleName) {
      this.startingCouples.push({
        id: uuidv4(),
        name: coupleName,
        score: 0,
      });
      this.form.reset();
    }
  }

  editCouple(couple: Couple): void {
    const newName = prompt('Editar nombre de la pareja:', couple.name);
    if (newName && newName.trim()) {
      couple.name = newName.trim();
    }
  }

  deleteCouple(coupleId: string): void {
    this.startingCouples = this.startingCouples.filter(c => c.id !== coupleId);
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
    this.wordsService.getWords(this.selectedCategory).subscribe(words => {
      this.words = words;
      this.nextCouple();
    });
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
    const startTime = this.isPaused ? this.pausedTimeRemaining / 1000 : this.REMAINING_TIME_IN_SECONDS;
    this.timerRunning = true;
    this.isPaused = false;
    this.timer$ = timer(0, 1000).pipe(
      map(n => (startTime - n) * 1000),
      takeWhile(n => n >= 0),
      takeWhile(() => this.timerRunning),
    );

    this.timer$.subscribe(n => {
      this.pausedTimeRemaining = n;
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

  pauseGame() {
    if (this.isCouplePlaying && this.timerRunning) {
      this.isPaused = true;
      this.timerRunning = false;
    }
  }

  resumeGame() {
    if (this.isCouplePlaying && this.isPaused) {
      this.startTimer();
    }
  }

  resetGame() {
    const confirmed = confirm('¿Estás seguro de que deseas reiniciar el juego? Se perderán todos los puntajes actuales.');
    if (confirmed) {
      this.timerRunning = false;
      this.isPaused = false;
      this.pausedTimeRemaining = 0;
      this.restartGame();
    }
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
      this.wordsService.getWords(this.selectedCategory).subscribe(words => {
        this.words = words;
      });
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
    
    // Reproducir sonido de celebración
    if (this.winner) {
      this.playCelebrationSound();
    }
  }

  private playCelebrationSound(): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioContext.currentTime;

      // Crear secuencia de notas festivas
      const notes = [
        { freq: 523.25, time: 0, duration: 0.15 },    // C5
        { freq: 659.25, time: 0.15, duration: 0.15 }, // E5
        { freq: 783.99, time: 0.3, duration: 0.15 },  // G5
        { freq: 1046.50, time: 0.5, duration: 0.3 },  // C6
      ];

      notes.forEach(note => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = note.freq;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, now + note.time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + note.time + note.duration);

        oscillator.start(now + note.time);
        oscillator.stop(now + note.time + note.duration);
      });

      // Agregar efecto de fuegos artificiales (sonido percusivo)
      setTimeout(() => {
        this.playFireworkSound(audioContext);
      }, 800);

    } catch (error) {
      console.log('Audio no disponible:', error);
    }
  }

  private playFireworkSound(audioContext: AudioContext): void {
    const now = audioContext.currentTime;
    
    // Crear sonido de explosión
    for (let i = 0; i < 3; i++) {
      const noise = audioContext.createBufferSource();
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let j = 0; j < buffer.length; j++) {
        data[j] = Math.random() * 2 - 1;
      }
      
      noise.buffer = buffer;
      
      const noiseGain = audioContext.createGain();
      noise.connect(noiseGain);
      noiseGain.connect(audioContext.destination);
      
      const startTime = now + (i * 0.3);
      noiseGain.gain.setValueAtTime(0.2, startTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
      
      noise.start(startTime);
      noise.stop(startTime + 0.1);
    }
  }

  reset() {
    this.startingCouples = [];
  }

  restartGame() {
    // Recuperar las parejas de endingCouples y reiniciar sus puntajes
    this.startingCouples = this.endingCouples.map(couple => ({
      ...couple,
      score: 0
    }));
    
    this.endingCouples = [];
    this.currentCouple = null;
    this.gameStarted = false;
    this.isCouplePlaying = false;
    this.hasSelectedCategory = false;
    this.selectedCategory = '';
    this.roundEnded = false;
    this.winner = null;
    this.hasATie = false;
  }
}
