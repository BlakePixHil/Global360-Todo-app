import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressBar } from '@angular/material/progress-bar';
import { finalize } from 'rxjs';
import { Todo } from './todo';
import { TodoApi } from './todo-api';

export const TITLE_MAX_LENGTH = 200;

@Component({
  selector: 'app-todo-list',
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatCard,
    MatCardContent,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatLabel,
    MatProgressBar,
  ],
  templateUrl: './todo-list.html',
  styleUrl: './todo-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoList implements OnInit {
  private readonly api = inject(TodoApi);
  private readonly formDirective = viewChild.required(FormGroupDirective);

  protected readonly maxTitleLength = TITLE_MAX_LENGTH;
  protected readonly todos = signal<Todo[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(TITLE_MAX_LENGTH),
      ],
    }),
  });

  ngOnInit(): void {
    this.api
      .getAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (todos) => this.todos.set(todos),
        error: () => this.error.set('Could not load your todos. Please try again later.'),
      });
  }

  protected add(): void {
    if (this.form.invalid || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.api
      .create(this.form.controls.title.value.trim())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (todo) => {
          this.todos.update((todos) => [...todos, todo]);
          this.formDirective().resetForm();
          this.error.set(null);
        },
        error: () => this.error.set('Could not add your todo. Please try again.'),
      });
  }

  protected remove(todo: Todo): void {
    this.api.delete(todo.id).subscribe({
      next: () => {
        this.todos.update((todos) => todos.filter(({ id }) => id !== todo.id));
        this.error.set(null);
      },
      error: () => this.error.set(`Could not delete "${todo.title}". Please try again.`),
    });
  }
}
