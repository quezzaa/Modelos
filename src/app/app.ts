import { Component, signal } from '@angular/core';
import { SideBar } from './Bars/side-bar/side-bar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SideBar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Modelos');
}
